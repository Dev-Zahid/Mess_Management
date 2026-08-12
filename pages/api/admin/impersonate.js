import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { createSession } from '../../../lib/auth';
import { logAdminAction } from '../../../lib/audit';

// Starts a session AS the org's Owner, so the Super Admin lands in that
// customer's real dashboard to debug/support them — every use is logged.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });
  const admin = result.user;

  const { orgId } = req.body || {};
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Not found' });

  const owner = await prisma.user.findFirst({
    where: { orgId, role: { in: ['Owner', 'Admin'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) return res.status(404).json({ error: 'এই org-এর কোনো Owner পাওয়া যায়নি' });

  await logAdminAction(admin, 'impersonate', org, `as ${owner.name} (${owner.phone})`);

  // Note: this REPLACES the Super Admin's own session cookie. They'll need
  // to log back in at /login with their own phone+PIN afterwards to return
  // to /admin — that friction is intentional so impersonation is never
  // accidentally left active.
  createSession(res, owner);
  return res.status(200).json({ ok: true });
}
