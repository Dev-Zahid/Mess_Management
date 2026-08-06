import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';
import { money } from '../../lib/calc';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  return { props: { layoutProps: ctx.layoutProps } };
}

const emptyForm = { name: '', address: '', totalSeats: '', flatRent: '', ownerName: '', notes: '' };

export default function FlatsPage({ layoutProps }) {
  const [flats, setFlats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/flats').then((r) => r.json()).then(setFlats);
  }, [reloadKey]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      setForm(emptyForm);
      setReloadKey(k=>k+1);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('এই ফ্ল্যাট মুছে ফেলতে চান?')) return;
    await fetch(`/api/flats/${id}`, { method: 'DELETE' });
    setReloadKey(k=>k+1);
  }

  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar">
        <div className="dash-title">ফ্ল্যাটস</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ নতুন ফ্ল্যাট</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {flats === null && <div className="empty-state">লোড হচ্ছে...</div>}
        {flats && flats.length === 0 && <div className="empty-state">এখনো কোনো ফ্ল্যাট যোগ করা হয়নি।</div>}
        {flats && flats.length > 0 && (
          <table className="dtable">
            <thead>
              <tr>
                <th>নাম</th><th>ঠিকানা</th><th>সিট</th><th>ভাড়া/সিট</th><th>সক্রিয় টেনেন্ট</th><th></th>
              </tr>
            </thead>
            <tbody>
              {flats.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 700 }}>{f.name}</td>
                  <td style={{ color: 'var(--mu)' }}>{f.address || '—'}</td>
                  <td>{f.totalSeats}</td>
                  <td>{money(f.flatRent)}</td>
                  <td>{f.tenants?.length || 0}</td>
                  <td><button className="btn bs" style={{ color: 'var(--rd)' }} onClick={() => remove(f.id)}>মুছুন</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="bkd" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><h3>নতুন ফ্ল্যাট যোগ করুন</h3></div>
            <div className="mb">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={submit} id="flat-form">
                <div className="field"><label>ফ্ল্যাটের নাম</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
                <div className="field"><label>ঠিকানা</label><input value={form.address} onChange={(e) => update('address', e.target.value)} /></div>
                <div className="field"><label>মোট সিট</label><input type="number" value={form.totalSeats} onChange={(e) => update('totalSeats', e.target.value)} /></div>
                <div className="field"><label>প্রতি সিট ভাড়া (৳)</label><input type="number" value={form.flatRent} onChange={(e) => update('flatRent', e.target.value)} /></div>
                <div className="field"><label>মালিকের নাম</label><input value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} /></div>
              </form>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setShowModal(false)}>বাতিল</button>
              <button className="btn btn-primary" form="flat-form" disabled={busy}>{busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
