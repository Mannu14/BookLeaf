# BookLeaf Author Support Portal

A support desk for BookLeaf Publishing with two sides:

- **Author portal**: authors sign in, see their books and royalty position, raise queries and follow replies live.
- **Admin portal**: the operations team works a single queue where every ticket arrives already categorised and prioritised by an LLM, opens a ticket to find a reply drafted from BookLeaf's knowledge base, edits it, and sends it.

Stack: React 18 + Vite + Tailwind, Node 22 + Express, MongoDB (Mongoose), Socket.IO, Gemini or OpenAI.

---

## Contents

1. [Quick start](#quick-start)
2. [Test accounts](#test-accounts)
3. [Configuration and API keys](#configuration-and-api-keys)
4. [Architecture](#architecture)
5. [AI integration](#ai-integration)
6. [API reference](#api-reference)
7. [Real-time events](#real-time-events)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Assumptions, limitations and next steps](#assumptions-limitations-and-next-steps)

See also [WRITEUP.md](WRITEUP.md) for the one-page summary of approach and trade-offs.

---

## Quick start

Requirements: **Node.js 22+**. MongoDB is optional for local runs.

```bash
git clone https://github.com/Mannu14/BookLeaf.git
cd BookLeaf

npm run install:all                     # root, backend and frontend dependencies
cp backend/.env.example backend/.env    # then add an AI key if you have one (optional)

npm run dev                             # API on :5000, web app on :5173
```

Open http://localhost:5173.

On first start the server seeds the sample dataset (10 authors, 18 books from `bookleaf_sample_data.json`), two admin users and eight realistic tickets. If no MongoDB is running at `MONGODB_URI`, it starts an in-memory MongoDB instead, so the app works with zero setup. In that mode data resets on every restart.

To use a persistent database, start MongoDB (or put an Atlas URI in `MONGODB_URI`) and run:

```bash
npm run seed      # wipes and reseeds the configured database
```

Production-style single process (API serves the built frontend):

```bash
npm run build && npm start              # http://localhost:5000
```

## Test accounts

| Role | Email | Password | Useful for |
| --- | --- | --- | --- |
| Admin | `admin@bookleaf.pub` | `admin123` | Ticket queue, AI triage, drafting, notes |
| Admin | `karan@bookleaf.pub` | `admin123` | Reassigning tickets between team members |
| Author | `rohit.kapoor@email.com` | `author123` | Two live books, ₹13,024 pending, overdue payout ticket |
| Author | `sneha.kulkarni@email.com` | `author123` | Three books, one in Cover Design |
| Author | `kavita.deshmukh@email.com` | `author123` | Book in Typesetting, ₹850 pending (below the ₹1,000 threshold) |
| Author | `ananya.reddy@email.com` | `author123` | Never been paid since publication |
| Author | `farhan.sheikh@email.com` | `author123` | Fully paid, nothing pending |

Every author in the dataset can sign in with `author123`. The login page lists all accounts for one-click sign-in (controlled by `DEMO_MODE`).

A good way to see the real-time flow: sign in as an author in one browser and as the admin in a private window. Raise a ticket as the author, watch it appear in the admin queue, reply from the admin side, and the reply shows up on the author's open ticket without a refresh.

## Configuration and API keys

All configuration lives in `backend/.env` (template: [`backend/.env.example`](backend/.env.example)). The `.env` file is git-ignored.

**To enable the LLM, add one key to `backend/.env`:**

```env
GEMINI_API_KEY=your-key-here     # https://aistudio.google.com/apikey
# or
OPENAI_API_KEY=your-key-here
```

With `AI_PROVIDER=auto` (default) the server uses Gemini if its key is set, otherwise OpenAI. Without any key everything still works using the rule-based fallback described below; the admin UI labels those results as "Rule-based (AI unavailable)".

| Variable | Default | Notes |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/bookleaf` | |
| `ALLOW_IN_MEMORY_DB` | `true` outside production | Fall back to an in-memory DB if Mongo is unreachable |
| `AUTO_SEED` | `true` | Seed sample data when the database is empty |
| `JWT_SECRET` | dev-only value | **Required** when `NODE_ENV=production`; server refuses to start without it |
| `CLIENT_URL` | `http://localhost:5173` | Comma-separated allowed origins (CORS and Socket.IO) |
| `AI_PROVIDER` | `auto` | `auto`, `gemini`, `openai`, `none` |
| `GEMINI_MODEL` / `OPENAI_MODEL` | `gemini-2.5-flash` / `gpt-4o-mini` | |
| `AI_TIMEOUT_MS` | `12000` | Hard timeout per model call |
| `AI_BREAKER_THRESHOLD` / `AI_BREAKER_COOLDOWN_MS` | `3` / `60000` | Circuit breaker |

API keys are read only on the server. The frontend never sees them and never calls an AI provider directly.

## Architecture

```
frontend/ (React SPA)                       backend/ (Express + Socket.IO)
  pages/author/*  pages/admin/*               routes/ -> validators -> controllers
  context/ Auth, Socket, Toast                     controllers are thin; logic lives in services/
  lib/api.js (axios, error normalising)       services/ticketService   ticket lifecycle
          |                                    services/statsService    aggregations
          |  REST  /api/*   (JWT bearer)       ai/aiService             triage + drafting, never throws
          |  WebSocket (JWT in handshake)      ai/llmClient             timeout, retry, circuit breaker
          v                                    ai/providers/{gemini,openai}
       server.js -> app.js                     ai/prompts, knowledgeBase, facts, parse, fallback
                                               realtime/socket          server-assigned rooms
                                               models/ User, Book, Ticket, Message, InternalNote, Counter
```

Key decisions:

- **Thin controllers, service layer.** Controllers translate HTTP to service calls. `ticketService` owns the ticket lifecycle (create, reply, reopen, resolve, assign, override), so the same rules apply whichever route triggers them.
- **One `User` collection with a `role`.** Authors and staff share login and auth middleware; `role` drives access. Books reference authors by the dataset's `author_id`.
- **Messages and internal notes are separate collections.** A note can never leak through a message query, and author endpoints never touch the notes collection.
- **Authors get a sanitised ticket view.** `serializers.toAuthorTicket` whitelists fields: authors do not see internal priority, AI reasoning, drafts or assignee. The same serializer is used for socket payloads sent to authors.
- **Ranks stored on the ticket.** `status_rank` and `priority_rank` are kept in sync on save, so "active first, most urgent, oldest" is a plain indexed MongoDB sort that works with pagination.
- **Atomic ticket numbers.** `BL-1001`, `BL-1002`, ... come from a counter document updated with `$inc`, which is safe under concurrent requests (unlike `countDocuments() + 1`).
- **Consistent error shape.** Every error is `{ success: false, error: { code, message, details? } }`. Validation errors list each failing field, which the UI shows inline.
- **Auth.** bcrypt-hashed passwords (never selected by default), JWT bearer tokens, rate-limited login, identical error for unknown email and wrong password, helmet headers, 100 kb JSON body limit, regex-escaped search.

### Data model

| Collection | Purpose | Notable fields |
| --- | --- | --- |
| `users` | Authors and admins | `author_id`, `role`, hashed `password` |
| `books` | Sample dataset as-is | Nullable `mrp`, `isbn`, dates for books in production |
| `tickets` | Support tickets | `category`, `priority`, `status` + ranks; `ai_category` / `ai_priority` (suggestion, confidence, reasoning, override info); `ai_triage_meta` (provider, model, tokens, latency, fallback reason); `ai_draft` (text, sections used, `stale`); `first_response_at`, `unread_for_author` |
| `messages` | Public thread | `sender_role`, `ai_assisted`, `ai_draft_edited` |
| `internalnotes` | Staff-only notes | |
| `counters` | Ticket number sequence | |

## AI integration

Three jobs: classify into one of six categories, assign a priority, and draft a reply. All three are produced by `ai/aiService.js`.

### Flow

1. **Author submits a ticket.** One model call returns category and priority together as JSON (`temperature: 0`, JSON mode). The ticket is saved with the result. If anything goes wrong the rule-based fallback fills in, so ticket creation never fails because of AI.
2. **Admin opens the ticket.** If it has no draft yet, or the author has replied since the draft was written (`ai_draft.stale`), the UI requests a draft. The draft is stored on the ticket and reused; admins can regenerate on demand.
3. **Admin edits and sends.** Nothing is sent to an author without a human pressing Send. The reply records whether it came from the draft and whether it was edited.

### Prompt design

Prompts are in [`backend/src/ai/prompts.js`](backend/src/ai/prompts.js).

- **Triage prompt** defines each category in one line, gives an explicit priority rubric (for example: wrong book under the author's ISBN is Critical, any ISBN error is at least High, bio updates are Low), and asks for strict JSON with confidence and a one-sentence reason for each decision.
- **Draft prompt** is a static system prompt encoding BookLeaf's tone guidelines (acknowledge first, be specific, own mistakes, give timelines, end with a next step) plus hard rules: use only the supplied facts and policy, never invent amounts or dates, plain text, 90-200 words, fixed sign-off.
- **Knowledge base as sections.** The KB from the brief is split into sections (royalty, ISBN, printing, distribution, production, metadata, company). A draft only includes the sections for its category, plus up to two more if the text clearly mentions them (a printing complaint that also mentions royalties gets both).
- **Per-category handling guide.** The "expected response" column from the brief's sample table is included for the ticket's category only, which calibrates tone and content.
- **Computed facts instead of model arithmetic.** The server calculates the next payout date (quarter end + 45 days), whether pending royalty clears the ₹1,000 threshold, and whether a payout is overdue. The model is handed these as `FACTS` and told to quote them. Replies like "your Q3 2026 royalties will be paid by 14 Nov 2026" are correct by construction rather than by luck.
- **Prompt-injection hygiene.** Author text is wrapped in `<ticket>` / `<thread>` tags and both system prompts say to treat it as data.

### Guardrails on output

- Triage JSON is parsed defensively (code fences stripped, enums matched case-insensitively). An unknown category or priority is rejected and the fallback is used instead of storing bad data.
- **Policy floors**: the KB says ISBN errors are high priority, so an ISBN ticket can never be stored below High even if the model says otherwise.
- Drafts are cleaned of markdown and rejected if empty.

### Failure handling

`ai/llmClient.js` wraps every provider call:

| Situation | Behaviour |
| --- | --- |
| No API key | Rule-based triage and template drafts; UI labels them as such |
| Timeout (12 s default) | Call aborted, fallback used |
| 429 or 5xx | One retry after 400 ms, then fallback |
| Invalid / unparseable output | Fallback |
| Repeated failures | After 3 consecutive failures the circuit opens for 60 s and calls go straight to the fallback, so an outage costs one slow request instead of one per ticket |

The fallback (`ai/fallback.js`) uses weighted keyword signals for category, rules plus book facts for priority, and per-category reply templates filled with the author's real figures. It correctly handles every example in the brief and every seeded ticket (this is covered by tests). Tickets are always created, and admins can always write a reply manually.

### Cost awareness

- **One call for triage**, not separate classification and priority calls.
- **Drafts are lazy.** No draft is generated at ticket creation. It is created the first time an admin opens the ticket and then cached. Tickets nobody opens cost one small triage call only. Concurrent requests for the same draft are de-duplicated in-process.
- **Targeted context.** A typical draft prompt carries 1-2 KB sections (~150-300 tokens) instead of the whole KB, plus only the last 4 messages of the thread (each capped at 1,200 characters). Older messages are counted, not sent.
- **Bounded outputs.** `maxOutputTokens` of 300 for triage, 700 for drafts; Gemini "thinking" is disabled because these tasks do not need it.
- **Static system prompts** so providers can cache the shared prefix.
- **Measured, not guessed.** Input/output tokens, latency, provider and model are stored on every ticket and draft, and shown in the admin UI. The Insights page reports how many tickets were triaged by the model vs. the fallback, the category/priority override rate (a live proxy for classification accuracy), and how many replies were sent from drafts unedited.

### Model choice

Default is **Gemini 2.5 Flash**, with **GPT-4o mini** supported through the same interface. Both are fast and inexpensive, which matters because triage sits on the request path of ticket creation and the volume is in the thousands per month. Both support a JSON output mode, which makes triage parsing reliable. The tasks (six-way classification, a 150-word grounded reply) do not need a frontier model; the quality comes from giving the model the right facts and policy. Supporting two providers behind one adapter also means an outage or pricing change at one vendor is a config change, not a code change.

## API reference

Base URL: `/api`. All endpoints except login, health and demo accounts require `Authorization: Bearer <token>`.

Responses: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.
Status codes used: `200`, `201`, `400` (validation, with `details[]`), `401` (missing/invalid/expired token), `403` (wrong role or not your resource), `404`, `409`, `429` (login rate limit), `500`.

### Auth

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public, rate-limited | Body `{ email, password }`. Returns `{ token, user }`; authors also get a royalty `summary`. |
| GET | `/auth/me` | Any signed-in user | Current user and summary. |
| GET | `/auth/demo-accounts` | Public, only when `DEMO_MODE=true` | Names, emails and roles for the login page. No credentials. |
| GET | `/health` | Public | Status and active AI provider. |

### Books (authors)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/books` | Author | The author's books with all dataset fields. `meta` has totals (sold, earned, paid, pending, published, in production). |
| GET | `/books/:id` | Owner author or admin | One book. Other authors get `403`. |

### Tickets (authors)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/tickets?status=` | Author | Own tickets, most recently active first. |
| POST | `/tickets` | Author | Body `{ book_id: "<id>" \| "general", subject (5-200), description (15-5000), attachment?: { original_name, mime_type, size_kb } }`. Runs AI triage, returns `201` with the author view of the ticket. The book must belong to the author. |
| GET | `/tickets/:id` | Owner author | Ticket plus public messages. Marks unread replies as read. |
| POST | `/tickets/:id/messages` | Owner author | Body `{ body }`. Reopens a resolved ticket and marks any existing draft as stale. Closed tickets return `400`. |

### Admin

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/tickets` | Queue. Query: `status`, `category`, `priority`, `assignee=me\|unassigned`, `from`, `to` (YYYY-MM-DD), `search`, `sort=urgency\|newest\|oldest` (default urgency), `page`, `limit` (max 100). `meta` has pagination. |
| GET | `/admin/tickets/:id` | Ticket with AI data, messages (with draft-usage flags), internal notes and author context (profile, totals, every book's royalty position, active ticket count). |
| PATCH | `/admin/tickets/:id` | Any of `{ status, category, priority, assignee: "me" \| <adminId> \| null }`. Category/priority changes are recorded as overrides against the original AI suggestion; reverting to the AI's value clears the flag. |
| POST | `/admin/tickets/:id/draft` | Generate (or regenerate) the AI reply draft. Returns the draft with sections used and token/latency metadata. |
| POST | `/admin/tickets/:id/replies` | Body `{ body, resolve?, from_draft? }`. Sends a reply to the author, sets first-response time, moves Open to In Progress (or to Resolved if `resolve`), auto-assigns if unassigned. |
| POST | `/admin/tickets/:id/notes` | Body `{ note }`. Internal note, never visible to authors. |
| GET | `/admin/stats` | Queue counts, SLA breaches (active and older than 48 h), category and priority breakdowns, average first response, AI usage metrics, AI provider status. |
| GET | `/admin/authors` | All authors with book, sales, royalty and ticket aggregates. |
| GET | `/admin/team` | Admin users (for assignment). |

Example:

```bash
TOKEN=$(curl -s localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@bookleaf.pub","password":"admin123"}' | node -pe 'JSON.parse(fs.readFileSync(0)).data.token')

curl -s "localhost:5000/api/admin/tickets?priority=Critical&status=Open" -H "Authorization: Bearer $TOKEN"
```

## Real-time events

Socket.IO, authenticated with the same JWT (`io(url, { auth: { token } })`). Unauthenticated connections are rejected. The **server** places each socket in a room based on the verified token: admins in `admins`, authors in `author:<author_id>`. Clients cannot choose rooms, so an author can only ever receive events about their own tickets, and admin-only data (internal notes, AI triage, drafts) is never sent to an author socket.

| Event | Admins receive | Author receives |
| --- | --- | --- |
| `ticket:created` | Full ticket | Own ticket, author view |
| `ticket:updated` | Full ticket | Own ticket, author view |
| `message:created` | `{ ticketId, message }` incl. draft-usage flags | `{ ticketId, message }` for own tickets |
| `note:created` | `{ ticketId, note }` | never |
| `draft:ready` | `{ ticketId, draft }` | never |

## Testing

```bash
npm test
```

57 tests using Node's built-in test runner, Supertest and an in-memory MongoDB seeded with the real dataset. No network calls: the AI provider is replaced with a fake where needed.

| File | Covers |
| --- | --- |
| `auth.test.js` | Login, identical errors for wrong password vs unknown email, validation, malformed JSON, token checks, no password fields in any response |
| `books.test.js` | Author sees only own books and correct totals, in-production books with null fields, cross-author `403`, admin access rules |
| `tickets.test.js` | Full lifecycle: validation, foreign-book rejection, triage on create, author view hides internal fields, sequential numbers under concurrency, isolation between authors, on-demand draft grounded in real figures, admin reply with draft tracking, unread flag, stale draft on follow-up, reopen on reply, closed tickets |
| `admin.test.js` | RBAC, urgency ordering, every filter including date range and regex-unsafe search, pagination, override tracking and reverting, assignment, notes never reaching authors, author context, stats, author directory |
| `ai.test.js` | Output parsing and rejection, KB section selection, payout date maths, overdue rules, policy floors, prompt contents (facts present, irrelevant KB absent, long threads truncated, untrusted text fenced), fallback on every example from the brief, and provider behaviour: success path with token accounting, errors, invalid output, timeouts, retry on 429, circuit breaker |
| `realtime.test.js` | Socket auth, replies delivered live to the right author only, sanitised author payloads, notes delivered to admins only |

The UI flow (login, raise ticket, admin triage and reply, live update on the author's screen, follow-up, insights, mobile layout) was also checked end to end in a headless browser.

## Deployment

The backend serves the built frontend, so the whole app deploys as one Node service.

**Render (blueprint included):** New -> Blueprint -> select this repo. [`render.yaml`](render.yaml) builds the frontend, starts the API, and generates `JWT_SECRET`. Set:

- `MONGODB_URI`: a MongoDB Atlas connection string (free tier is fine)
- `CLIENT_URL`: the service URL, e.g. `https://bookleaf-support.onrender.com`
- `GEMINI_API_KEY` or `OPENAI_API_KEY`

The database seeds itself on first boot. For a throwaway demo without Atlas, set `ALLOW_IN_MEMORY_DB=true` (data resets on every deploy/restart).

**Any other host** (Railway, a VPS): `npm run install:all && npm run build && npm start` with the same environment variables. For a split deployment (static frontend on Vercel, API elsewhere), build the frontend with `VITE_API_URL=https://api.example.com/api` and `VITE_SOCKET_URL=https://api.example.com`, and add the frontend origin to `CLIENT_URL`.

## Assumptions, limitations and next steps

Assumptions:

- Royalty figures in the dataset are the source of truth. The portal does not recompute royalties from sales.
- "Overdue" means at least ₹1,000 pending with no payout for longer than one quarter plus the 45-day window. This drives priority and the wording of drafts.
- Authors do not see a ticket's priority. It is an internal triage signal, and showing an author that their issue is "Low" is not a good experience.
- Admin accounts are seeded; there is no sign-up or password reset flow, which the brief did not ask for.

Known limitations:

- **Attachments are metadata only.** The form validates type and size and stores name/type/size, but the file itself is not uploaded. Next step: presigned upload to S3/GCS and a virus scan before linking it to the ticket.
- **AI calls run in the request.** Triage adds model latency (typically about a second) to ticket creation, bounded by the timeout. At higher volume this should move to a queue (BullMQ/Redis) with the ticket created immediately and triage applied asynchronously.
- **Single instance.** Socket.IO rooms and the draft de-duplication map are in-process. Running several instances needs the Socket.IO Redis adapter and a shared lock.
- **Keyword-based KB selection.** Fine for a seven-section KB. A larger KB (FAQs, past resolved tickets) would call for embeddings-based retrieval.
- JWT is stored in `localStorage` for simplicity; an httpOnly cookie with CSRF protection is the safer production choice.
- No email notifications; authors see replies in the portal only.

With more time I would add: email notifications on reply, an evaluation set of real historical tickets to track triage accuracy per prompt version, SLA timers per priority (not a flat 48 h), canned responses, and an audit log of every status/assignment change.
