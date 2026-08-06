import { prisma } from '../../../lib/db';
import { hashPin, createSession } from '../../../lib/auth';
import { TRIAL_DAYS } from '../../../lib/plans';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { messName, ownerName, phone, pin } = req.body || {};

  if (!messName || !ownerName || !phone || !pin) {
    return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN কমপক্ষে ৪ ডিজিট হতে হবে' });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(400).json({ error: 'এই নম্বর দিয়ে আগেই একটা অ্যাকাউন্ট আছে। লগইন করুন।' });
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const org = await prisma.organization.create({
    data: {
      name: messName,
      ownerName,
      ownerPhone: phone,
      trialEndsAt,
    },
  });

  const pinHash = await hashPin(pin);
  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      name: ownerName,
      phone,
      pinHash,
      role: 'Owner',
    },
  });

  createSession(res, user);
  return res.status(200).json({ ok: true });
}
