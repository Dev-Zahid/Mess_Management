import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { effectiveOrgStatus } from '../../../lib/auth';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });

  const { q, status } = req.query;

  const orgs = await prisma.organization.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: String(q), mode: 'insensitive' } },
            { ownerName: { contains: String(q), mode: 'insensitive' } },
            { ownerPhone: { contains: String(q) } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });

  let mapped = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    ownerName: o.ownerName,
    ownerPhone: o.ownerPhone,
    status: effectiveOrgStatus(o),
    plan: o.plan,
    createdAt: o.createdAt,
    trialEndsAt: o.trialEndsAt,
    subscriptionEndsAt: o.subscriptionEndsAt,
    adminNotes: o.adminNotes,
  }));

  if (status && status !== 'all') {
    mapped = mapped.filter((o) => o.status === status);
  }

  return res.status(200).json(mapped);
});
