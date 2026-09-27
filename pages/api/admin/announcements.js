import { prisma } from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/guard';
import { logAdminAction } from '../../../lib/audit';

import { withJsonErrors } from '../../../lib/api-wrapper';
export default withJsonErrors(async function handler(req, res) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return res.status(401).json({ error: 'Unauthorized' });
  const admin = result.user;

  if (req.method === 'GET') {
    const list = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    return res.status(200).json(list);
  }

  if (req.method === 'POST') {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'বার্তা দিন' });
    // Only one active announcement at a time — deactivate the rest first.
    await prisma.announcement.updateMany({ where: { active: true }, data: { active: false } });
    const ann = await prisma.announcement.create({ data: { message, active: true } });
    await logAdminAction(admin, 'create_announcement', null, message.slice(0, 80));
    return res.status(200).json(ann);
  }

  if (req.method === 'PATCH') {
    const { id, active } = req.body || {};
    const ann = await prisma.announcement.update({ where: { id }, data: { active } });
    await logAdminAction(admin, active ? 'activate_announcement' : 'deactivate_announcement', null, ann.message.slice(0, 80));
    return res.status(200).json(ann);
  }

  res.status(405).end();
});
