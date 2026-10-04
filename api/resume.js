import { get } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let result = null;
  try {
    result = await get('resume.pdf', { access: 'private', useCache: false });
  } catch (e) {
    result = null;
  }
  if (!result || result.statusCode !== 200 || !result.stream) {
    return res.status(404).json({ available: false });
  }
  const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Venga_Muni_Reddy_Resume.pdf"');
  res.setHeader('Content-Length', buf.length);
  return res.status(200).send(buf);
}
