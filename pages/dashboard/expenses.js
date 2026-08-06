import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  return { props: { layoutProps: ctx.layoutProps } };
}

const emptyForm = { title: '', amount: '', source: 'General', date: '' };

export default function ExpensesPage({ layoutProps }) {
  const [expenses, setExpenses] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/expenses').then((r) => r.json()).then(setExpenses);
  }, [reloadKey]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      setForm(emptyForm);
      setReloadKey((k) => k + 1);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('এই খরচ মুছে ফেলতে চান?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setReloadKey((k) => k + 1);
  }

  const total = (expenses || []).reduce((a, e) => a + e.amount, 0);

  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">খরচ</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ খরচ যোগ করুন</button>
      </div>

      {expenses && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'minmax(200px,260px)' }}>
          <div className="kpi-card">
            <div className="kpi-ic" style={{ background: 'var(--rd2)', color: 'var(--rd)' }}>🧾</div>
            <div><div className="kpi-l">সর্বমোট খরচ</div><div className="kpi-v">{money(total)}</div></div>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {expenses === null && <div className="empty-state">লোড হচ্ছে...</div>}
        {expenses && expenses.length === 0 && <div className="empty-state">এখনো কোনো খরচ যোগ করা হয়নি।</div>}
        {expenses && expenses.length > 0 && (
          <table className="dtable">
            <thead><tr><th>তারিখ</th><th>শিরোনাম</th><th>উৎস</th><th>পরিমাণ</th><th></th></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ fontWeight: 700 }}>{e.title}</td>
                  <td><span className="badge badge-bl">{e.source}</span></td>
                  <td style={{ color: 'var(--rd)', fontWeight: 700 }}>{money(e.amount)}</td>
                  <td><button className="btn bs" style={{ color: 'var(--rd)' }} onClick={() => remove(e.id)}>মুছুন</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="bkd" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><h3>নতুন খরচ যোগ করুন</h3></div>
            <div className="mb">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={submit} id="exp-form">
                <div className="field"><label>শিরোনাম</label><input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="যেমন: বাজার খরচ" /></div>
                <div className="field"><label>পরিমাণ (৳)</label><input required type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                <div className="field">
                  <label>উৎস</label>
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                    <option>General</option>
                    <option>Service Charge</option>
                    <option>Utility</option>
                    <option>Maintenance</option>
                  </select>
                </div>
                <div className="field"><label>তারিখ</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              </form>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setShowModal(false)}>বাতিল</button>
              <button className="btn btn-primary" form="exp-form" disabled={busy}>{busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
