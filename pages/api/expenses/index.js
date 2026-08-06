import { prisma } from '../../../lib/db';
import { requireApiSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const expenses = await prisma.expense.findMany({
      where: { orgId: session.orgId },
      orderBy: { date: 'desc' },
    });
    return res.status(200).json(expenses);
  }

  if (req.method === 'POST') {
    const { title, amount, source, date } = req.body || {};
    if (!title || amount === undefined) return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    const expense = await prisma.expense.create({
      data: {
        orgId: session.orgId,
        title,
        amount: Number(amount),
        source: source || 'General',
        date: date ? new Date(date) : new Date(),
      },
    });
    return res.status(200).json(expense);
  }

  res.status(405).end();
}
