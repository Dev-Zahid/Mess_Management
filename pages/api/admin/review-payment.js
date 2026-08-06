import { prisma } from '../../../lib/db';
import { getSession } from '../../../lib/auth';
import { PLANS } from '../../../lib/plans';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'লগইন করুন' });

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== 'SuperAdmin') return res.status(403).json({ error: 'অনুমতি নেই' });

  const { paymentId, decision } = req.body || {};
  if (!paymentId || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'ভুল রিকোয়েস্ট' });
  }

  const payment = await prisma.paymentSubmission.findUnique({ where: { id: paymentId }, include: { org: true } });
  if (!payment || payment.status !== 'pending') {
    return res.status(400).json({ error: 'পেমেন্ট পাওয়া যায়নি বা আগেই রিভিউ হয়েছে' });
  }

  if (decision === 'reject') {
    await prisma.paymentSubmission.update({
      where: { id: paymentId },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    return res.status(200).json({ ok: true });
  }

  // Approve: extend subscription from *whichever is later* — now, or the
  // org's current subscriptionEndsAt — so early renewals stack correctly
  // instead of shortening an already-active subscription.
  const plan = PLANS[payment.planApplied] || PLANS.monthly;
  const base = payment.org.subscriptionEndsAt && payment.org.subscriptionEndsAt > new Date()
    ? payment.org.subscriptionEndsAt
    : new Date();
  const subscriptionEndsAt = new Date(base.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.paymentSubmission.update({
      where: { id: paymentId },
      data: { status: 'approved', reviewedAt: new Date() },
    }),
    prisma.organization.update({
      where: { id: payment.orgId },
      data: { status: 'active', plan: payment.planApplied, subscriptionEndsAt },
    }),
  ]);

  return res.status(200).json({ ok: true, orgName: payment.org.name, subscriptionEndsAt: subscriptionEndsAt.toISOString() });
}
