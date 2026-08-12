// Ported from Code.gs `genId(prefix, ids)` — finds the highest existing
// numeric suffix among ids that start with `prefix` and returns the next
// one, zero-padded to 3 digits (e.g. "F001", "F002", ...).
function S(v) {
  return String(v || '').trim();
}

export function genId(prefix, ids) {
  const nums = ids.map((x) => parseInt(S(x).replace(prefix, ''), 10) || 0);
  const max = nums.length ? Math.max(0, ...nums) : 0;
  return prefix + String(max + 1).padStart(3, '0');
}

export function N(v) {
  return Number(v) || 0;
}
