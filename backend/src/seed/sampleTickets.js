// Realistic starter tickets so the admin queue is not empty on first login.
// `ageHours` is relative to seed time, so SLA badges always show up.

module.exports = [
  {
    author_id: 'AUTH002',
    book_id: 'BK004',
    ageHours: 74,
    status: 'Open',
    subject: 'Royalty for Startup Sutra not paid since November',
    description:
      'My dashboard shows Rs 7,744 pending for Startup Sutra, and the last payout I received was on 15 Nov 2025. I have not received anything since, even though the book keeps selling. Can you please check what is holding this up?',
  },
  {
    author_id: 'AUTH006',
    book_id: 'BK010',
    ageHours: 5,
    status: 'Open',
    subject: 'Flipkart listing shows the wrong ISBN for Turban Tales',
    description:
      'A reader told me the Flipkart page for Turban Tales shows a different ISBN (ending 02-8) instead of 978-93-5XXXX-10-3, which is printed on my copies. Some orders seem to be linking to another title.',
  },
  {
    author_id: 'AUTH001',
    book_id: 'BK001',
    ageHours: 30,
    status: 'In Progress',
    replied: true,
    note: 'Asked print floor to pull the batch record for this order. Waiting on photos from the author.',
    subject: 'Author copies arrived with blurry illustrations and loose binding',
    description:
      'I received 10 author copies of Whispers of the Ganges yesterday. In 4 of them the chapter 3 illustration is smudged and the spine glue is coming apart. Could you arrange replacements?',
  },
  {
    author_id: 'AUTH007',
    book_id: 'BK011',
    ageHours: 20,
    status: 'In Progress',
    replied: true,
    note: 'Re-sync triggered with Amazon IN at 11:20. Check listing tomorrow morning.',
    subject: 'The Algorithm of Love shows "Currently Unavailable" on Amazon India',
    description:
      'Since yesterday Amazon India shows my book as Currently Unavailable. Several readers messaged me on Instagram saying they cannot order it.',
  },
  {
    author_id: 'AUTH009',
    book_id: 'BK015',
    ageHours: 52,
    status: 'Open',
    subject: 'Raising Roots has been in typesetting for three weeks',
    description:
      'My book Raising Roots has been in the typesetting stage for about three weeks. Could you tell me when proofreading will start so I can block time to review it?',
  },
  {
    author_id: 'AUTH003',
    book_id: 'BK005',
    ageHours: 8,
    status: 'Open',
    subject: 'No royalty received since publication',
    description:
      'Between Two Temples was published in July 2024 and I have never received a single royalty payment. The dashboard says Rs 2,546 is pending. Is my bank account linked correctly?',
  },
  {
    author_id: 'AUTH005',
    book_id: 'BK009',
    ageHours: 1,
    status: 'Open',
    subject: 'How is the royalty per copy calculated?',
    description:
      'Letters from Lakshadweep has an MRP of Rs 550 but I earn Rs 55 per copy. Could you explain what is deducted so I understand the numbers better?',
  },
  {
    author_id: 'AUTH010',
    book_id: null,
    ageHours: 96,
    status: 'Resolved',
    replied: true,
    subject: 'Updating my author bio on Amazon and the BookLeaf Store',
    description:
      'Can I send an updated author bio and photo to replace the current one on Amazon and the BookLeaf Store?',
  },
];
