import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { prisma } from '../../lib/db';
import { money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  const flats = await prisma.flat.findMany({ where: { orgId: ctx.org.id }, select: { id: true, name: true } });
  return { props: { layoutProps: ctx.layoutProps, flats } };
}

const emptyForm = { name: '', flatId: '', room: '', phone: '', rent: '', serviceCharge: '', advanceDue: '', entryDate: '' };

const STATUS_BADGE = { Active: 'badge-gn', Inactive: 'badge-yw', Left: 'badge-rd' };

export default function TenantsPage({ layoutProps, flats }) {
  const [tenants, setTenants] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState('Active');

  useEffect(() => {
    fetch('/api/tenants').then((r) => r.json()).then(setTenants);
  }, [reloadKey]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/tenants', {
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

  async function markLeft(id) {
    if (!confirm('এই টেনেন্টকে "Left" হিসেবে মার্ক করবেন?')) return;
    await fetch(`/api/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Left' }),
    });
    setReloadKey((k) => k + 1);
  }

  const visible = tenants ? tenants.filter((t) => filter === 'All' || t.status === filter) : [];

  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">টেনেন্টস</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ নতুন টেনেন্ট</button>
      </div>

      <div className="pbar">
        <div style={{ display: 'flex', gap: 6 }}>
          {['Active', 'Inactive', 'Left', 'All'].map((s) => (
            <button key={s} className={`btn bs ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {tenants === null && <div className="empty-state">লোড হচ্ছে...</div>}
        {tenants && visible.length === 0 && <div className="empty-state">কোনো টেনেন্ট পাওয়া যায়নি।</div>}
        {tenants && visible.length > 0 && (
          <table className="dtable">
            <thead>
              <tr>
                <th>নাম</th><th>ফ্ল্যাট</th><th>রুম</th><th>ফোন</th><th>ভাড়া</th><th>স্ট্যাটাস</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.flat?.name || '—'}</td>
                  <td>{t.room || '—'}</td>
                  <td>{t.phone || '—'}</td>
                  <td>{money(t.rent)}</td>
                  <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                  <td>
                    {t.status === 'Active' && (
                      <button className="btn bs" style={{ color: 'var(--rd)' }} onClick={() => markLeft(t.id)}>Mark Left</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="bkd" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><h3>নতুন টেনেন্ট যোগ করুন</h3></div>
            <div className="mb">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={submit} id="tenant-form">
                <div className="field"><label>নাম</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
                <div className="field">
                  <label>ফ্ল্যাট</label>
                  <select value={form.flatId} onChange={(e) => update('flatId', e.target.value)}>
                    <option value="">নির্বাচন করুন</option>
                    {flats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>রুম</label><input value={form.room} onChange={(e) => update('room', e.target.value)} /></div>
                <div className="field"><label>ফোন</label><input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
                <div className="field"><label>মাসিক ভাড়া (৳)</label><input type="number" value={form.rent} onChange={(e) => update('rent', e.target.value)} /></div>
                <div className="field"><label>সার্ভিস চার্জ (৳)</label><input type="number" value={form.serviceCharge} onChange={(e) => update('serviceCharge', e.target.value)} /></div>
                <div className="field"><label>এন্ট্রি তারিখ</label><input type="date" value={form.entryDate} onChange={(e) => update('entryDate', e.target.value)} /></div>
              </form>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setShowModal(false)}>বাতিল</button>
              <button className="btn btn-primary" form="tenant-form" disabled={busy}>{busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
