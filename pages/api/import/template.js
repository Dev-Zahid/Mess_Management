import { getSession } from '../../../lib/auth';
import { buildImportTemplate } from '../../../lib/import-template';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  const buffer = buildImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="mess-manager-import-template.xlsx"');
  return res.status(200).send(buffer);
}
