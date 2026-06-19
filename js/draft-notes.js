const API_ENDPOINT = document.body.dataset.notesApi || '/api/draft-notes';
const REVIEWER_STORAGE_KEY = 'elbowroomDraftReviewer';
const REVIEW_KEY_STORAGE_KEY = 'elbowroomDraftReviewKey';

function getReviewKey() {
  try {
    return sessionStorage.getItem(REVIEW_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setReviewKey(value) {
  try {
    if (value) sessionStorage.setItem(REVIEW_KEY_STORAGE_KEY, value);
  } catch {
    // Storage can be disabled; the form still works for the current submit.
  }
}

function getReviewer() {
  try {
    return localStorage.getItem(REVIEWER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setReviewer(value) {
  try {
    if (value) localStorage.setItem(REVIEWER_STORAGE_KEY, value);
  } catch {
    // Non-fatal. The reviewer can type their name again.
  }
}

function authHeaders() {
  const key = getReviewKey();
  return key ? { authorization: `Bearer ${key}` } : {};
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  let body = null;
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) body = await response.json();

  if (!response.ok) {
    const error = new Error(body?.error || body?.errors?.join(', ') || `Request failed (${response.status})`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function renderNote(note) {
  const item = document.createElement('article');
  item.className = 'draft-note';

  const meta = document.createElement('div');
  meta.className = 'draft-note-meta';

  const reviewer = document.createElement('strong');
  reviewer.textContent = note.reviewer || 'Reviewer';

  const when = document.createElement('time');
  when.dateTime = note.created_at || '';
  when.textContent = formatWhen(note.created_at);

  const text = document.createElement('p');
  text.textContent = note.note || '';

  meta.append(reviewer, when);
  item.append(meta, text);
  return item;
}

function setStatus(panel, message, tone = '') {
  const status = panel.querySelector('.draft-notes-status');
  status.textContent = message;
  status.dataset.tone = tone;
}

function updateCount(panel, count) {
  const countNode = panel.querySelector('.draft-notes-count');
  countNode.textContent = count === 1 ? '1 note' : `${count} notes`;
}

async function loadNotes(panel, postId) {
  const list = panel.querySelector('.draft-notes-list');
  list.textContent = '';
  setStatus(panel, 'Loading notes…');

  try {
    const body = await apiFetch(`${API_ENDPOINT}?post_id=${encodeURIComponent(postId)}`);
    const notes = body.notes || [];
    if (notes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'draft-notes-empty';
      empty.textContent = 'No notes yet. Be the first reviewer to leave a raw thought block.';
      list.append(empty);
    } else {
      notes.forEach((note) => list.append(renderNote(note)));
    }
    updateCount(panel, notes.length);
    setStatus(panel, notes.length ? 'Loaded.' : 'Ready for the first note.', 'ok');
    panel.dataset.loaded = 'true';
  } catch (error) {
    if (error.status === 404) {
      setStatus(panel, 'Notes API is not live yet. The drawer UI is ready; saving waits for the D1 Worker deploy.', 'warn');
      return;
    }
    if (error.status === 401) {
      setStatus(panel, 'Review key required. Paste the shared key, then reopen or submit again.', 'warn');
      panel.querySelector('.draft-review-key-input').focus();
      return;
    }
    setStatus(panel, `Could not load notes: ${error.message}`, 'warn');
  }
}

function prependCreatedNote(panel, note) {
  const list = panel.querySelector('.draft-notes-list');
  const empty = list.querySelector('.draft-notes-empty');
  if (empty) empty.remove();
  list.prepend(renderNote(note));
  updateCount(panel, list.querySelectorAll('.draft-note').length);
}

function notesPanelHtml(postId) {
  return `
    <summary>
      <span>Reviewer notes</span>
      <span class="draft-notes-count">Load notes</span>
    </summary>
    <div class="draft-notes-body">
      <div class="draft-notes-status" aria-live="polite">Open to load notes for ${postId}.</div>
      <div class="draft-notes-list"></div>
      <form class="draft-note-form">
        <div class="draft-note-fields">
          <label>
            <span>Name</span>
            <input name="reviewer" autocomplete="name" maxlength="80" required placeholder="Alex, Morgan, Anna, Sarah…">
          </label>
          <label>
            <span>Review key <em>(if needed)</em></span>
            <input class="draft-review-key-input" name="review_key" type="password" autocomplete="off" placeholder="Shared review key">
          </label>
        </div>
        <label class="draft-note-textarea">
          <span>Raw note block</span>
          <textarea name="note" maxlength="4000" required placeholder="Drop the thought here: approve, tighten hook, change CTA, this feels too clinical, etc."></textarea>
        </label>
        <div class="draft-note-actions">
          <button type="submit">Save note</button>
          <small>Saved notes are raw review input only — they do not publish or edit the post.</small>
        </div>
      </form>
    </div>
  `;
}

function attachNotesPanel(card) {
  const postId = card.id;
  if (!/^er-\d{3}$/.test(postId)) return;

  const panel = document.createElement('details');
  panel.className = 'draft-notes-panel';
  panel.innerHTML = notesPanelHtml(postId);

  const form = panel.querySelector('.draft-note-form');
  const reviewerInput = form.elements.reviewer;
  const keyInput = form.elements.review_key;
  reviewerInput.value = getReviewer();
  keyInput.value = getReviewKey();

  panel.addEventListener('toggle', () => {
    if (panel.open && panel.dataset.loaded !== 'true') loadNotes(panel, postId);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const reviewer = reviewerInput.value.trim();
    const note = form.elements.note.value.trim();
    const reviewKey = keyInput.value.trim();

    if (!reviewer || !note) {
      setStatus(panel, 'Name and note are required.', 'warn');
      return;
    }

    setReviewer(reviewer);
    setReviewKey(reviewKey);
    setStatus(panel, 'Saving note…');

    try {
      const body = await apiFetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ post_id: postId, reviewer, note }),
      });
      prependCreatedNote(panel, body.note);
      form.elements.note.value = '';
      panel.dataset.loaded = 'true';
      setStatus(panel, 'Saved. This note is ready for digestion/refinement.', 'ok');
    } catch (error) {
      if (error.status === 404) {
        setStatus(panel, 'Notes API is not live yet. Keep this thought handy; D1 deploy is the next switch.', 'warn');
        return;
      }
      if (error.status === 401) {
        setStatus(panel, 'Review key required. Paste the shared key and try again.', 'warn');
        keyInput.focus();
        return;
      }
      setStatus(panel, `Could not save note: ${error.message}`, 'warn');
    }
  });

  card.append(panel);
}

document.querySelectorAll('.draft-card[id]').forEach(attachNotesPanel);
