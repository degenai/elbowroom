import { handleDraftNotesRequest } from './draft-notes-core.mjs';

export default {
  async fetch(request, env) {
    return handleDraftNotesRequest(request, env);
  },
};
