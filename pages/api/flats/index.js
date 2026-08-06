import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const flats = await prisma.flat.findMany({
      where: { orgId: session.orgId },
      include: { tenants: { where: { status: 'Active' } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json(flats);
  }

  if (req.method === 'POST') {
    const { name, address, totalSeats, flatRent, ownerName, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'ফ্ল্যাটের নাম দিন' });
    const flat = await prisma.flat.create({
      data: {
        orgId: session.orgId,
        name,
        address: address || null,
        totalSeats: Number(totalSeats) || 0,
        flatRent: Number(flatRent) || 0,
        ownerName: ownerName || null,
        notes: notes || null,
      },
    });
    return res.status(200).json(flat);
  }

  res.status(405).end();
}
