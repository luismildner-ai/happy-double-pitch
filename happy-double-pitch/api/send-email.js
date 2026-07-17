import { Resend } from 'resend';

const TO_ADDRESS = 'schulz@denkRIESEN.com';
// Resend's shared test sender — works without verifying a domain. Once
// denkriesen.com is verified in the Resend dashboard, swap this for
// something like 'Happy Double <pitch@denkriesen.com>'.
const FROM_ADDRESS = 'Happy Double Pitch Site <onboarding@resend.dev>';

const MAX_LEN = { name: 200, email: 320, message: 5000 };

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, email, message } = req.body ?? {};

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !message.trim()
  ) {
    return res.status(400).json({ ok: false, error: 'Name, email, and message are all required.' });
  }
  if (!isValidEmail(email.trim())) {
    return res.status(400).json({ ok: false, error: 'That email address doesn’t look valid.' });
  }
  if (name.length > MAX_LEN.name || email.length > MAX_LEN.email || message.length > MAX_LEN.message) {
    return res.status(400).json({ ok: false, error: 'One of the fields is too long.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ ok: false, error: 'Email service is not configured.' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: TO_ADDRESS,
      replyTo: email.trim(),
      subject: `Happy Double — sample / playtest request from ${name.trim()}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({ ok: false, error: 'The email service rejected the message.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-email failed:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong sending the message.' });
  }
}
