import fs from 'fs';
import formidable from 'formidable';
import { getSession, effectiveOrgStatus } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { parseWorkbook, commitImport } from '../../../lib/import-processor';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return res.status(401).json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' });
  const status = effectiveOrgStatus(org);
  if (status === 'expired' || status === 'suspended') {
    return res.status(402).json({ error: 'সাবস্ক্রিপশন মেয়াদোত্তীর্ণ' });
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (e) {
    return res.status(400).json({ error: 'ফাইল আপলোড ব্যর্থ হয়েছে: ' + e.message });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'কোনো ফাইল পাওয়া যায়নি' });

  const mode = (Array.isArray(fields.mode) ? fields.mode[0] : fields.mode) || 'preview';

  let buffer;
  try {
    buffer = fs.readFileSync(file.filepath);
  } catch (e) {
    return res.status(400).json({ error: 'ফাইল পড়া যায়নি' });
  }

  let parsed;
  try {
    parsed = parseWorkbook(buffer);
  } catch (e) {
    return res.status(400).json({ error: 'এই ফাইলটা পড়া যায়নি — এটা কি .xlsx ফরম্যাটে আছে? Error: ' + e.message });
  }

  if (mode === 'preview') {
    return res.status(200).json(parsed);
  }

  if (parsed.errors.length > 0) {
    return res.status(400).json({ error: 'এখনো কিছু ভুল আছে — আগে ঠিক করুন', errors: parsed.errors });
  }

  try {
    const result = await commitImport(session.orgId, parsed);
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error('Import commit error:', e);
    return res.status(500).json({ error: 'ইমপোর্ট করতে সমস্যা হয়েছে: ' + e.message });
  }
}
