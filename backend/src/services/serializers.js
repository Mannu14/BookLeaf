// Authors get a deliberately narrow view of a ticket: no AI triage data, no
// internal priority, no assignee, no draft. Admin endpoints return the full doc.
const AUTHOR_TICKET_FIELDS = [
  '_id',
  'ticket_number',
  'subject',
  'description',
  'book',
  'book_id',
  'book_title',
  'category',
  'status',
  'attachment',
  'first_response_at',
  'resolved_at',
  'last_activity_at',
  'unread_for_author',
  'created_at',
  'updated_at',
];

function toAuthorTicket(ticket) {
  const src = typeof ticket.toObject === 'function' ? ticket.toObject() : ticket;
  const out = {};
  for (const key of AUTHOR_TICKET_FIELDS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  // A populated book is fine to expose (it is the author's own), an ObjectId is too.
  return out;
}

function toMessage(message) {
  const src = typeof message.toObject === 'function' ? message.toObject() : message;
  return {
    _id: src._id,
    ticket: src.ticket,
    sender_name: src.sender_name,
    sender_role: src.sender_role,
    body: src.body,
    created_at: src.created_at,
  };
}

// Admins also see whether a reply came from an AI draft and whether it was edited.
function toAdminMessage(message) {
  const src = typeof message.toObject === 'function' ? message.toObject() : message;
  return { ...toMessage(src), ai_assisted: src.ai_assisted, ai_draft_edited: src.ai_draft_edited };
}

module.exports = { toAuthorTicket, toMessage, toAdminMessage };
