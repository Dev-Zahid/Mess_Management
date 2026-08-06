import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;
  const { id } = req.query;

  const tenant = await prisma.tenant.findFirst({ where: { id, orgId: session.orgId } });
  if (!tenant) return res.status(404).json({ error: 'পাওয়া যায়নি' });

  if (req.method === 'PUT') {
    const { name, room, phone, rent, serviceCharge, advanceDue, status, flatId } = req.body || {};
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        name: name ?? tenant.name,
        room: room ?? tenant.room,
        phone: phone ?? tenant.phone,
        rent: rent !== undefined ? Number(rent) : tenant.rent,
        serviceCharge: serviceCharge !== undefined ? Number(serviceCharge) : tenant.serviceCharge,
        advanceDue: advanceDue !== undefined ? Number(advanceDue) : tenant.advanceDue,
        status: status ?? tenant.status,
        flatId: flatId !== undefined ? flatId : tenant.flatId,
        leftDate: status === 'Left' ? new Date() : tenant.leftDate,
      },
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    await prisma.tenant.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
