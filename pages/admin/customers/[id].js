import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { requireSuperAdmin } from '../../../lib/guard';
import AdminHeader from '../../../components/AdminHeader';

export async function getServerSideProps({ req, params }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;
  return { props: { orgId: params.id } };
}

const STATUS_BADGE = { trial: 'badge-bl', active: 'badge-gn', expired: 'badge-rd', suspended: 'badge-rd' };

export default function CustomerDetail({ orgId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/org/${orgId}`).then((r) => r.json()).then((d) => {
      setData(d);
      setNote(d.org.adminNotes || '');
    });
  }, [orgId, reloadKey]);

  async function doAction(action, extra) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/org/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || result.message);
      setReloadKey((k) => k + 1);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function impersonate() {
    if (!confirm(`${data.org.name} হিসেবে লগইন করবেন? এতে আপনার নিজের Super Admin সেশন replace হয়ে যাবে — ফিরে আসতে আবার /login-এ যেতে হবে।`)) return;
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    const result = await res.json();
    if (!res.ok) return alert(result.error);
    window.location.href = '/dashboard';
  }

  if (!data) return <div className="app-main" style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>লোড হচ্ছে...</div>;

  const { org, payments, users, auditLog } = data;

  return (
    <div className="app-main" style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <AdminHeader title={<>{org.name} <span className={`badge ${STATUS_BADGE[org.status]}`} style={{ marginLeft: 8 }}>{org.status}</span></>} backHref="/admin" />
      <p style={{ color: 'var(--mu)', fontSize: 13.5, marginBottom: 20, marginTop: -12 }}>{org.ownerName} • {org.ownerPhone} • যোগ দিয়েছেন {new Date(org.createdAt).toLocaleDateString('en-GB')}</p>

      <div className="admin-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 12 }}>সাবস্ক্রিপশন অ্যাকশন</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)}
              style={{ width: 70, border: '1px solid var(--bd)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
            <button className="btn bs btn-primary" disabled={busy} onClick={() => doAction('extend', { days: extendDays })}>দিন বাড়ান</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {org.status === 'suspended' ? (
              <button className="btn bs" disabled={busy} onClick={() => doAction('reactivate')}>Reactivate</button>
            ) : (
              <button className="btn bs" style={{ color: 'var(--rd)' }} disabled={busy} onClick={() => { const reason = prompt('Suspend করার কারণ (optional):'); doAction('suspend', { reason: reason || '' }); }}>Suspend</button>
            )}
            <button className="btn bs" disabled={busy} onClick={impersonate}><i className="ti ti-eye"></i> View as Customer</button>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 12 }}>Admin Note</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="যেমন: ফোনে কথা হয়েছে, renewal নিয়ে আগ্রহী..."
            style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8, padding: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 8 }} />
          <button className="btn bs" disabled={busy} onClick={() => doAction('set_note', { note })}>Save Note</button>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Team ({users.length})</h3>
      <div className="card admin-table-wrap" style={{ marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--bg)' }}><th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>নাম</th><th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>ফোন</th><th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--bd)' }}>
                <td style={{ padding: 10, fontWeight: 700 }}>{u.name}</td>
                <td style={{ padding: 10 }}>{u.phone}</td>
                <td style={{ padding: 10 }}>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>পেমেন্ট হিস্ট্রি ({payments.length})</h3>
      <div className="card admin-table-wrap" style={{ marginBottom: 20 }}>
        {payments.length === 0 && <div style={{ padding: 18, color: 'var(--mu)', fontSize: 13 }}>কোনো পেমেন্ট নেই</div>}
        {payments.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--bg)' }}>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>তারিখ</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>Method</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>TrxID</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 11, color: 'var(--mu)' }}>Status</th>
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--bd)' }}>
                  <td style={{ padding: 10 }}>{new Date(p.submittedAt).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: 10 }}>{p.method}</td>
                  <td style={{ padding: 10 }}>{p.trxId}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>৳{p.amount}</td>
                  <td style={{ padding: 10 }}>
                    <span className={`badge ${p.status === 'approved' ? 'badge-gn' : p.status === 'rejected' ? 'badge-rd' : 'badge-yw'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>এই কাস্টমারের Audit Log</h3>
      <div className="card" style={{ overflow: 'hidden' }}>
        {auditLog.length === 0 && <div style={{ padding: 18, color: 'var(--mu)', fontSize: 13 }}>কোনো অ্যাকশন নেই</div>}
        {auditLog.map((a) => (
          <div key={a.id} style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', fontSize: 12.5 }}>
            <b>{a.action}</b> by {a.actorName} — {a.details} <span style={{ color: 'var(--mu)' }}>({new Date(a.createdAt).toLocaleString('en-GB')})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
