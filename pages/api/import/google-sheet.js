import { getSession, effectiveOrgStatus } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { fetchGoogleSheetRawRows } from '../../../lib/google-sheets-fetch';
import { validateImportData } from '../../../lib/import-shared';
import { commitImport } from '../../../lib/import-processor';
import { withJsonErrors } from '../../../lib/api-wrapper';

export default withJsonErrors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  // Bulk import can create/overwrite Flats, Tenants and payments across the
  // whole org — Admin/Owner only, regardless of any Management permission
  // toggles (those govern individual resources, not a bulk-overwrite tool).
  const me = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!me || me.orgId !== session.orgId || (me.role !== 'Owner' && me.role !== 'Admin')) {
    return res.status(403).json({ error: 'শুধু Admin এই কাজটি করতে পারবেন।' });
  }

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return res.status(401).json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' });
  const status = effectiveOrgStatus(org);
  if (status === 'expired' || status === 'suspended') {
    return res.status(402).json({ error: 'সাবস্ক্রিপশন মেয়াদোত্তীর্ণ' });
  }

  const { sheetUrl, mode } = req.body || {};
  if (!sheetUrl) return res.status(400).json({ error: 'Google Sheet-এর লিংক দিন' });

  let rawRows, foundSheets;
  try {
    ({ rawRows, foundSheets } = await fetchGoogleSheetRawRows(sheetUrl));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const parsed = validateImportData(rawRows, foundSheets);

  if ((mode || 'preview') === 'preview') {
    return res.status(200).json({ ...parsed, foundSheets });
  }

  if (parsed.errors.length > 0) {
    return res.status(400).json({ error: 'এখনো কিছু ভুল আছে — আগে ঠিক করুন', errors: parsed.errors });
  }

  try {
    const result = await commitImport(session.orgId, parsed);
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error('Google Sheet import commit error:', e);
    return res.status(500).json({ error: 'ইমপোর্ট করতে সমস্যা হয়েছে: ' + e.message });
  }
});
