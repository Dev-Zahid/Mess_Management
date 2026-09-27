import { prisma } from '../../../lib/db';
import { verifyPin, createSession } from '../../../lib/auth';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { pin } = req.body || {};
  const phone = String(req.body?.phone || '').trim();
  if (!phone || !pin) return res.status(400).json({ error: 'নম্বর ও PIN দিন' });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(400).json({ error: 'ভুল নম্বর বা PIN' });

  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) return res.status(400).json({ error: 'ভুল নম্বর বা PIN' });

  createSession(res, user);
  return res.status(200).json({ ok: true, role: user.role });
});
