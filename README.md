# Elbow Room Massage Therapy

Static site for elbowroommassage.com. HTML/CSS/JS, no build step.

Pages: index, services, about, locations, book, community, brand-kit, intake (printable client form, linked from book).
Shared: css/elbowroom.css, js/elbowroom*.js, elbowroom/ partials, images/elbowroom/ assets.

Booking: Jane (shared platform with the chiro). The public booking page hands off to Alex's practitioner-specific
profile at `/locations/stauffer-chiropractic/book#/staff_member/3`. The verified flow exposes Alex's live weekend
openings, publishes the $25/$45/$85 core menu, holds the selected time, and reaches Jane's sign-in/create-account
confirmation gate without collecting payment. Jane's `$0.00` display means nothing is due online; clients pay the
published session price at the appointment.

Production is indexable. Keep the direct booking contract covered by `scripts/booking-truth.test.mjs`; keep the
shared clinic phone qualified as a human help fallback until the distinct Elbow Room line is provisioned and
replaced everywhere in one coordinated pass.

## Draft review notes Worker

`draft-review.html` is an unlisted/noindex working gallery for upcoming Instagram post drafts. Reviewer notes are handled by a separate Cloudflare Worker + D1 database so the static site stays static.

Files:
- `draft-review.html` — unlisted gallery page.
- `js/draft-notes.js` — browser UI that appends a reviewer-notes drawer to each post card.
- `workers/draft-notes*.mjs` — `/api/draft-notes` Worker API.
- `workers/schema-draft-notes.sql` — D1 schema.
- `wrangler-draft-notes.jsonc` — deploy config for the notes Worker.

Setup/deploy:

```bash
npx wrangler d1 create elbowroom-draft-notes
# paste the returned database_id into wrangler-draft-notes.jsonc
npx wrangler d1 execute elbowroom-draft-notes --remote --file=workers/schema-draft-notes.sql --config wrangler-draft-notes.jsonc
npx wrangler secret put DRAFT_REVIEW_SECRET --config wrangler-draft-notes.jsonc
npx wrangler deploy --config wrangler-draft-notes.jsonc
```

Local/API tests:

```bash
node --test workers/draft-notes-core.test.mjs
```

Notes are raw review input only; saving a note does not publish, edit, or reorder a post.
