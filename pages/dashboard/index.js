import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { prisma } from '../../lib/db';
import { currentMonthYear, effectiveDue, money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  const { org, layoutProps } = ctx;

  const [flats, tenants, rentPayments, expenses] = await Promise.all([
    prisma.flat.findMany({ where: { orgId: org.id } }),
    prisma.tenant.findMany({ where: { orgId: org.id, status: 'Active' } }),
    prisma.rentPayment.findMany({ where: { orgId: org.id } }),
    prisma.expense.findMany({ where: { orgId: org.id } }),
  ]);

  const { month, year } = currentMonthYear();
  const totalSeats = flats.reduce((a, f) => a + f.totalSeats, 0);
  const activeTenants = tenants.length;

  const payLite = rentPayments.map((p) => ({ tenantId: p.tenantId, month: p.month, year: p.year, paid: p.paid }));
  let collected = 0, due = 0, paidCount = 0, dueCount = 0;
  tenants.forEach((t) => {
    const { due: d, paidThisMonth } = effectiveDue(t, month, year, payLite);
    collected += paidThisMonth;
    due += d;
    if (d <= 0) paidCount++; else dueCount++;
  });

  const totalExpense = expenses
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((a, e) => a + e.amount, 0);

  return {
    props: {
      layoutProps,
      kpis: {
        totalSeats,
        activeTenants,
        occupancyPct: totalSeats ? Math.round((activeTenants / totalSeats) * 100) : 0,
        collected,
        due,
        paidCount,
        dueCount,
        totalExpense,
        month,
        year,
      },
    },
  };
}

export default function Dashboard({ layoutProps, kpis }) {
  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">ড্যাশবোর্ড — {kpis.month} {kpis.year}</div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--pr2)', color: 'var(--pr)' }}>👥</div>
          <div><div className="kpi-l">সক্রিয় টেনেন্ট</div><div className="kpi-v">{kpis.activeTenants}</div></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--pu2)', color: 'var(--pu)' }}>🏠</div>
          <div><div className="kpi-l">অকুপ্যান্সি</div><div className="kpi-v">{kpis.occupancyPct}%</div></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--gn2)', color: 'var(--gn)' }}>💰</div>
          <div><div className="kpi-l">এই মাসে কালেক্টেড</div><div className="kpi-v">{money(kpis.collected)}</div></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--rd2)', color: 'var(--rd)' }}>⚠️</div>
          <div><div className="kpi-l">মোট ডিউ</div><div className="kpi-v">{money(kpis.due)}</div></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ic" style={{ background: 'var(--yw2)', color: 'var(--yw)' }}>🧾</div>
          <div><div className="kpi-l">এই মাসের খরচ</div><div className="kpi-v">{money(kpis.totalExpense)}</div></div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>রেন্ট স্ট্যাটাস</h3>
        <p style={{ fontSize: 13.5, color: 'var(--mu)' }}>
          <b style={{ color: 'var(--gn)' }}>{kpis.paidCount} জন</b> পেইড • <b style={{ color: 'var(--rd)' }}>{kpis.dueCount} জন</b> ডিউ আছে
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href="/dashboard/tenants">+ টেনেন্ট যোগ করুন</a>
          <a className="btn" href="/dashboard/rent-payments">রেন্ট পেমেন্ট নিন</a>
          <a className="btn" href="/dashboard/due-tracker">ডিউ ট্র্যাকার দেখুন</a>
        </div>
      </div>
    </Layout>
  );
}
