// BookLeaf knowledge base, split into sections so each prompt only carries the
// policy text relevant to the ticket. The full KB is ~900 tokens; a typical draft
// prompt includes 1-2 sections (~150-300 tokens).

const SECTIONS = {
  company: {
    title: 'Company overview',
    text: [
      'BookLeaf Publishing is a self-publishing company operating in India and the US.',
      'Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid package with marketing and distribution add-ons).',
      'BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management.',
      'In-house printing facility and warehouse are in Delhi. Print partners: Repro India and Epitome Books.',
    ],
  },
  royalty: {
    title: 'Royalty policy',
    text: [
      'Royalty split is 80/20: 80% of net profit per book goes to the author, 20% to BookLeaf.',
      'Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.',
      'Royalties are calculated quarterly and paid within 45 days of the quarter ending.',
      'Minimum payout threshold is ₹1,000. Balances below this roll over to the next quarter.',
      "Payouts are made by bank transfer to the account linked in the author's dashboard.",
      'Authors can view a detailed royalty breakdown with per-platform sales in their dashboard.',
    ],
  },
  isbn: {
    title: 'ISBN policy',
    text: [
      'Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf, registered under the BookLeaf publisher imprint.',
      'Authors who want an ISBN under their own imprint must obtain it independently.',
      'ISBN errors (duplicate ISBN, wrong book linked) are high priority and escalated to the production team, with a 48-hour resolution timeline.',
    ],
  },
  metadata: {
    title: 'Metadata updates',
    text: [
      'Book metadata (description, author bio, keywords) can be updated after a book is live, via the dashboard or by emailing the BookLeaf team.',
      'Changes typically reflect on retail platforms within 3-5 business days.',
    ],
  },
  printing: {
    title: 'Printing and quality',
    text: [
      'In-house printing handles most orders; overflow or special formats go to Repro India or Epitome Books.',
      'Standard print turnaround is 5-7 business days from order confirmation.',
      'For quality issues (misprints, binding defects, colour inconsistency) BookLeaf arranges a free reprint after verification. The author may need to share photos of the defective copy.',
    ],
  },
  distribution: {
    title: 'Distribution and availability',
    text: [
      'Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.',
      'New listings typically go live within 7-10 business days after publication is complete.',
      "A book showing as unavailable on a platform usually indicates a stock sync issue; BookLeaf's team can trigger a re-sync, which takes 24-48 hours.",
    ],
  },
  production: {
    title: 'Production stages',
    text: [
      'Stages: Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.',
      'Authors are updated by email at each stage.',
      'Delays usually happen at Cover Design (waiting for author approval) and Proofreading (revision rounds). Frame such delays collaboratively, never as the author\'s fault.',
    ],
  },
};

// How a BookLeaf rep is expected to answer each kind of query (from the brief's
// sample table). One example is injected per draft to calibrate tone and content.
const RESPONSE_GUIDES = {
  'Royalty & Payments':
    'Acknowledge the frustration. Explain the quarterly cycle and 45-day payout window using the computed dates in FACTS. Ask the author to confirm bank details are linked. If the payout is genuinely overdue, own it and escalate to finance with a 48-hour timeline. If the question is about a low amount, explain the net profit calculation and offer a line-by-line breakdown without being defensive.',
  'ISBN & Metadata Issues':
    'Treat as high priority. Acknowledge this is a serious data issue and that it is on BookLeaf to fix. Confirm escalation to the production team and give a 48-hour resolution timeline. For simple metadata edits, explain the 3-5 business day update window.',
  'Printing & Quality':
    'Apologise sincerely. Ask for photos of the defective copies. Confirm a free reprint once verified, with a 5-7 business day turnaround.',
  'Distribution & Availability':
    'Explain this is typically a stock sync issue. Confirm a re-sync is being triggered with the distribution team. Set the expectation of 24-48 hours to be live again.',
  'Book Status & Production Updates':
    'Use the actual production status from FACTS. If delayed, be honest about the likely reason (e.g. awaiting proof approval) without blaming the author. Give a specific next step and timeline.',
  'General Inquiry':
    'Answer directly and concisely. If it is a metadata or profile change, explain how to submit it and that changes reflect in 3-5 business days.',
};

const CATEGORY_SECTIONS = {
  'Royalty & Payments': ['royalty'],
  'ISBN & Metadata Issues': ['isbn', 'metadata'],
  'Printing & Quality': ['printing'],
  'Distribution & Availability': ['distribution'],
  'Book Status & Production Updates': ['production'],
  'General Inquiry': ['company', 'metadata'],
};

// Secondary topics: a printing ticket that also mentions royalties gets the
// royalty section too. Capped so prompts stay small.
const KEYWORD_SECTIONS = [
  { section: 'royalty', pattern: /royalt|payout|payment|paid|earning|bank|₹|\brs\.?\b|inr/i },
  { section: 'isbn', pattern: /isbn|barcode|imprint/i },
  { section: 'printing', pattern: /print|misprint|binding|blur|smudge|author cop/i },
  { section: 'distribution', pattern: /amazon|flipkart|unavailable|out of stock|listing|store/i },
  { section: 'production', pattern: /typeset|proof|cover design|production|stage/i },
  { section: 'metadata', pattern: /description|bio|metadata|keywords/i },
];

const MAX_SECTIONS = 3;

function selectSections(category, text = '') {
  const picked = new Set(CATEGORY_SECTIONS[category] || CATEGORY_SECTIONS['General Inquiry']);
  for (const { section, pattern } of KEYWORD_SECTIONS) {
    if (picked.size >= MAX_SECTIONS) break;
    if (pattern.test(text)) picked.add(section);
  }
  return [...picked];
}

function renderSections(keys) {
  return keys
    .map((key) => {
      const s = SECTIONS[key];
      return `## ${s.title}\n${s.text.map((line) => `- ${line}`).join('\n')}`;
    })
    .join('\n\n');
}

module.exports = { SECTIONS, RESPONSE_GUIDES, selectSections, renderSections };
