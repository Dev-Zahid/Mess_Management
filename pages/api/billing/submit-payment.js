import { prisma } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  const { method, senderNumber, trxId, planApplied, amount } = req.body || {};
  if (!method || !senderNumber || !trxId || !planApplied || !amount) {
    return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
  }

  // Prevent duplicate submissions of the exact same TrxID (accidental double-click,
  // or someone re-using an already-verified transaction ID).
  const dup = await prisma.paymentSubmission.findFirst({ where: { trxId } });
  if (dup) return res.status(400).json({ error: 'এই Transaction ID ইতিমধ্যে সাবমিট করা হয়েছে' });

  await prisma.paymentSubmission.create({
    data: {
      orgId: session.orgId,
      method,
      senderNumber,
      trxId,
      amount: Number(amount),
      planApplied,
      status: 'pending',
    },
  });

  return res.status(200).json({ ok: true });
}
