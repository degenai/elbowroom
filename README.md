# Elbow Room Massage Therapy

Static site for elbowroommassage.com. HTML/CSS/JS, no build step.

Pages: index, services, about, locations, book, community, brand-kit, intake (printable client form, linked from book).
Shared: css/elbowroom.css, js/elbowroom*.js, elbowroom/ partials, images/elbowroom/ assets.

Booking: Jane (shared platform with the chiro). Jane currently shows Alex's treatments and openings as
contact-only, so the public page links directly to the Massage Therapy availability and tells clients
to call the clinic to reserve. Replace that fallback with Alex's practitioner-specific self-booking URL
only after Jane displays the real $25/$45/$85 prices and a complete client booking flow.

Production is indexable. Keep booking copy on the contact-only fallback until Jane's public price and
self-booking contract is verified end to end; keep the shared clinic phone qualified until the distinct
Elbow Room line is provisioned and replaced everywhere in one coordinated pass.

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
