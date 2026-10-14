const BOOKLEAF_KNOWLEDGE_BASE = require('./knowledgeBase');

/**
 * Filter relevant knowledge base sections based on ticket keywords
 * to optimize token usage and minimize API latency / cost.
 */
function getTargetedKnowledgeContext(text = '') {
  const lower = text.toLowerCase();
  const contextParts = [];

  // Always include basic tone guidelines & company identity
  contextParts.push(`COMPANY OVERVIEW:
BookLeaf Publishing operates in India and the US, printing in-house (Delhi) and with Repro India & Epitome Books.`);

  if (lower.includes('royalt') || lower.includes('payment') || lower.includes('payout') || lower.includes('earning') || lower.includes('money') || lower.includes('bank') || lower.includes('sale') || lower.includes('sold')) {
    contextParts.push(`ROYALTY & PAYMENTS POLICY:
- 80/20 royalty split (80% net profit to author, 20% to BookLeaf).
- Net profit = MRP minus printing cost, marketplace commission (Amazon/Flipkart), and shipping.
- Royalties calculated quarterly and paid within 45 days of quarter ending (Q1: by May 15, Q2: by Aug 15, Q3: by Nov 15, Q4: by Feb 15).
- Minimum payout threshold: ₹1,000. Under ₹1,000 rolls over to next quarter.
- Payouts via direct bank transfer to linked account in dashboard.
- If payout is overdue, acknowledge and commit to an urgent 48-hour resolution timeline with finance.`);
  }

  if (lower.includes('isbn') || lower.includes('barcode') || lower.includes('metadata') || lower.includes('imprint') || lower.includes('listing error')) {
    contextParts.push(`ISBN & METADATA POLICY:
- Every book gets a unique BookLeaf ISBN assigned under BookLeaf's publisher imprint.
- ISBN errors (wrong book linked, duplicate ISBN on Amazon/Flipkart) are treated as HIGH/CRITICAL PRIORITY.
- Escalate immediately to the production & metadata team with a strict 48-hour resolution timeline.`);
  }

  if (lower.includes('print') || lower.includes('paper') || lower.includes('cover') || lower.includes('binding') || lower.includes('defect') || lower.includes('blurry') || lower.includes('damaged') || lower.includes('author cop')) {
    contextParts.push(`PRINTING & QUALITY POLICY:
- Standard print turnaround: 5–7 business days from order confirmation.
- Printing defects (misprints, binding defects, blurry images): apologize sincerely and arrange a 100% FREE reprint once verified.
- Ask the author to share photos of defective copies. Reprint turnaround: 5–7 business days.`);
  }

  if (lower.includes('availab') || lower.includes('stock') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('out of stock') || lower.includes('distribut')) {
    contextParts.push(`DISTRIBUTION & AVAILABILITY POLICY:
- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- New listings go live within 7–10 business days after publication is complete.
- "Currently Unavailable" on Amazon/Flipkart is usually a marketplace stock inventory sync lag. BookLeaf can trigger an automated stock re-sync within 24–48 hours.`);
  }

  if (lower.includes('status') || lower.includes('typeset') || lower.includes('proof') || lower.includes('stage') || lower.includes('delay') || lower.includes('production') || lower.includes('when will')) {
    contextParts.push(`PRODUCTION STAGES:
- Stages: Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Delays typically happen at Cover Design (awaiting author approval) and Proofreading (author revisions).
- Always check actual production status, explain honestly and collaboratively without blaming the author, and give a specific timeline.`);
  }

  // If no specific topic matched, provide general concise policy overview
  if (contextParts.length === 1) {
    contextParts.push(`GENERAL POLICIES:
- Royalty: 80/20 net profit, quarterly within 45 days, ₹1,000 threshold.
- ISBN errors: escalated to production, 48h timeline.
- Quality issues: free reprint after photo verification (5-7 days).
- Distribution: 24-48h stock re-sync for unavailable status.
- Metadata updates: take 3-5 business days to reflect on platforms.`);
  }

  return contextParts.join('\n\n');
}

/**
 * Builds the prompt for AI Auto-Classification into 6 categories
 */
function buildClassificationPrompt({ subject, description, bookTitle }) {
  return `You are BookLeaf Publishing's AI Ticket Classifier.
Classify the following author support ticket into EXACTLY ONE of these 6 categories:
1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

Ticket Information:
- Subject: ${subject}
- Description: ${description}
- Associated Book: ${bookTitle || 'General / Account Level'}

Return ONLY a valid JSON object in this exact format:
{
  "category": "<Exact category name from the 6 options above>",
  "confidence": <number between 0.1 and 1.0>,
  "reasoning": "<1 concise sentence explaining the classification>"
}`;
}

/**
 * Builds the prompt for AI Priority Scoring (Critical, High, Medium, Low)
 */
function buildPriorityPrompt({ subject, description, category, authorContext, bookContext }) {
  return `You are BookLeaf Publishing's AI Support Priority Scorer.
Evaluate the urgency and business impact of the author's support ticket and assign one priority:
- Critical: Financial stoppage, payment overdue > 60 days, legal threats, multiple author escalated complaints, severe ISBN marketplace corruption.
- High: Unpaid royalties over threshold, ISBN mismatches on Amazon/Flipkart, damaged author copies, production delay > 2 weeks without update.
- Medium: General royalty explanation request, stock re-sync request, standard production queries, cover design revision queries.
- Low: General inquiry, author bio update, marketing advice, minor description updates.

Ticket Data:
- Subject: ${subject}
- Description: ${description}
- Category: ${category}
- Book Title: ${bookContext?.title || 'N/A'}
- Book Status: ${bookContext?.status || 'N/A'}
- Total Royalty Pending: ₹${bookContext?.royalty_pending ?? authorContext?.totalPendingRoyalty ?? 0}
- Last Royalty Payout: ${bookContext?.last_royalty_payout_date || 'None'}

Return ONLY a valid JSON object in this exact format:
{
  "priority": "<Critical | High | Medium | Low>",
  "confidence": <number between 0.1 and 1.0>,
  "reasoning": "<1 concise sentence explaining why this priority was assigned>"
}`;
}

/**
 * Builds the prompt for drafting an empathetic, professional support response
 */
function buildDraftResponsePrompt({ ticket, author, book, conversationHistory = [] }) {
  const knowledgeContext = getTargetedKnowledgeContext(`${ticket.subject} ${ticket.description}`);

  let authorFinancialSnippet = '';
  if (book) {
    authorFinancialSnippet = `
Relevant Book Details:
- Title: "${book.title}" (ISBN: ${book.isbn || 'Pending Assignment'})
- Status: ${book.status}
- Copies Sold: ${book.total_copies_sold} | MRP: ₹${book.mrp || 'N/A'}
- Author Royalty Earned: ₹${book.total_royalty_earned}
- Royalty Paid: ₹${book.royalty_paid}
- Royalty Pending: ₹${book.royalty_pending}
- Last Payout: ${book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date).toLocaleDateString('en-IN') : 'None recorded yet'}
- Available Platforms: ${book.available_on?.join(', ') || 'None yet'}
- Print Partner: ${book.print_partner || 'In-House'}
`;
  } else {
    authorFinancialSnippet = `
Author Details:
- Name: ${author.name}
- Total Published Books: ${author.booksCount || 1}
`;
  }

  let historySnippet = '';
  if (conversationHistory.length > 0) {
    historySnippet = `
Previous Messages:
${conversationHistory
  .slice(-3)
  .map((m) => `${m.sender_role.toUpperCase()} (${m.sender_name}): ${m.message}`)
  .join('\n')}
`;
  }

  return `You are a Senior Author Support Specialist at BookLeaf Publishing.
Draft an empathetic, professional, transparent, and actionable response to the author.

BOOKLEAF OPERATIONAL POLICIES:
${knowledgeContext}

AUTHOR & TICKET CONTEXT:
- Author: ${author.name} (${author.email})
- Ticket ID: ${ticket.ticket_number || 'New Ticket'}
- Category: ${ticket.category}
- Priority: ${ticket.priority}
- Subject: ${ticket.subject}
- Author's Message: "${ticket.description}"
${authorFinancialSnippet}
${historySnippet}

STRICT COMMUNICATION GUIDELINES:
1. Tone: Always empathetic, warm, and professional. Treat authors as creative partners, never as a nuisance.
2. Acknowledge: First acknowledge and validate their specific concern directly before offering solutions.
3. Specificity: Use the exact book title, amounts, numbers, or dates provided above. Do not give vague platitudes.
4. Ownership: If there is a delay or issue on BookLeaf's side (e.g. pending royalty, sync delay), own it honestly without corporate deflection.
5. Realistic timelines: Give specific timelines (e.g., "within 24–48 hours for stock re-sync", "48 hours for finance escalation", "5–7 business days for free reprint"). Do NOT make up unverified payout dates.
6. Clear next step: Always end with a definite, reassuring next step.
7. Sign-off: "Warm regards,\nBookLeaf Author Support Team".

Draft the complete response directly (no commentary or meta-text).`;
}

module.exports = {
  buildClassificationPrompt,
  buildPriorityPrompt,
  buildDraftResponsePrompt,
  getTargetedKnowledgeContext,
};
