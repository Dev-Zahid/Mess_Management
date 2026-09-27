import { prisma } from '../../../lib/db';
import { getSession } from '../../../lib/auth';
import { PLANS } from '../../../lib/plans';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  const { method, senderNumber, trxId, planApplied } = req.body || {};
  if (!method || !senderNumber || !trxId || !planApplied || !PLANS[planApplied]) {
    return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
  }
  // Price always comes from the server-side plan table, never the client —
  // otherwise a tampered request body could record any amount it likes,
  // corrupting the admin revenue/analytics numbers (approval itself is
  // still manual and keyed off the real TrxID, so this isn't a free-upgrade
  // hole, but the recorded amount should always be trustworthy).
  const amount = PLANS[planApplied].price;

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
      amount,
      planApplied,
      status: 'pending',
    },
  });

  return res.status(200).json({ ok: true });
});
