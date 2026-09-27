import { getSession, effectiveOrgStatus } from '../../lib/auth';
import { prisma } from '../../lib/db';

import { withJsonErrors } from '../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return res.status(404).json({ error: 'পাওয়া যায়নি' });

  const status = effectiveOrgStatus(org);
  const daysLeft =
    status === 'trial'
      ? Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / 86400000))
      : status === 'active'
      ? Math.max(0, Math.ceil((new Date(org.subscriptionEndsAt) - new Date()) / 86400000))
      : 0;

  // Also surface the latest active announcement, if any, so the same
  // banner slot can show either a trial nudge or a broadcast message.
  const announcement = await prisma.announcement.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({
    status,
    daysLeft,
    plan: org.plan,
    announcement: announcement ? announcement.message : null,
  });
});
