import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const payments = await prisma.rentPayment.findMany({
      where: { orgId: session.orgId },
      include: { tenant: true },
      orderBy: { date: 'desc' },
    });
    return res.status(200).json(payments);
  }

  if (req.method === 'POST') {
    const { tenantId, month, year, paid } = req.body || {};
    if (!tenantId || !month || !year || paid === undefined) {
      return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    }
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, orgId: session.orgId } });
    if (!tenant) return res.status(400).json({ error: 'টেনেন্ট পাওয়া যায়নি' });

    const payment = await prisma.rentPayment.create({
      data: {
        orgId: session.orgId,
        tenantId,
        flatId: tenant.flatId,
        month,
        year: Number(year),
        paid: Number(paid),
      },
    });
    return res.status(200).json(payment);
  }

  res.status(405).end();
}
