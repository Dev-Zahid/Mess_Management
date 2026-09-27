import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });

  const pendingPayments = await prisma.paymentSubmission.findMany({
    where: { status: 'pending' },
    include: { org: true },
    orderBy: { submittedAt: 'asc' },
  });

  return res.status(200).json(
    pendingPayments.map((p) => ({
      id: p.id,
      orgName: p.org.name,
      method: p.method,
      senderNumber: p.senderNumber,
      trxId: p.trxId,
      amount: p.amount,
      planApplied: p.planApplied,
      submittedAt: p.submittedAt,
    }))
  );
});
