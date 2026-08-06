import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { prisma } from '../../lib/db';
import { money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  const tenants = await prisma.tenant.findMany({
    where: { orgId: ctx.org.id, status: 'Active' },
    select: { id: true, name: true, advanceDue: true, room: true },
  });
  return { props: { layoutProps: ctx.layoutProps, tenants } };
}

export default function AdvanceMoneyPage({ layoutProps, tenants }) {
  const [payments, setPayments] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tenantId: '', paid: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/advance-payments').then((r) => r.json()).then(setPayments);
  }, [reloadKey]);

  const rows = useMemo(() => {
    if (!payments) return [];
    return tenants.map((t) => {
      const collected = payments.filter((p) => p.tenantId === t.id).reduce((a, p) => a + p.paid, 0);
      return { tenant: t, collected, remaining: Math.max(0, t.advanceDue - collected) };
    });
  }, [tenants, payments]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/advance-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">অ্যাডভান্স মানি</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ পেমেন্ট রেকর্ড করুন</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {payments === null && <div className="empty-state">লোড হচ্ছে...</div>}
        {payments && rows.length === 0 && <div className="empty-state">কোনো সক্রিয় টেনেন্ট নেই।</div>}
        {payments && rows.length > 0 && (
          <table className="dtable">
            <thead><tr><th>টেনেন্ট</th><th>রুম</th><th>টার্গেট</th><th>কালেক্টেড</th><th>বাকি</th></tr></thead>
            <tbody>
              {rows.map(({ tenant, collected, remaining }) => (
                <tr key={tenant.id}>
                  <td style={{ fontWeight: 700 }}>{tenant.name}</td>
                  <td>{tenant.room || '—'}</td>
                  <td>{money(tenant.advanceDue)}</td>
                  <td style={{ color: 'var(--gn)', fontWeight: 700 }}>{money(collected)}</td>
                  <td>{remaining > 0 ? <span className="badge badge-rd">{money(remaining)}</span> : <span className="badge badge-gn">সম্পূর্ণ</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="bkd" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><h3>অ্যাডভান্স মানি রেকর্ড করুন</h3></div>
            <div className="mb">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={submit} id="adv-form">
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
              <button className="btn btn-primary" form="adv-form" disabled={busy}>{busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
