export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentMonthYear() {
  const d = new Date();
  return { month: MONTHS[d.getMonth()], year: d.getFullYear() };
}

// Ported from the original Google Apps Script `calcCarryFwd`: if a tenant
// overpaid last month, that excess becomes a credit that reduces this
// month's due (instead of just disappearing).
export function calcCarryFwd(tenantId, month, year, allPayments, rent) {
  const mi = MONTHS.indexOf(month);
  if (mi < 0) return 0;
  const prevMonth = MONTHS[mi === 0 ? 11 : mi - 1];
  const prevYear = mi === 0 ? year - 1 : year;

  const prevPays = allPayments.filter(
    (p) => p.tenantId === tenantId && p.month === prevMonth && p.year === prevYear
  );
  const prevPaid = prevPays.reduce((a, p) => a + Number(p.paid), 0);
  const prevCarry = prevPays.length ? calcCarryFwd(tenantId, prevMonth, prevYear, allPayments, rent) : 0;
  const prevEffDue = Math.max(0, rent - prevCarry);
  return Math.max(0, prevPaid - prevEffDue);
}

// Effective due for a tenant in a given month = rent - carry-forward credit - amount already paid this month.
export function effectiveDue(tenant, month, year, allPayments) {
  const carry = calcCarryFwd(tenant.id, month, year, allPayments, tenant.rent);
  const paidThisMonth = allPayments
    .filter((p) => p.tenantId === tenant.id && p.month === month && p.year === year)
    .reduce((a, p) => a + Number(p.paid), 0);
  const due = Math.max(0, tenant.rent - carry - paidThisMonth);
  return { due, carry, paidThisMonth };
}

export function money(n) {
  return '৳' + Number(n || 0).toLocaleString('en-IN');
}
