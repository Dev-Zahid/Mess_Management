import { useState } from 'react';
import { prisma } from '../../lib/db';
import { requireSuperAdmin } from '../../lib/guard';
import { effectiveOrgStatus } from '../../lib/auth';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;

  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  const pendingPayments = await prisma.paymentSubmission.findMany({
    where: { status: 'pending' },
    include: { org: true },
    orderBy: { submittedAt: 'asc' },
  });

  const totalRevenue = await prisma.paymentSubmission.aggregate({
    where: { status: 'approved' },
    _sum: { amount: true },
  });

  return {
    props: {
      orgs: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        ownerName: o.ownerName,
        ownerPhone: o.ownerPhone,
        status: effectiveOrgStatus(o),
        trialEndsAt: o.trialEndsAt.toISOString(),
        subscriptionEndsAt: o.subscriptionEndsAt ? o.subscriptionEndsAt.toISOString() : null,
      })),
      pendingPayments: pendingPayments.map((p) => ({
        id: p.id,
        orgName: p.org.name,
        method: p.method,
        senderNumber: p.senderNumber,
        trxId: p.trxId,
        amount: p.amount,
        planApplied: p.planApplied,
        submittedAt: p.submittedAt.toISOString(),
      })),
      totalRevenue: totalRevenue._sum.amount || 0,
    },
  };
}

const STATUS_BADGE = {
  trial: 'badge-bl',
  active: 'badge-gn',
  expired: 'badge-rd',
  suspended: 'badge-rd',
};

export default function AdminPanel({ orgs: initialOrgs, pendingPayments: initialPending, totalRevenue }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [pending, setPending] = useState(initialPending);
  const [busyId, setBusyId] = useState(null);

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
      setPending((p) => p.filter((x) => x.id !== paymentId));
      if (decision === 'approve') {
        // reflect the org's new status locally without a full reload
        setOrgs((list) =>
          list.map((o) => (o.name === data.orgName ? { ...o, status: 'active', subscriptionEndsAt: data.subscriptionEndsAt } : o))
        );
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-main" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Super Admin</h1>
      <p style={{ color: 'var(--mu)', fontSize: 13.5, marginBottom: 24 }}>
        মোট revenue: <b style={{ color: 'var(--tx)' }}>৳{totalRevenue.toLocaleString()}</b> &nbsp;•&nbsp; মোট কাস্টমার: <b style={{ color: 'var(--tx)' }}>{orgs.length}</b>
      </p>

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
            <button className="btn" style={{ background: 'var(--gn2)', color: 'var(--gn)', border: 'none' }} disabled={busyId === p.id} onClick={() => review(p.id, 'approve')}>
              ✓ Approve
            </button>
            <button className="btn" style={{ background: 'var(--rd2)', color: 'var(--rd)', border: 'none' }} disabled={busyId === p.id} onClick={() => review(p.id, 'reject')}>
              ✕ Reject
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>সব কাস্টমার ({orgs.length})</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মেস</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মালিক</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>ফোন</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>স্ট্যাটাস</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--mu)' }}>মেয়াদ শেষ</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid var(--bd)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{o.name}</td>
                <td style={{ padding: '10px 14px' }}>{o.ownerName}</td>
                <td style={{ padding: '10px 14px' }}>{o.ownerPhone}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge ${STATUS_BADGE[o.status] || 'badge-bl'}`}>{o.status}</span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--mu)' }}>
                  {new Date(o.subscriptionEndsAt || o.trialEndsAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
