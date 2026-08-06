import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const tenants = await prisma.tenant.findMany({
      where: { orgId: session.orgId },
      include: { flat: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(tenants);
  }

  if (req.method === 'POST') {
    const { name, flatId, room, phone, rent, serviceCharge, advanceDue, entryDate } = req.body || {};
    if (!name) return res.status(400).json({ error: 'টেনেন্টের নাম দিন' });

    if (flatId) {
      const flat = await prisma.flat.findFirst({ where: { id: flatId, orgId: session.orgId } });
      if (!flat) return res.status(400).json({ error: 'ফ্ল্যাট পাওয়া যায়নি' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        orgId: session.orgId,
        flatId: flatId || null,
        name,
        room: room || null,
        phone: phone || null,
        rent: Number(rent) || 0,
        serviceCharge: Number(serviceCharge) || 0,
        advanceDue: Number(advanceDue) || 0,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        status: 'Active',
      },
    });
    return res.status(200).json(tenant);
  }

  res.status(405).end();
}
