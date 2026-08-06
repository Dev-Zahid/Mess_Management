import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { prisma } from '../../lib/db';
import { MONTHS, currentMonthYear, money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  const tenants = await prisma.tenant.findMany({
    where: { orgId: ctx.org.id, status: 'Active' },
    select: { id: true, name: true, serviceCharge: true, room: true },
  });
  return { props: { layoutProps: ctx.layoutProps, tenants } };
}

export default function ServiceChargePage({ layoutProps, tenants }) {
  const now = currentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [payments, setPayments] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tenantId: '', paid: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/service-charges').then((r) => r.json()).then(setPayments);
  }, [reloadKey]);

  const rows = useMemo(() => {
    if (!payments) return [];
    return tenants.map((t) => {
      const paidThisMonth = payments
        .filter((p) => p.tenantId === t.id && p.month === month && p.year === year)
        .reduce((a, p) => a + p.paid, 0);
      return { tenant: t, paidThisMonth, due: Math.max(0, t.serviceCharge - paidThisMonth) };
    });
  }, [tenants, payments, month, year]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/service-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      setForm({ tenantId: '', paid: '' });
      setReloadKey((k) => k + 1);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function openFor(tenantId, suggestedAmount) {
    setForm({ tenantId, paid: suggestedAmount > 0 ? String(suggestedAmount) : '' });
    setShowModal(true);
  }

  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">সার্ভিস চার্জ</div>
        <button className="btn btn-primary" onClick={() => openFor('', 0)}>+ পেমেন্ট রেকর্ড করুন</button>
      </div>

      <div className="pbar">
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {payments === null && <div className="empty-state">লোড হচ্ছে...</div>}
        {payments && rows.length === 0 && <div className="empty-state">কোনো সক্রিয় টেনেন্ট নেই।</div>}
        {payments && rows.length > 0 && (
          <table className="dtable">
            <thead><tr><th>টেনেন্ট</th><th>রুম</th><th>চার্জ</th><th>পেইড</th><th>ডিউ</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ tenant, paidThisMonth, due }) => (
                <tr key={tenant.id}>
                  <td style={{ fontWeight: 700 }}>{tenant.name}</td>
                  <td>{tenant.room || '—'}</td>
                  <td>{money(tenant.serviceCharge)}</td>
                  <td style={{ color: 'var(--gn)', fontWeight: 700 }}>{money(paidThisMonth)}</td>
                  <td>{due > 0 ? <span className="badge badge-rd">{money(due)}</span> : <span className="badge badge-gn">Paid</span>}</td>
                  <td><button className="btn bs btn-primary" onClick={() => openFor(tenant.id, due)}>পেমেন্ট নিন</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="bkd" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><h3>সার্ভিস চার্জ পেমেন্ট — {month} {year}</h3></div>
            <div className="mb">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={submit} id="svc-form">
                <div className="field">
                  <label>টেনেন্ট</label>
                  <select required value={form.tenantId} onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}>
                    <option value="">নির্বাচন করুন</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}{t.room ? ` (${t.room})` : ''}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>পরিমাণ (৳)</label>
                  <input required type="number" value={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.value }))} />
                </div>
              </form>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setShowModal(false)}>বাতিল</button>
              <button className="btn btn-primary" form="svc-form" disabled={busy}>{busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
