/*
 * ELBOW ROOM — events + appearances.
 * Placeholder infrastructure: the arrays below ship empty, so the page renders a
 * calm "being scheduled" countdown state and a "photos coming soon" gallery until
 * real entries are dropped in. Adding one real event or appearance is a two-minute
 * edit — copy the commented example, fill it in, delete the leading //.
 *
 * Progressive enhancement only. Every DOM lookup is guarded; empty arrays never
 * throw and never start a timer, so a page with no events just sits on its
 * placeholder copy with a clean console.
 *
 * Loaded as a plain module (<script type="module"> on events.html). No anime.js
 * dependency: the shared elbowroom.js still handles the section scroll-reveals.
 */

/* Attribute/text-safe escaping (defensive; array values are author-controlled). */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

/* ============================================================================
 *  UPCOMING EVENTS
 *  The next firm-dated event auto-promotes into the featured live countdown;
 *  anything else lists beneath it. Past-dated entries drop off on their own.
 *  Leave the array empty for the "being scheduled" placeholder state.
 *
 *  SCHEMA — copy this block, uncomment it, fill it in:
 *    date:  a Date (the start time) OR null for a date-to-be-announced event.
 *           Use a UTC timestamp so the countdown is right in every timezone.
 *           Woodstock runs UTC-4 in summer, so 2:00 PM local == 18:00:00Z:
 *             new Date('2026-07-18T18:00:00Z')
 *           null still lists the event, it just does not run a countdown.
 *    name:  event name, e.g. 'Woodstock Farmers Market'
 *    venue: where, e.g. 'The Chambers at City Center'
 *    city:  'Woodstock, GA'
 *    blurb: one calm sentence about what we are doing there.
 *    link:  URL for details or RSVP, or null for none.
 * ========================================================================== */
const upcomingEvents = [
  // {
  //   date:  new Date('2026-07-18T18:00:00Z'),
  //   name:  'Woodstock Farmers Market',
  //   venue: 'The Chambers at City Center',
  //   city:  'Woodstock, GA',
  //   blurb: 'Chair massage on the green all morning. Come find the table.',
  //   link:  'book.html',
  // },
];

/* ============================================================================
 *  PAST APPEARANCES
 *  After an event, add it here so it shows in the gallery. Leave empty for the
 *  "photos coming soon" placeholder grid.
 *
 *  SCHEMA — copy this block, uncomment it, fill it in:
 *    date:  a Date OR a display string ('July 2026') for when it happened.
 *    name:  event name
 *    venue: where
 *    city:  'Woodstock, GA'
 *    blurb: one line on how it went.
 *    photo: path to an image (e.g. 'images/elbowroom/appearances/foo.jpg'),
 *           or null for a clean text tile.
 *    link:  URL, or null.
 * ========================================================================== */
const pastAppearances = [
  // {
  //   date:  new Date('2026-07-19T00:00:00Z'),
  //   name:  'Saturday in the Park',
  //   venue: 'Olde Rope Mill Park',
  //   city:  'Woodstock, GA',
  //   blurb: 'A full afternoon of chair work under the pavilion.',
  //   photo: 'images/elbowroom/appearances/saturday-park-2026.jpg',
  //   link:  null,
  // },
];

/* ---------- display helpers ---------- */
function whenText(ev) {
  if (isDate(ev.date)) {
    return ev.date.toLocaleString([], {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }
  return 'Date to be announced';
}

function shortWhen(ev) {
  if (isDate(ev.date)) {
    return ev.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return 'Date TBA';
}

function pastWhenText(ev) {
  if (isDate(ev.date)) {
    return ev.date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return ev.date ? String(ev.date) : '';
}

function whereText(ev) {
  return [ev.venue, ev.city].filter(Boolean).join(' · ');
}

/* ---------- upcoming: featured countdown + list ---------- */
const featured = document.getElementById('featured-event');
const list = document.getElementById('upcoming-events');
let tickInterval = null;

function unit(id, label) {
  return '<div class="countdown-unit">' +
    '<span class="countdown-number" id="' + id + '">--</span>' +
    '<span class="countdown-label">' + label + '</span>' +
    '</div>';
}

function renderFeatured(ev) {
  const where = whereText(ev);
  featured.innerHTML =
    '<div class="countdown-lead">' +
      '<span class="countdown-overline">Up Next</span>' +
      '<span class="countdown-name">' + escapeHtml(ev.name) + '</span>' +
      '<span class="countdown-when">' + escapeHtml(whenText(ev)) + '</span>' +
      (where ? '<span class="countdown-where">' + escapeHtml(where) + '</span>' : '') +
      (ev.blurb ? '<span class="countdown-blurb">' + escapeHtml(ev.blurb) + '</span>' : '') +
      (ev.link ? '<a class="countdown-link btn btn-gold" href="' + escapeHtml(ev.link) + '" target="_blank" rel="noopener noreferrer">Details <span class="arrow" aria-hidden="true">&rarr;</span></a>' : '') +
    '</div>' +
    '<div class="countdown-timer" id="countdown-timer" role="timer" aria-live="off" aria-label="Countdown to the next appearance">' +
      unit('countdown-days', 'Days') +
      unit('countdown-hours', 'Hours') +
      unit('countdown-minutes', 'Minutes') +
      unit('countdown-seconds', 'Seconds') +
    '</div>';
}

function renderTBA() {
  featured.innerHTML =
    '<div class="countdown-empty">' +
      '<i class="fas fa-calendar-day" aria-hidden="true"></i>' +
      '<p class="countdown-empty-title">Our next appearance is being finalized.</p>' +
      '<p class="countdown-empty-sub">Dates to be announced. Check back soon.</p>' +
    '</div>';
}

function renderNone() {
  featured.innerHTML =
    '<div class="countdown-empty">' +
      '<i class="fas fa-calendar-day" aria-hidden="true"></i>' +
      '<p class="countdown-empty-title">Community appearances are being scheduled.</p>' +
      '<p class="countdown-empty-sub">Check back soon, or <a href="book.html">book a session</a> in the meantime.</p>' +
    '</div>';
}

function renderList(events) {
  if (!list) return;
  if (!events.length) { list.innerHTML = ''; return; }
  const header = '<li class="upcoming-events-header">Also on the calendar</li>';
  const items = events.map(function (ev) {
    const where = whereText(ev);
    return '<li class="upcoming-event">' +
      '<span class="upcoming-event-when">' + escapeHtml(shortWhen(ev)) + '</span>' +
      '<span class="upcoming-event-name">' + escapeHtml(ev.name) + '</span>' +
      (where ? '<span class="upcoming-event-where">' + escapeHtml(where) + '</span>' : '') +
      (ev.blurb ? '<span class="upcoming-event-blurb">' + escapeHtml(ev.blurb) + '</span>' : '') +
    '</li>';
  }).join('');
  list.innerHTML = header + items;
}

function startTimer(ev) {
  function tick() {
    const diff = ev.date.getTime() - Date.now();
    if (diff <= 0) { selectAndRender(); return; }
    const days    = Math.floor(diff / 864e5);
    const hours   = Math.floor((diff % 864e5) / 36e5);
    const minutes = Math.floor((diff % 36e5) / 6e4);
    const seconds = Math.floor((diff % 6e4) / 1e3);
    const d = document.getElementById('countdown-days');
    const h = document.getElementById('countdown-hours');
    const m = document.getElementById('countdown-minutes');
    const s = document.getElementById('countdown-seconds');
    // The nodes can be replaced by a re-render between ticks; guard each.
    if (!d || !h || !m || !s) return;
    d.textContent = String(days).padStart(2, '0');
    h.textContent = String(hours).padStart(2, '0');
    m.textContent = String(minutes).padStart(2, '0');
    s.textContent = String(seconds).padStart(2, '0');
  }
  tick();
  tickInterval = setInterval(tick, 1000);
}

function selectAndRender() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }

  const now = Date.now();
  const future = upcomingEvents
    .filter(function (e) { return !isDate(e.date) || e.date.getTime() > now; })
    .sort(function (a, b) {
      if (!isDate(a.date)) return 1;
      if (!isDate(b.date)) return -1;
      return a.date - b.date;
    });

  let featuredEvent = null;
  for (let i = 0; i < future.length; i++) {
    if (isDate(future[i].date)) { featuredEvent = future[i]; break; }
  }
  const rest = future.filter(function (e) { return e !== featuredEvent; });

  if (featuredEvent) {
    renderFeatured(featuredEvent);
    startTimer(featuredEvent);
  } else if (future.length) {
    renderTBA();
  } else {
    renderNone();
  }

  renderList(rest);
}

/* ---------- past appearances gallery ---------- */
const pastHost = document.getElementById('past-appearances');

function placeholderTile() {
  return '<div class="appearance-card soon">' +
      '<div class="appearance-photo placeholder"><i class="fas fa-camera-retro" aria-hidden="true"></i></div>' +
      '<div class="appearance-body">' +
        '<span class="appearance-when">Coming soon</span>' +
        '<h3>Photos on the way</h3>' +
        '<p>This space fills in after each appearance.</p>' +
      '</div>' +
    '</div>';
}

function appearanceCard(ev) {
  const where = whereText(ev);
  const media = ev.photo
    ? '<div class="appearance-photo"><img src="' + escapeHtml(ev.photo) + '" alt="' + escapeHtml(ev.name) + '" loading="lazy" decoding="async"></div>'
    : '<div class="appearance-photo placeholder"><i class="fas fa-hands-holding" aria-hidden="true"></i></div>';
  return '<article class="appearance-card">' +
      media +
      '<div class="appearance-body">' +
        '<span class="appearance-when">' + escapeHtml(pastWhenText(ev)) + '</span>' +
        '<h3>' + escapeHtml(ev.name) + '</h3>' +
        (where ? '<p class="appearance-where">' + escapeHtml(where) + '</p>' : '') +
        (ev.blurb ? '<p>' + escapeHtml(ev.blurb) + '</p>' : '') +
        (ev.link ? '<a class="appearance-link" href="' + escapeHtml(ev.link) + '" target="_blank" rel="noopener noreferrer">See more <span class="arrow" aria-hidden="true">&rarr;</span></a>' : '') +
      '</div>' +
    '</article>';
}

function renderPast() {
  if (!pastHost) return;
  if (!pastAppearances.length) {
    pastHost.innerHTML =
      '<p class="appearances-empty-note">Past appearances will be pictured here as they happen.</p>' +
      '<div class="appearances-gallery" aria-hidden="true">' +
        placeholderTile() + placeholderTile() + placeholderTile() +
      '</div>';
    return;
  }
  const cards = pastAppearances.map(appearanceCard).join('');
  pastHost.innerHTML = '<div class="appearances-gallery">' + cards + '</div>';
}

/* ---------- boot ---------- */
function init() {
  if (featured) { selectAndRender(); }
  renderPast();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
