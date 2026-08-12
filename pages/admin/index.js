import { useState, useEffect } from 'react';
import { requireSuperAdmin } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;
  return { props: {} };
}

const STATUS_BADGE = { trial: 'badge-bl', active: 'badge-gn', expired: 'badge-rd', suspended: 'badge-rd' };

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: color || 'var(--tx)' }}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [orgs, setOrgs] = useState(null);
  const [pending, setPending] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/analytics').then((r) => r.json()).then(setAnalytics);
  }, [reloadKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch('/api/admin/orgs?' + params.toString()).then((r) => r.json()).then(setOrgs);
  }, [q, statusFilter, reloadKey]);

  useEffect(() => {
    fetch('/api/admin/pending-payments').then((r) => r.json()).then(setPending).catch(() => {});
  }, [reloadKey]);

  async function review(paymentId, decision) {
    setBusyId(paymentId);
    try {
      const res = await fetch('/api/admin/review-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReloadKey((k) => k + 1);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-main" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Super Admin</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/admin/coupons" className="btn bs"><i className="ti ti-ticket"></i> Coupons</a>
          <a href="/admin/announcements" className="btn bs"><i className="ti ti-speakerphone"></i> Announcements</a>
          <a href="/admin/audit-log" className="btn bs"><i className="ti ti-notes"></i> Audit Log</a>
          <a href="/api/admin/export?type=customers" className="btn bs"><i className="ti ti-download"></i> Export Customers</a>
          <a href="/api/admin/export?type=payments" className="btn bs"><i className="ti ti-download"></i> Export Payments</a>
        </div>
      </div>

      {analytics && (
        <>
          <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="এই মাসে Revenue" value={'৳' + analytics.revenueThisMonth.toLocaleString()} color="var(--gn)" />
            <StatCard label="গত মাসে Revenue" value={'৳' + analytics.revenueLastMonth.toLocaleString()} />
            <StatCard label="সর্বমোট Revenue" value={'৳' + analytics.revenueAllTime.toLocaleString()} />
            <StatCard label="মোট কাস্টমার" value={analytics.totalOrgs} />
            <StatCard label="Trial" value={analytics.counts.trial} color="var(--pr)" />
            <StatCard label="Active" value={analytics.counts.active} color="var(--gn)" />
            <StatCard label="Expired" value={analytics.counts.expired} color="var(--rd)" />
          </div>

          {analytics.trialEndingSoon.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'var(--yw)' }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10, color: 'var(--yw)' }}>
                <i className="ti ti-alert-triangle"></i> ট্রায়াল শীঘ্রই শেষ হবে ({analytics.trialEndingSoon.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analytics.trialEndingSoon.map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span><b>{o.name}</b> — {o.ownerPhone}</span>
                    <span className="badge badge-yw">{o.daysLeft} দিন বাকি</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>পেন্ডিং পেমেন্ট ভেরিফিকেশন ({pending.length})</h2>
      <div className="card" style={{ marginBottom: 30, overflow: 'hidden' }}>
        {pending.length === 0 && <div style={{ padding: 20, color: 'var(--mu)', fontSize: 13.5 }}>কোনো পেন্ডিং পেমেন্ট নেই</div>}
        {pending.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--bd)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.orgName}</div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                {p.method} • {p.senderNumber} • TrxID: <b>{p.trxId}</b> • ৳{p.amount} ({p.planApplied})
              </div>
            </div>
            <button className="btn" style={{ background: 'var(--gn2)', color: 'var(--gn)', border: 'none' }} disabled={busyId === p.id} onClick={() => review(p.id, 'approve')}><i className="ti ti-check"></i> Approve</button>
            <button className="btn" style={{ background: 'var(--rd2)', color: 'var(--rd)', border: 'none' }} disabled={busyId === p.id} onClick={() => review(p.id, 'reject')}><i className="ti ti-x"></i> Reject</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800 }}>কাস্টমার {orgs ? `(${orgs.length})` : ''}</h2>
        <div className="admin-toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="নাম/ফোন দিয়ে খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: '1px solid var(--bd)', borderRadius: 9, padding: '8px 12px', fontSize: 13 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ border: '1px solid var(--bd)', borderRadius: 9, padding: '8px 12px', fontSize: 13 }}>
            <option value="all">সব Status</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
          <a href="/admin/add-customer" className="btn bs btn-primary">+ Manual Add</a>
        </div>
      </div>

      <div className="card admin-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মেস</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মালিক</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>ফোন</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>স্ট্যাটাস</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মেয়াদ শেষ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(orgs || []).map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid var(--bd)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{o.name}</td>
                <td style={{ padding: '10px 14px' }}>{o.ownerName}</td>
                <td style={{ padding: '10px 14px' }}>{o.ownerPhone}</td>
                <td style={{ padding: '10px 14px' }}><span className={`badge ${STATUS_BADGE[o.status] || 'badge-bl'}`}>{o.status}</span></td>
                <td style={{ padding: '10px 14px', color: 'var(--mu)' }}>
                  {new Date(o.subscriptionEndsAt || o.trialEndsAt).toLocaleDateString('en-GB')}
                </td>
                <td style={{ padding: '10px 14px' }}><a className="btn bs" href={`/admin/customers/${o.id}`}>Details →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
