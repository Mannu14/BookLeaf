/**
 * BookLeaf Publishing Knowledge Base & Policy Definitions
 * Derived directly from the BookLeaf technical specification (Pages 5-7).
 */

const BOOKLEAF_KNOWLEDGE_BASE = {
  company: {
    name: "BookLeaf Publishing",
    presence: "India and the US",
    monthlyVolume: "1,200+ books monthly across a catalog of 22,000+ titles",
    packages: [
      { name: "Standard Free", description: "No upfront cost, standard publishing" },
      { name: "Bestseller Breakthrough", description: "Premium, paid package with marketing and distribution add-ons" }
    ],
    facilities: "In-house printing facility and central warehouse in Delhi",
    printPartners: ["In-House", "Repro India", "Epitome Books"],
    distributionChannels: ["Amazon India", "Flipkart", "Amazon US", "Amazon UK", "BookLeaf Store"]
  },

  royaltyPolicy: {
    split: "80/20 (80% net profit to Author, 20% to BookLeaf)",
    formula: "Net Profit = MRP - (Printing Cost + Platform Commission [Amazon/Flipkart] + Shipping Charges)",
    cycle: "Calculated quarterly and paid within 45 days of the quarter ending",
    quarterSchedules: [
      { quarter: "Q1 (Jan - Mar)", payoutWindow: "By May 15" },
      { quarter: "Q2 (Apr - Jun)", payoutWindow: "By Aug 15" },
      { quarter: "Q3 (Jul - Sep)", payoutWindow: "By Nov 15" },
      { quarter: "Q4 (Oct - Dec)", payoutWindow: "By Feb 15" }
    ],
    minimumThreshold: 1000, // INR
    thresholdRule: "Minimum payout threshold is ₹1,000. If accumulated royalties are below ₹1,000, they roll over to the next quarter.",
    payoutMethod: "Direct Bank Transfer (NEFT/RTGS/IMPS) to the bank account linked in the author dashboard",
    transparency: "Authors can view detailed royalty breakdown and sales figures per platform directly on their dashboard"
  },

  isbnPolicy: {
    overview: "Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf under BookLeaf's publisher imprint.",
    customImprint: "If an author desires an ISBN under their own imprint, they must obtain it independently.",
    errorHandling: "ISBN errors (duplicate ISBN, wrong book linked on marketplace, metadata mismatch) are treated as High/Critical priority issues, immediately escalated to the Production & Metadata team with a strict 48-hour resolution timeline."
  },

  printingQualityPolicy: {
    facilities: "In-house printing handles most orders; overflow or specialized formats go to Repro India or Epitome Books.",
    turnaround: "5–7 business days from order confirmation to printing completion.",
    defectPolicy: "If an author reports a quality issue (misprints, binding defects, color inconsistency, upside-down pages), BookLeaf arranges a 100% FREE reprint once verified. The author is requested to share clear photos of the defective copy.",
    reprintTimeline: "5–7 business days upon receipt and verification of defect photos."
  },

  distributionPolicy: {
    platforms: ["Amazon India", "Flipkart", "Amazon US", "Amazon UK", "BookLeaf Store"],
    listingGoLive: "New listings typically go live within 7–10 business days after publication is completed.",
    unavailableIssue: "If a published book shows as 'Currently Unavailable' or 'Out of Stock' on Amazon/Flipkart, it indicates a marketplace stock inventory sync lag. BookLeaf operations can trigger an automated stock re-sync with the channel partner within 24–48 hours."
  },

  productionStages: [
    "Manuscript Received",
    "Editing (if opted)",
    "Cover Design",
    "Typesetting",
    "Proofreading",
    "ISBN Assignment",
    "Printing",
    "Distribution Setup",
    "Published & Live"
  ],
  productionDelaysContext: "Delays typically occur at Cover Design (awaiting author feedback/approval) and Proofreading (author revision rounds). Teams should check current status and provide transparent, collaborative timelines.",

  communicationTone: {
    principles: [
      "Always empathetic, respectful, and professional. Authors are creative partners, not support tickets to be managed.",
      "Acknowledge and validate the author's concern first before presenting solutions.",
      "Be specific: provide actual figures, dates, percentages, and statuses rather than vague reassurances.",
      "Direct ownership: If something is on BookLeaf (delayed payment, ISBN glitch), own it immediately without corporate deflection.",
      "Clear commitments: Give clear timelines (e.g. 'Our production team will resolve this within 48 hours') instead of open-ended promises.",
      "Definite next step: Conclude every communication with a precise next step for the author or the BookLeaf operations team."
    ]
  },

  categories: [
    "Royalty & Payments",
    "ISBN & Metadata Issues",
    "Printing & Quality",
    "Distribution & Availability",
    "Book Status & Production Updates",
    "General Inquiry"
  ],

  priorities: ["Critical", "High", "Medium", "Low"]
};

module.exports = BOOKLEAF_KNOWLEDGE_BASE;
