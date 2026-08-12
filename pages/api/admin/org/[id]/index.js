import { prisma } from '../../../../../lib/db';
import { requireSuperAdmin } from '../../../../../lib/guard';
import { effectiveOrgStatus } from '../../../../../lib/auth';
import { logAdminAction } from '../../../../../lib/audit';

export default async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });
  const admin = result.user;

  const { id } = req.query;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return res.status(404).json({ error: 'Not found' });

  if (req.method === 'GET') {
    const [payments, users, auditLog] = await Promise.all([
      prisma.paymentSubmission.findMany({ where: { orgId: id }, orderBy: { submittedAt: 'desc' } }),
      prisma.user.findMany({ where: { orgId: id } }),
      prisma.auditLog.findMany({ where: { targetOrgId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return res.status(200).json({
      org: { ...org, status: effectiveOrgStatus(org) },
      payments,
      users: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt })),
      auditLog,
    });
  }

  if (req.method === 'PATCH') {
    const { action, days, plan, reason, note } = req.body || {};

    if (action === 'extend') {
      const base = org.subscriptionEndsAt && org.subscriptionEndsAt > new Date() ? org.subscriptionEndsAt : new Date();
      const subscriptionEndsAt = new Date(base.getTime() + Number(days) * 24 * 60 * 60 * 1000);
      await prisma.organization.update({ where: { id }, data: { status: 'active', subscriptionEndsAt } });
      await logAdminAction(admin, 'extend_subscription', org, `+${days} days -> ${subscriptionEndsAt.toISOString().slice(0, 10)}`);
      return res.status(200).json({ success: true, message: `${days} দিন বাড়ানো হয়েছে` });
    }

    if (action === 'suspend') {
      await prisma.organization.update({ where: { id }, data: { status: 'suspended', suspendReason: reason || '' } });
      await logAdminAction(admin, 'suspend_org', org, reason || '');
      return res.status(200).json({ success: true, message: 'Suspended' });
    }

    if (action === 'reactivate') {
      const now = new Date();
      const hasActiveSub = org.subscriptionEndsAt && org.subscriptionEndsAt > now;
      const hasActiveTrial = org.trialEndsAt && org.trialEndsAt > now;
      const newStatus = hasActiveSub ? 'active' : hasActiveTrial ? 'trial' : 'expired';
      await prisma.organization.update({ where: { id }, data: { status: newStatus, suspendReason: null } });
      await logAdminAction(admin, 'reactivate_org', org, `-> ${newStatus}`);
      const msg = newStatus === 'expired'
        ? 'Reactivated, কিন্তু trial/subscription মেয়াদ আগেই শেষ — কাস্টমার এখনো locked থাকবে যতক্ষণ না আপনি দিন বাড়ান'
        : 'Reactivated';
      return res.status(200).json({ success: true, message: msg });
    }

    if (action === 'change_plan') {
      await prisma.organization.update({ where: { id }, data: { plan, maxFlats: plan === 'yearly' ? 10 : org.maxFlats } });
      await logAdminAction(admin, 'change_plan', org, plan);
      return res.status(200).json({ success: true, message: 'Plan updated' });
    }

    if (action === 'set_note') {
      await prisma.organization.update({ where: { id }, data: { adminNotes: note || '' } });
      await logAdminAction(admin, 'update_note', org, '');
      return res.status(200).json({ success: true, message: 'Note saved' });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).end();
}
