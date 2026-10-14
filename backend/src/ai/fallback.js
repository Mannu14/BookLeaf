// Deterministic triage and reply templates used when the LLM is unavailable,
// rate-limited, times out, or returns something we cannot validate.
// The goal is "good enough to keep the queue moving", not parity with the model.

const { bookFacts, payoutSchedule, formatDate, firstName } = require('./facts');

// [pattern, weight]. Strong, topic-defining terms weigh more than words that
// show up across topics (e.g. "Amazon" appears in ISBN, bio and stock tickets).
const CATEGORY_SIGNALS = {
  'Royalty & Payments': [[/royalt/, 3], [/payout/, 3], [/payment/, 2], [/\bpaid\b/, 1], [/earning/, 2], [/bank/, 1], [/statement/, 1]],
  'ISBN & Metadata Issues': [[/isbn/, 4], [/barcode/, 3], [/imprint/, 2], [/metadata/, 3], [/wrong (book|title|author)/, 3]],
  'Printing & Quality': [[/misprint/, 4], [/print(ing)? quality/, 4], [/binding|spine/, 3], [/blur|smudg/, 3], [/author cop/, 2], [/defect/, 3], [/pages? (are )?(missing|torn|misaligned)/, 3]],
  'Distribution & Availability': [[/unavailable/, 4], [/out of stock/, 4], [/not (available|listed|showing)/, 3], [/can(no|')t (order|buy)/, 3], [/listing/, 1], [/amazon|flipkart/, 0.5]],
  'Book Status & Production Updates': [[/typeset/, 4], [/proofread/, 4], [/cover design/, 3], [/production/, 2], [/stage/, 1], [/manuscript/, 2], [/when will .* (publish|live|ready)/, 3]],
  'General Inquiry': [[/\bbio(graphy)?\b/, 3], [/author (photo|profile)/, 3], [/description/, 2], [/package|bestseller breakthrough/, 2]],
};

function classify(subject, description) {
  const text = `${subject} ${description}`.toLowerCase();
  const subj = subject.toLowerCase();
  let best = { category: 'General Inquiry', score: 0 };

  for (const [category, signals] of Object.entries(CATEGORY_SIGNALS)) {
    // Subject matches count extra: authors usually state the topic there.
    const score = signals.reduce((sum, [p, w]) => sum + (p.test(text) ? w : 0) + (p.test(subj) ? w * 0.5 : 0), 0);
    if (score > best.score) best = { category, score };
  }

  return {
    value: best.category,
    confidence: best.score === 0 ? 0.4 : Math.min(0.85, 0.45 + best.score * 0.05),
    reasoning: best.score === 0 ? 'No strong topic keywords; defaulted to general.' : `Keyword match for ${best.category.toLowerCase()}.`,
  };
}

function prioritise(category, subject, description, book) {
  const text = `${subject} ${description}`.toLowerCase();
  const facts = bookFacts(book);
  const result = (value, reasoning) => ({ value, confidence: 0.6, reasoning });

  if (/legal|lawyer|fraud|police|consumer court/.test(text)) return result('Critical', 'Mentions legal action or fraud.');
  if (category === 'ISBN & Metadata Issues' && /wrong|different|duplicate|another book|mismatch/.test(text)) {
    return result('Critical', 'ISBN linked to the wrong book affects live sales.');
  }
  const reportsNonPayment = /not (been )?(received|paid)|never (received|been paid)|haven'?t (received|been paid)|no (royalty|payment|payout)|overdue|holding/.test(text);
  if (category === 'Royalty & Payments' && facts?.payout_overdue && reportsNonPayment) {
    return result('Critical', 'Payable royalty with no payout for more than a full cycle.');
  }
  if (category === 'Royalty & Payments' && (reportsNonPayment || /(\d+|several|many) months/.test(text))) {
    return result('High', 'Author reports a missing or delayed royalty payment.');
  }
  if (['ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability'].includes(category)) {
    return result('High', `${category} issues directly affect the book or its sales.`);
  }
  if (/bio|description|photo|how do i|can i|question/.test(text) && category === 'General Inquiry') {
    return result('Low', 'Informational or profile update request.');
  }
  return result('Medium', 'Standard query with no urgency signals.');
}

function triage({ subject, description, book }) {
  const category = classify(subject, description);
  const priority = prioritise(category.value, subject, description, book);
  return { category, priority };
}

// ---- Reply templates ------------------------------------------------------

const SIGN_OFF = 'Warm regards,\nBookLeaf Author Support';

function royaltyBody(ticket, facts) {
  const schedule = payoutSchedule();
  if (!facts) {
    return `Royalties are calculated quarterly and paid within 45 days of each quarter ending, by bank transfer to the account linked in your dashboard. The next payout covers ${schedule.quarter} and is due by ${formatDate(schedule.deadline)}. Balances under ₹1,000 roll over to the following quarter.\n\nOur finance team will review your account and confirm your figures within 48 hours.`;
  }
  const lowAmount = /low|less|only|too small|calculat|breakdown/.test(ticket.description.toLowerCase());
  const lines = [
    `Here is where "${facts.title}" stands today: ${facts.copies_sold} copies sold, ${facts.royalty_earned} earned in total, ${facts.royalty_paid} paid out and ${facts.royalty_pending} pending. Your last payout was ${facts.last_payout}.`,
  ];
  if (lowAmount) {
    lines.push('Royalties follow an 80/20 split of net profit, where net profit is the MRP minus printing cost, the platform commission (Amazon/Flipkart) and shipping. I am happy to send you a line-by-line breakdown so you can see exactly how each sale was calculated.');
  }
  if (facts.payout_overdue) {
    lines.push(`That pending balance should have been paid by now, and I am sorry it has not been. I have escalated this to our finance team and we will come back to you with a confirmed payment date within 48 hours.`);
  } else if (!facts.pending_meets_threshold) {
    lines.push(`Your pending balance is below the ₹1,000 payout threshold, so it rolls over and will be paid once it crosses that amount. The next payout cycle (${schedule.quarter}) closes on ${formatDate(schedule.deadline)}.`);
  } else {
    lines.push(`Royalties are paid within 45 days of each quarter ending, so your next payout (${schedule.quarter}) is due by ${formatDate(schedule.deadline)}.`);
  }
  lines.push('Could you also confirm that your bank details in the dashboard are current, so nothing holds up the transfer?');
  return lines.join('\n\n');
}

const BODIES = {
  'Royalty & Payments': royaltyBody,
  'ISBN & Metadata Issues': (ticket, facts) =>
    `An ISBN mismatch is a serious data issue and it is on us to fix it. I have escalated this to our production team${facts ? ` for "${facts.title}" (ISBN ${facts.isbn})` : ''}, and they will correct the listing and confirm back to you within 48 hours.\n\nIf you have a screenshot of the incorrect listing, please reply with it; it helps the team trace the problem faster.`,
  'Printing & Quality': (ticket, facts) =>
    `I am really sorry the copies${facts ? ` of "${facts.title}"` : ''} reached you in this condition. That is not the standard we hold ourselves to.\n\nCould you reply with a few clear photos of the affected pages or binding? Once our quality team verifies them, we will arrange a free reprint, which typically takes 5-7 business days.`,
  'Distribution & Availability': (ticket, facts) =>
    `When a live book shows as unavailable, it is almost always a stock sync issue between our inventory and the retailer${facts ? `, not a problem with "${facts.title}" itself` : ''}. I am triggering a re-sync with our distribution team now, and the listing should be purchasable again within 24-48 hours.\n\nI will check the listing again after that window and update you here.`,
  'Book Status & Production Updates': (ticket, facts) =>
    facts
      ? `"${facts.title}" is currently at the "${facts.status.replace(/^In Production - /, '')}" stage. This stage most often waits on a round of review or approval, so I have asked your production coordinator to confirm whether anything is pending from either side.\n\nWe will share an updated timeline for the remaining stages within 48 hours.`
      : 'I have asked our production team to check on your book and we will share an updated timeline for the remaining stages within 48 hours.',
  'General Inquiry': () =>
    'Yes, this can be updated. Metadata changes such as your book description or author bio can be submitted through your dashboard or by replying here with the new text, and they typically reflect on retail platforms within 3-5 business days.\n\nIf you share the updated details in this thread, we will take care of the submission for you.',
};

function draft({ ticket, author, book }) {
  const facts = bookFacts(book);
  const body = (BODIES[ticket.category] || BODIES['General Inquiry'])(ticket, facts);
  const opener = `Hi ${firstName(author?.name)},\n\nThank you for writing to us about "${ticket.subject}".`;
  return `${opener}\n\n${body}\n\n${SIGN_OFF}`;
}

module.exports = { triage, draft, classify, prioritise };
