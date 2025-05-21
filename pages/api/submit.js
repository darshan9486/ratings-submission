import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, ratings } = req.body;
  if (!name || !email || !ratings || !Array.isArray(ratings) || ratings.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Format the ratings for email
  const ratingsTable = ratings.map(r =>
    `${r.symbol}: ${r.selectedRating} (Consensus: ${r.consensusRating}, Credora: ${r.credoraRating})`
  ).join('\n');

  const message = `Reviewer: ${name} (${email})\n\nRatings:\n${ratingsTable}`;

  try {
    await resend.emails.send({
      from: 'ratings-form@resend.dev',
      to: 'darshan@credora.io',
      subject: 'New Asset Ratings Submission',
      text: message,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 