const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const config = require('../config/config');
const BOOKLEAF_KNOWLEDGE_BASE = require('./knowledgeBase');
const {
  buildClassificationPrompt,
  buildPriorityPrompt,
  buildDraftResponsePrompt,
} = require('./promptTemplates');

// Initialize AI clients conditionally
let geminiClient = null;
if (config.geminiApiKey) {
  try {
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  } catch (err) {
    console.warn('⚠️ Gemini Client init error:', err.message);
  }
}

let openaiClient = null;
if (config.openaiApiKey) {
  try {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  } catch (err) {
    console.warn('⚠️ OpenAI Client init error:', err.message);
  }
}

/**
 * Intelligent Local Knowledge Base & Policy Fallback Engine
 * Produces accurate, high-fidelity BookLeaf classifications, priorities,
 * and responses even when offline or without an active paid API key.
 */
class BookLeafRuleEngine {
  static classify(subject = '', description = '') {
    const text = `${subject} ${description}`.toLowerCase();

    if (
      text.includes('royalt') ||
      text.includes('payout') ||
      text.includes('payment') ||
      text.includes('earning') ||
      text.includes('bank') ||
      text.includes('money') ||
      text.includes('cheque')
    ) {
      return {
        category: 'Royalty & Payments',
        confidence: 0.96,
        reasoning: 'Author inquiry directly pertains to book sales royalties, payment schedules, or payout thresholds.',
      };
    }

    if (
      text.includes('isbn') ||
      text.includes('barcode') ||
      text.includes('imprint') ||
      text.includes('metadata') ||
      text.includes('wrong book') ||
      text.includes('mismatch')
    ) {
      return {
        category: 'ISBN & Metadata Issues',
        confidence: 0.94,
        reasoning: 'Inquiry flags an issue with ISBN assignment, barcode, or platform metadata discrepancy.',
      };
    }

    if (
      text.includes('print') ||
      text.includes('quality') ||
      text.includes('misprint') ||
      text.includes('blur') ||
      text.includes('binding') ||
      text.includes('author copy') ||
      text.includes('author copies') ||
      text.includes('page') ||
      text.includes('paper')
    ) {
      return {
        category: 'Printing & Quality',
        confidence: 0.95,
        reasoning: 'Author is reporting physical print defects or inquiring about print partner turnaround.',
      };
    }

    if (
      text.includes('amazon') ||
      text.includes('flipkart') ||
      text.includes('unavailable') ||
      text.includes('out of stock') ||
      text.includes('buy') ||
      text.includes('distribut') ||
      text.includes('listing')
    ) {
      return {
        category: 'Distribution & Availability',
        confidence: 0.93,
        reasoning: 'Inquiry regards listing status or stock availability on retail partner platforms.',
      };
    }

    if (
      text.includes('production') ||
      text.includes('typeset') ||
      text.includes('proof') ||
      text.includes('cover') ||
      text.includes('stage') ||
      text.includes('delay') ||
      text.includes('when will') ||
      text.includes('status')
    ) {
      return {
        category: 'Book Status & Production Updates',
        confidence: 0.92,
        reasoning: 'Inquiry relates to manuscript progress across pre-publication production milestones.',
      };
    }

    return {
      category: 'General Inquiry',
      confidence: 0.85,
      reasoning: 'General account, marketing, or general publishing inquiry.',
    };
  }

  static calculatePriority(subject = '', description = '', category = '', book = null) {
    const text = `${subject} ${description}`.toLowerCase();

    // Critical priority scenarios:
    if (
      category === 'ISBN & Metadata Issues' ||
      text.includes('wrong book') ||
      text.includes('different isbn') ||
      text.includes('legal') ||
      (text.includes('royalt') && (text.includes('6 months') || text.includes('months ago') || text.includes('fraud') || text.includes('never received')))
    ) {
      return {
        priority: 'Critical',
        confidence: 0.95,
        reasoning: 'Critical business/catalog integrity issue requiring immediate 48-hour resolution or severe overdue payment grievance.',
      };
    }

    // High priority scenarios:
    if (
      category === 'Printing & Quality' ||
      text.includes('terrible') ||
      text.includes('damaged') ||
      text.includes('misprint') ||
      text.includes('unpaid') ||
      (book && book.royalty_pending > 3000)
    ) {
      return {
        priority: 'High',
        confidence: 0.92,
        reasoning: 'High-impact physical defect requiring reprint verification or substantial pending royalty balance.',
      };
    }

    // Low priority scenarios:
    if (
      category === 'General Inquiry' ||
      text.includes('update bio') ||
      text.includes('author bio') ||
      text.includes('marketing advice') ||
      text.includes('cover description')
    ) {
      return {
        priority: 'Low',
        confidence: 0.90,
        reasoning: 'Standard non-urgent inquiry or minor metadata update request.',
      };
    }

    // Default medium
    return {
      priority: 'Medium',
      confidence: 0.88,
      reasoning: 'Standard operational query with typical 24-48 hour response expectation.',
    };
  }

  static generateReplyDraft(ticket, author, book) {
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    const authorFirstName = author?.name?.split(' ')[0] || 'Author';
    const bookTitle = book?.title ? `"${book.title}"` : 'your book';

    let body = '';
    const policies = [];

    if (ticket.category === 'Royalty & Payments' || text.includes('royalt') || text.includes('payment')) {
      policies.push('80/20 Net Profit Policy', 'Quarterly Payout Window (45 days)', '₹1,000 Minimum Threshold');
      const pendingAmount = book?.royalty_pending ?? 0;
      const totalEarned = book?.total_royalty_earned ?? 0;
      const soldCopies = book?.total_copies_sold ?? 0;

      if (text.includes('low') || text.includes('sold')) {
        body = `Dear ${authorFirstName},

Thank you for reaching out to us regarding your royalty figures for ${bookTitle}. I understand how important it is to have total transparency about your earnings.

At BookLeaf, royalties follow an 80/20 split based on net profit:
• 80% of net profit goes directly to you as the author.
• Net profit is calculated as the Book MRP minus the print production cost, marketplace distribution commission (Amazon/Flipkart), and shipping charges.

According to our verified records for ${bookTitle}:
• Total Copies Sold: ${soldCopies}
• Total Royalty Earned to Date: ₹${totalEarned.toLocaleString('en-IN')}
• Royalty Already Disbursed: ₹${(book?.royalty_paid ?? 0).toLocaleString('en-IN')}
• Current Pending Royalty: ₹${pendingAmount.toLocaleString('en-IN')}

We will gladly share a detailed, line-by-line marketplace sales report for your review. Please confirm if your bank account details in your dashboard are up to date so our finance team can review the upcoming disbursement batch.`;
      } else {
        body = `Dear ${authorFirstName},

Thank you for contacting us regarding your royalty payout for ${bookTitle}. I sincerely acknowledge your concern and understand your eagerness to receive your earnings.

To provide clear visibility into how payouts work at BookLeaf:
• Royalties are calculated on a quarterly cycle and disbursed within 45 days following the close of each quarter.
• Our minimum payout threshold is ₹1,000. Any balance below ₹1,000 automatically rolls over to the next payout cycle.

For ${bookTitle}, your current pending royalty balance is ₹${pendingAmount.toLocaleString('en-IN')}. 

I have escalated your account to our accounts team for an expedited audit. We will follow up with a concrete update within 48 hours. In the meantime, please verify that your bank IFSC and account details are correctly linked in your author profile.`;
      }
    } else if (ticket.category === 'ISBN & Metadata Issues' || text.includes('isbn')) {
      policies.push('ISBN Assignment & Imprint Policy', '48-Hour Production Escalation');
      body = `Dear ${authorFirstName},

Thank you for bringing this to our attention immediately. We treat any ISBN or metadata discrepancy with the highest priority, as catalog accuracy across marketplace platforms is paramount.

We have initiated an immediate audit with our Production & Metadata team regarding ${bookTitle} (registered under ISBN: ${book?.isbn || 'BookLeaf Imprint'}).

Our technical operations team will coordinate directly with the retail platforms (Amazon/Flipkart) to verify and correct any mismatched data. We have assigned this a 48-hour resolution timeline, and I will personally notify you as soon as the correction has been verified.`;
    } else if (ticket.category === 'Printing & Quality' || text.includes('defect') || text.includes('print')) {
      policies.push('Printing Quality Guarantee', 'Free Defect Replacement Policy');
      body = `Dear ${authorFirstName},

I am truly sorry to hear that the print copies of ${bookTitle} did not meet our high production standards. You take great pride in your book, and we want every copy to reflect the exact craftsmanship you expect.

Under BookLeaf's Quality Guarantee, whenever a printing or binding defect occurs, we arrange a 100% FREE reprint after photo verification.

Could you please reply with 2–3 clear photos showing the affected pages, cover, or binding? As soon as our quality control team inspects the photos, we will approve a fresh print run with our facility (standard reprint turnaround is 5–7 business days).`;
    } else if (ticket.category === 'Distribution & Availability' || text.includes('unavailable') || text.includes('amazon')) {
      policies.push('Distribution Stock Re-Sync Policy', '24-48h SLA');
      body = `Dear ${authorFirstName},

Thank you for alerting us about the listing status for ${bookTitle}. 

When a published book temporarily appears as "Currently Unavailable" or out of stock on Amazon or Flipkart, it usually signifies a marketplace inventory feed sync delay rather than an actual printing shortage.

I have already triggered a manual inventory and stock re-sync with our distribution partner. The marketplace catalog algorithms typically update stock feeds within 24 to 48 hours. I will monitor this listing closely and confirm once it is live and purchasable again.`;
    } else if (ticket.category === 'Book Status & Production Updates' || text.includes('typeset') || text.includes('status')) {
      policies.push('Production Stages Transparency Policy');
      body = `Dear ${authorFirstName},

Thank you for checking in on the publication progress for ${bookTitle}. 

Your book is currently in the "${book?.status || 'In Production'}" stage of our publishing pipeline. We take meticulous care during cover design, typesetting, and proofing to ensure your book looks flawless on physical shelves.

I have reached out to your dedicated production coordinator to check if any author approvals (such as cover proofs or layout revisions) are currently pending, and I will share an updated milestone timeline with you within 24 business hours.`;
    } else {
      policies.push('Standard Author Support Guidelines');
      body = `Dear ${authorFirstName},

Thank you for reaching out to BookLeaf Publishing. We have received your query regarding "${ticket.subject}".

Our author support team is currently reviewing your request. For standard inquiries, our team responds with comprehensive details within 24 to 48 business hours. If your request pertains to book description updates on retail channels, please note that platforms typically reflect revisions within 3 to 5 business days.

Warm regards,
BookLeaf Author Support Team`;
    }

    return {
      draft: body,
      modelUsed: 'bookleaf-kb-rule-engine-v1',
      tokensEstimated: 320,
      policiesApplied: policies,
      source: 'bookleaf-kb-engine',
    };
  }
}

/**
 * AI Service Class: Orchestrates Gemini, OpenAI, or Fallback Engine
 */
class AIService {
  /**
   * 1. Auto-Classification
   */
  async classifyTicket({ subject, description, bookTitle }) {
    // Check if Gemini is configured and requested
    if (config.geminiApiKey && geminiClient) {
      try {
        const model = geminiClient.getGenerativeModel({ model: config.geminiModel });
        const prompt = buildClassificationPrompt({ subject, description, bookTitle });
        
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 8000)),
        ]);
        
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            category: parsed.category || 'General Inquiry',
            confidence: parsed.confidence || 0.9,
            reasoning: parsed.reasoning || 'Classified via Gemini AI',
            source: 'gemini',
          };
        }
      } catch (err) {
        console.warn('⚠️ Gemini classification failed, falling back:', err.message);
      }
    }

    // Check if OpenAI is configured and requested
    if (config.openaiApiKey && openaiClient) {
      try {
        const prompt = buildClassificationPrompt({ subject, description, bookTitle });
        const response = await Promise.race([
          openaiClient.chat.completions.create({
            model: config.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 8000)),
        ]);
        const parsed = JSON.parse(response.choices[0].message.content);
        return {
          category: parsed.category || 'General Inquiry',
          confidence: parsed.confidence || 0.9,
          reasoning: parsed.reasoning || 'Classified via OpenAI',
          source: 'openai',
        };
      } catch (err) {
        console.warn('⚠️ OpenAI classification failed, falling back:', err.message);
      }
    }

    // Fallback Rule Engine
    const ruleResult = BookLeafRuleEngine.classify(subject, description);
    return {
      ...ruleResult,
      source: 'bookleaf-kb-engine',
    };
  }

  /**
   * 2. Priority Scoring
   */
  async calculatePriority({ subject, description, category, authorContext, bookContext }) {
    if (config.geminiApiKey && geminiClient) {
      try {
        const model = geminiClient.getGenerativeModel({ model: config.geminiModel });
        const prompt = buildPriorityPrompt({
          subject,
          description,
          category,
          authorContext,
          bookContext,
        });

        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 8000)),
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            priority: parsed.priority || 'Medium',
            confidence: parsed.confidence || 0.88,
            reasoning: parsed.reasoning || 'Priority calculated via Gemini AI',
            source: 'gemini',
          };
        }
      } catch (err) {
        console.warn('⚠️ Gemini priority calculation failed, falling back:', err.message);
      }
    }

    if (config.openaiApiKey && openaiClient) {
      try {
        const prompt = buildPriorityPrompt({
          subject,
          description,
          category,
          authorContext,
          bookContext,
        });
        const response = await Promise.race([
          openaiClient.chat.completions.create({
            model: config.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 8000)),
        ]);
        const parsed = JSON.parse(response.choices[0].message.content);
        return {
          priority: parsed.priority || 'Medium',
          confidence: parsed.confidence || 0.88,
          reasoning: parsed.reasoning || 'Priority calculated via OpenAI',
          source: 'openai',
        };
      } catch (err) {
        console.warn('⚠️ OpenAI priority calculation failed, falling back:', err.message);
      }
    }

    const fallbackResult = BookLeafRuleEngine.calculatePriority(subject, description, category, bookContext);
    return {
      ...fallbackResult,
      source: 'bookleaf-kb-engine',
    };
  }

  /**
   * 3. AI-Drafted Response
   */
  async generateReplyDraft({ ticket, author, book, conversationHistory = [] }) {
    if (config.geminiApiKey && geminiClient) {
      try {
        const model = geminiClient.getGenerativeModel({ model: config.geminiModel });
        const prompt = buildDraftResponsePrompt({ ticket, author, book, conversationHistory });

        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 10000)),
        ]);

        const draft = result.response.text().trim();
        return {
          draft,
          modelUsed: config.geminiModel,
          tokensEstimated: Math.round(draft.length / 4) + 250,
          policiesApplied: ['BookLeaf Tone Guidelines', 'Targeted Knowledge Base Injection'],
          source: 'gemini',
        };
      } catch (err) {
        console.warn('⚠️ Gemini response draft failed, falling back:', err.message);
      }
    }

    if (config.openaiApiKey && openaiClient) {
      try {
        const prompt = buildDraftResponsePrompt({ ticket, author, book, conversationHistory });
        const response = await Promise.race([
          openaiClient.chat.completions.create({
            model: config.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), 10000)),
        ]);
        const draft = response.choices[0].message.content.trim();
        return {
          draft,
          modelUsed: config.openaiModel,
          tokensEstimated: response.usage?.total_tokens || 400,
          policiesApplied: ['BookLeaf Tone Guidelines', 'Targeted Knowledge Base Injection'],
          source: 'openai',
        };
      } catch (err) {
        console.warn('⚠️ OpenAI response draft failed, falling back:', err.message);
      }
    }

    return BookLeafRuleEngine.generateReplyDraft(ticket, author, book);
  }
}

module.exports = new AIService();
