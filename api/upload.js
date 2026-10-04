import { put } from '@vercel/blob';
import { timingSafeEqual, createHash } from 'node:crypto';

export const config = { api: { bodyParser: false } };

const MAX = 4 * 1024 * 1024;
const sha = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expected = process.env.UPLOAD_CODE;
  if (!expected) return res.status(500).json({ error: 'Upload is not configured' });
  const given = req.headers['x-upload-code'] || '';
  if (!timingSafeEqual(sha(given), sha(expected))) {
    return res.status(401).json({ error: 'Wrong code' });
  }
  if (req.headers['x-check']) return res.status(200).json({ ok: true });
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX) return res.status(413).json({ error: 'File too large (max 4 MB)' });
    chunks.push(c);
  }
  const buf = Buffer.concat(chunks);
  if (buf.length < 100 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return res.status(400).json({ error: 'Only PDF files are accepted' });
  }
  await put('resume.pdf', buf, {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/pdf',
  });
  return res.status(200).json({ ok: true });
}
