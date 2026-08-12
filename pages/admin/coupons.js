import { useState, useEffect } from 'react';
import { requireSuperAdmin } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;
  return { props: {} };
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState({ code: '', percentOff: '', flatOff: '', maxUses: '', expiresAt: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/coupons').then((r) => r.json()).then(setCoupons);
  }, [reloadKey]);

  async function create(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setForm({ code: '', percentOff: '', flatOff: '', maxUses: '', expiresAt: '' });
    setReloadKey((k) => k + 1);
  }

  async function toggle(id, active) {
    await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="app-main" style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>
      <a href="/admin" className="btn bs" style={{ marginBottom: 16 }}>← Admin</a>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}><i className="ti ti-ticket"></i> Coupons</h1>

      <div className="card" style={{ padding: 18, marginBottom: 24 }}>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={create} className="admin-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input placeholder="CODE" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13, textTransform: 'uppercase' }} />
          <input placeholder="% Off (e.g. 20)" type="number" value={form.percentOff} onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
            style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13 }} />
          <input placeholder="৳ Off (flat)" type="number" value={form.flatOff} onChange={(e) => setForm((f) => ({ ...f, flatOff: e.target.value }))}
            style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13 }} />
          <input placeholder="Max Uses (0=unlimited)" type="number" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
            style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13 }} />
          <input placeholder="Expires (optional)" type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13 }} />
          <button className="btn btn-primary bs">+ Create</button>
        </form>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {(coupons || []).map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--bd)' }}>
            <span className="badge badge-bl" style={{ fontFamily: 'monospace' }}>{c.code}</span>
            <span style={{ fontSize: 13, color: 'var(--mu)' }}>
              {c.percentOff > 0 && `${c.percentOff}% off`} {c.flatOff > 0 && `৳${c.flatOff} off`} • used {c.usedCount}/{c.maxUses || '∞'}
            </span>
            <button className="btn bs" style={{ marginLeft: 'auto' }} onClick={() => toggle(c.id, c.active)}>
              {c.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
        {coupons && coupons.length === 0 && <div style={{ padding: 20, color: 'var(--mu)', fontSize: 13 }}>কোনো coupon নেই</div>}
      </div>
    </div>
  );
}
