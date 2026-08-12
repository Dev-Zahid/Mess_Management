export const PERM_RESOURCES = ['tenants', 'flats', 'rent', 'service', 'advance', 'expenses', 'owners', 'investments'];
export const EXPENSE_SOURCES = ['Service Charge', 'Owner Pocket', 'Advance Money'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function normalizeSource(s) {
  const v = String(s || '').trim();
  return EXPENSE_SOURCES.includes(v) ? v : 'Service Charge';
}

// Sensible default for a new Management user: can view+edit day-to-day
// tenant/payment data, cannot delete, and has no access at all to
// Flats-admin / Expenses / Owner Panel / Investments unless the Admin
// explicitly turns those on. (Ported verbatim from Code.gs.)
export function defaultPerms() {
  const p = {};
  PERM_RESOURCES.forEach((r) => (p[r] = { v: false, e: false, d: false }));
  ['tenants', 'rent', 'service', 'advance'].forEach((r) => {
    p[r] = { v: true, e: true, d: false };
  });
  return p;
}

export function normalizePerms(raw) {
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (e) {
    parsed = null;
  }
  const out = defaultPerms();
  if (parsed) {
    PERM_RESOURCES.forEach((r) => {
      if (parsed[r]) out[r] = { v: !!parsed[r].v, e: !!parsed[r].e, d: !!parsed[r].d };
    });
  }
  return out;
}
