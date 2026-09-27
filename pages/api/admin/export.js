import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { effectiveOrgStatus } from '../../../lib/auth';

import { withJsonErrors } from '../../../lib/api-wrapper';
function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  return lines.join('\n');
}

export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });

  const { type } = req.query;

  if (type === 'payments') {
    const payments = await prisma.paymentSubmission.findMany({ include: { org: true }, orderBy: { submittedAt: 'desc' } });
    const rows = payments.map((p) => ({
      date: p.submittedAt.toISOString().slice(0, 10),
      org: p.org.name,
      phone: p.org.ownerPhone,
      method: p.method,
      trxId: p.trxId,
      amount: p.amount,
      plan: p.planApplied,
      status: p.status,
    }));
    const csv = toCsv(rows, ['date', 'org', 'phone', 'method', 'trxId', 'amount', 'plan', 'status']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
    return res.status(200).send(csv);
  }

  // default: customers
  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  const rows = orgs.map((o) => ({
    name: o.name,
    ownerName: o.ownerName,
    phone: o.ownerPhone,
    status: effectiveOrgStatus(o),
    plan: o.plan,
    joined: o.createdAt.toISOString().slice(0, 10),
    trialEndsAt: o.trialEndsAt.toISOString().slice(0, 10),
    subscriptionEndsAt: o.subscriptionEndsAt ? o.subscriptionEndsAt.toISOString().slice(0, 10) : '',
  }));
  const csv = toCsv(rows, ['name', 'ownerName', 'phone', 'status', 'plan', 'joined', 'trialEndsAt', 'subscriptionEndsAt']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  return res.status(200).send(csv);
});
