import { put, get } from '@vercel/blob';
import { timingSafeEqual, createHash } from 'node:crypto';

const MAX = 4000;
const SEED = [
  'SafeHaven demo logins',
  '',
  'admin@safehaven.demo',
  'ngo@safehaven.demo',
  'volunteer@safehaven.demo',
  '',
  'Password: SafeHaven',
].join('\n');
const sha = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest();

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 20000) return null;
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    let text = SEED;
    try {
      const r = await get('demo.txt', { access: 'private', useCache: false });
      if (r && r.statusCode === 200 && r.stream) {
        text = await new Response(r.stream).text();
      }
    } catch (e) {}
    return res.status(200).json({ text });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expected = process.env.UPLOAD_CODE;
  if (!expected) return res.status(500).json({ error: 'Not configured' });
  if (!timingSafeEqual(sha(req.headers['x-upload-code'] || ''), sha(expected))) {
    return res.status(401).json({ error: 'Wrong code' });
  }
  const raw = await readBody(req);
  if (raw === null) return res.status(413).json({ error: 'Too long' });
  let text;
  try { text = JSON.parse(raw).text; } catch (e) { return res.status(400).json({ error: 'Bad request' }); }
  if (typeof text !== 'string') return res.status(400).json({ error: 'Bad request' });
  text = text.replace(/\r\n/g, '\n').trim();
  if (text.length > MAX) return res.status(413).json({ error: 'Max 4000 characters' });
  await put('demo.txt', text, {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'text/plain; charset=utf-8',
  });
  return res.status(200).json({ ok: true });
}
