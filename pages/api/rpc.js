import { getSession, effectiveOrgStatus } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { handlers } from '../../lib/rpc-handlers';
import { withJsonErrors } from '../../lib/api-wrapper';

export default withJsonErrors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSession(req);
  if (!session || !session.orgId) return res.status(401).json({ error: 'লগইন করুন' });

  // Re-check subscription status server-side on every call — never trust
  // the client to have honoured the /billing redirect.
  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return res.status(401).json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' });
  const status = effectiveOrgStatus(org);
  if (status === 'expired' || status === 'suspended') {
    return res.status(402).json({ error: 'সাবস্ক্রিপশন মেয়াদোত্তীর্ণ — বিলিং পেজে গিয়ে রিনিউ করুন।' });
  }

  const { fn, args } = req.body || {};
  const fnHandler = handlers[fn];
  if (!fnHandler) {
    return res.status(400).json({ error: `Unknown function: ${fn}` });
  }

  try {
    const result = await fnHandler(session, ...(Array.isArray(args) ? args : []));
    return res.status(200).json(result);
  } catch (e) {
    console.error(`RPC error in ${fn}:`, e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});
