import { useMemo } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { prisma } from '../../lib/db';
import { currentMonthYear, effectiveDue, money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  const { org } = ctx;
  const { month, year } = currentMonthYear();

  const [tenants, rentPayments, svcPayments] = await Promise.all([
    prisma.tenant.findMany({ where: { orgId: org.id, status: 'Active' }, include: { flat: true } }),
    prisma.rentPayment.findMany({ where: { orgId: org.id } }),
    prisma.serviceCharge.findMany({ where: { orgId: org.id } }),
  ]);

  const payLite = rentPayments.map((p) => ({ tenantId: p.tenantId, month: p.month, year: p.year, paid: p.paid }));

  const rows = tenants.map((t) => {
    const { due: rentDue } = effectiveDue(t, month, year, payLite);
    const svcPaid = svcPayments
      .filter((p) => p.tenantId === t.id && p.month === month && p.year === year)
      .reduce((a, p) => a + p.paid, 0);
    const svcDue = Math.max(0, t.serviceCharge - svcPaid);
    return {
      id: t.id,
      name: t.name,
      flat: t.flat?.name || '—',
      room: t.room || '—',
      phone: t.phone,
      rentDue,
      svcDue,
      totalDue: rentDue + svcDue,
    };
  }).filter((r) => r.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);

  const totalOutstanding = rows.reduce((a, r) => a + r.totalDue, 0);

  return { props: { layoutProps: ctx.layoutProps, rows, totalOutstanding, month, year } };
}

export default function DueTrackerPage({ layoutProps, rows, totalOutstanding, month, year }) {
  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">ডিউ ট্র্যাকার — {month} {year}</div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--rd2)', color: 'var(--rd)' }}>⚠️</div>
          <div><div className="kpi-l">মোট বকেয়া</div><div className="kpi-v">{money(totalOutstanding)}</div></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--pr2)', color: 'var(--pr)' }}>👥</div>
          <div><div className="kpi-l">ডিউ থাকা টেনেন্ট</div><div className="kpi-v">{rows.length}</div></div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {rows.length === 0 && <div className="empty-state">🎉 কোনো বকেয়া নেই — সবাই পেমেন্ট আপ টু ডেট!</div>}
        {rows.length > 0 && (
          <table className="dtable">
            <thead><tr><th>টেনেন্ট</th><th>ফ্ল্যাট</th><th>রুম</th><th>ফোন</th><th>রেন্ট ডিউ</th><th>সার্ভিস ডিউ</th><th>মোট ডিউ</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td>{r.flat}</td>
                  <td>{r.room}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{r.rentDue > 0 ? money(r.rentDue) : '—'}</td>
                  <td>{r.svcDue > 0 ? money(r.svcDue) : '—'}</td>
                  <td><span className="badge badge-rd">{money(r.totalDue)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
