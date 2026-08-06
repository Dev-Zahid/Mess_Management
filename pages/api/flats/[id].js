import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;
  const { id } = req.query;

  // Always re-check orgId ownership before mutating — never trust the id
  // alone, or one customer could edit/delete another customer's data.
  const flat = await prisma.flat.findFirst({ where: { id, orgId: session.orgId } });
  if (!flat) return res.status(404).json({ error: 'পাওয়া যায়নি' });

  if (req.method === 'PUT') {
    const { name, address, totalSeats, flatRent, ownerName, notes } = req.body || {};
    const updated = await prisma.flat.update({
      where: { id },
      data: {
        name: name ?? flat.name,
        address: address ?? flat.address,
        totalSeats: totalSeats !== undefined ? Number(totalSeats) : flat.totalSeats,
        flatRent: flatRent !== undefined ? Number(flatRent) : flat.flatRent,
        ownerName: ownerName ?? flat.ownerName,
        notes: notes ?? flat.notes,
      },
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    await prisma.flat.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
