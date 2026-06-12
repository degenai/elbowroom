/**
 * Elbow Room — inbound email forwarder.
 *
 * Email Routing sends mail for our custom address (e.g. hello@elbowroommassage.com)
 * to this Worker, and we fan it out to BOTH partners' personal inboxes. Cloudflare's
 * built-in routing rules can only forward an address to ONE destination; a Worker
 * can call message.forward() once per recipient — that's the whole reason this
 * file exists.
 *
 * The destination list lives in the FORWARD_TO secret (comma-separated), NOT in
 * this public repo — set it with:  npx wrangler secret put FORWARD_TO --config wrangler-email.jsonc
 * Every destination must be a VERIFIED Email Routing destination address on the
 * Cloudflare account (each inbox owner clicks a one-time confirmation email),
 * or forward() to it will fail.
 */
export default {
  async email(message, env, ctx) {
    const destinations = (env.FORWARD_TO || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (destinations.length === 0) {
      // Misconfiguration must bounce loudly, not silently eat mail.
      message.setReject('Recipient mailbox is not configured.');
      return;
    }

    // Forward to every destination; tolerate a single failure (e.g. one inbox's
    // verification lapsed) as long as at least one copy got through. If ALL
    // fail, throw — the sender gets a bounce instead of a silent black hole.
    const results = await Promise.allSettled(
      destinations.map((dest) => message.forward(dest))
    );
    const delivered = results.filter((r) => r.status === 'fulfilled').length;
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`forward to ${destinations[i]} failed:`, r.reason);
      }
    });
    if (delivered === 0) {
      throw new Error('All forwards failed — bouncing so the sender knows.');
    }
  },
};
