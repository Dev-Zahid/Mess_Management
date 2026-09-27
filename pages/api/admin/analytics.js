import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { effectiveOrgStatus } from '../../../lib/auth';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });

  const allOrgs = await prisma.organization.findMany();
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const statuses = allOrgs.map((o) => effectiveOrgStatus(o));
  const counts = {
    trial: statuses.filter((s) => s === 'trial').length,
    active: statuses.filter((s) => s === 'active').length,
    expired: statuses.filter((s) => s === 'expired').length,
    suspended: statuses.filter((s) => s === 'suspended').length,
  };

  const [revenueThisMonth, revenueLastMonth, revenueAllTime] = await Promise.all([
    prisma.paymentSubmission.aggregate({
      where: { status: 'approved', reviewedAt: { gte: startOfThisMonth } },
      _sum: { amount: true },
    }),
    prisma.paymentSubmission.aggregate({
      where: { status: 'approved', reviewedAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      _sum: { amount: true },
    }),
    prisma.paymentSubmission.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
  ]);

  // Trial-ending-soon: trial orgs with <=3 days left — worth a proactive nudge.
  const trialEndingSoon = allOrgs
    .filter((o) => effectiveOrgStatus(o) === 'trial')
    .map((o) => ({ ...o, daysLeft: Math.ceil((o.trialEndsAt - now) / 86400000) }))
    .filter((o) => o.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map((o) => ({ id: o.id, name: o.name, ownerPhone: o.ownerPhone, daysLeft: o.daysLeft }));

  return res.status(200).json({
    counts,
    totalOrgs: allOrgs.length,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    revenueLastMonth: revenueLastMonth._sum.amount || 0,
    revenueAllTime: revenueAllTime._sum.amount || 0,
    trialEndingSoon,
  });
});
