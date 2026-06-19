# Elbow Room Massage Therapy

Static site for elbowroommassage.com. HTML/CSS/JS, no build step.

Pages: index, services, about, locations, book, community, brand-kit, intake (printable client form, linked from book).
Shared: css/elbowroom.css, js/elbowroom*.js, elbowroom/ partials, images/elbowroom/ assets.

Booking: Jane (shared platform with the chiro). The book page links out to Jane; replace the
href in book.html with the per-practitioner "Book Online" link from Jane Settings -> Branding ->
Book Online Buttons. Payment is handled at the appointment (Venmo / Cash App / card), not online.

NOTE: still set to noindex (preview). Before going public: confirm the Jane booking link, wire a
real inbox (hello@elbowroom.example placeholder), confirm the Stauffer public listing, then remove
the robots noindex and add sitemap.xml + robots.txt.

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
