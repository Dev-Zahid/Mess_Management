import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { logAdminAction } from '../../../lib/audit';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });
  const admin = result.user;

  if (req.method === 'GET') {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json(coupons);
  }

  if (req.method === 'POST') {
    const { code, percentOff, flatOff, maxUses, expiresAt } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Code দিন' });
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ error: 'এই code আগেই আছে' });

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        percentOff: Number(percentOff) || 0,
        flatOff: Number(flatOff) || 0,
        maxUses: Number(maxUses) || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    await logAdminAction(admin, 'create_coupon', null, coupon.code);
    return res.status(200).json(coupon);
  }

  if (req.method === 'PATCH') {
    const { id, active } = req.body || {};
    const coupon = await prisma.coupon.update({ where: { id }, data: { active } });
    await logAdminAction(admin, active ? 'activate_coupon' : 'deactivate_coupon', null, coupon.code);
    return res.status(200).json(coupon);
  }

  res.status(405).end();
});
