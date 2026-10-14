# Write-up: BookLeaf Author Support Portal

## What I prioritised

**1. AI that is useful to an ops team, and safe when it fails.** I treated the model as one component in a pipeline, not the product. Triage (category and priority) happens in a single JSON call when a ticket is created, so the queue is correctly ordered from the first second. Reply drafts are generated only when an admin opens a ticket, then cached, so we never pay for drafts nobody reads. Every model call goes through a client with a hard timeout, one retry on 429/5xx, and a circuit breaker; anything that fails or returns invalid output falls back to a rule-based triage and template that still uses the author's real numbers. A ticket is never lost because an API is down, and the admin can always write a reply manually.

**2. Grounded, specific replies.** The brief's tone guidelines say "be specific: actual numbers, dates and statuses." LLMs are unreliable at exactly that, so the server computes the facts (next payout date from the quarterly calendar, whether pending royalty clears ₹1,000, whether a payout is overdue) and hands them to the model to quote. The knowledge base is split into sections and only the relevant ones go into each prompt, together with the brief's "expected response" guidance for that category. A policy floor keeps ISBN errors at High or above whatever the model says.

**3. Data isolation.** Authors must never see another author's data or anything internal. Ownership is enforced in the service layer, authors get a whitelisted ticket view (no internal priority, AI reasoning, drafts or notes), internal notes live in a separate collection, and Socket.IO rooms are assigned by the server from the JWT rather than requested by the client. The original version let any socket join the admin room; closing that was one of the first fixes.

**4. Measurable AI.** Every ticket stores provider, model, tokens, latency and, if relevant, why it fell back. Admin overrides keep the original suggestion, and replies record whether they came from a draft and whether it was edited. The Insights page turns that into an override rate and draft-acceptance rate, which is how you would know whether a prompt change helped.

## Trade-offs

- **Synchronous triage vs. a queue.** Triage adds about a second to ticket creation (bounded by the timeout). A job queue would remove that, but adds Redis and a worker for a demo of this size. The service boundary is already where a queue would slot in.
- **Keyword section selection vs. embeddings.** For a seven-section KB, choosing sections by category plus keywords is predictable, testable and free. Embedding retrieval becomes worth it once past resolved tickets and FAQs are added.
- **MongoDB with denormalised fields.** Tickets copy author name and book title so the queue is one indexed query, with ranks stored for DB-side urgency sorting and pagination. The cost is updating copies if an author renames, which is rare.
- **In-memory MongoDB fallback.** It makes `npm run dev` work with zero setup and keeps tests hermetic. It is disabled by default in production.
- **Attachments are metadata only**, as the brief allows. Upload with virus scanning is the next step.

## Taking it to production

1. Move triage and drafting to a queue (BullMQ) with retries and a dead-letter view; create tickets instantly and push triage results over the socket.
2. Build an evaluation set from real historical tickets with known categories and approved replies, and run it on every prompt or model change; track the override rate in production as the live signal.
3. Pre-generate drafts for Critical/High tickets only, so the most urgent ones are ready when an admin opens them while keeping cost low.
4. Add retrieval over resolved tickets so drafts can reuse answers the team has already approved.
5. Scale-out basics: Socket.IO Redis adapter, httpOnly cookie sessions, structured logging and tracing around AI calls, per-priority SLA timers, email notifications on replies, and an audit log of status and assignment changes.
6. Connect real systems: royalty ledger and marketplace APIs (Amazon SP-API, Flipkart) so the facts given to the model are live, and stock re-syncs can be triggered from the ticket itself.
