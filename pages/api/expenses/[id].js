import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;
  const { id } = req.query;

  const expense = await prisma.expense.findFirst({ where: { id, orgId: session.orgId } });
  if (!expense) return res.status(404).json({ error: 'পাওয়া যায়নি' });

  if (req.method === 'DELETE') {
    await prisma.expense.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
