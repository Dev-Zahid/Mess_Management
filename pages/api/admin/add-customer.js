import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { hashPin } from '../../../lib/auth';
import { logAdminAction } from '../../../lib/audit';
import { TRIAL_DAYS } from '../../../lib/plans';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });
  const admin = result.user;

  const { messName, ownerName, pin, trialDays } = req.body || {};
  const phone = String(req.body?.phone || '').trim();
  if (!messName || !ownerName || !phone || !pin) {
    return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
  }
  if (!/^01\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'সঠিক ১১ ডিজিট মোবাইল নম্বর দিন (01XXXXXXXXX)' });
  }
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(400).json({ error: 'এই নম্বর দিয়ে আগেই একটা অ্যাকাউন্ট আছে' });

  const trialEndsAt = new Date(Date.now() + (Number(trialDays) || TRIAL_DAYS) * 24 * 60 * 60 * 1000);
  const org = await prisma.organization.create({
    data: { name: messName, ownerName, ownerPhone: phone, trialEndsAt },
  });
  const pinHash = await hashPin(pin);
  await prisma.user.create({
    data: { orgId: org.id, name: ownerName, phone, pinHash, role: 'Owner' },
  });

  await logAdminAction(admin, 'manual_add_customer', org, `${ownerName} / ${phone}`);
  return res.status(200).json({ success: true, orgId: org.id });
});
