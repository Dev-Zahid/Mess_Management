import { prisma } from '../../lib/db';
import { requireSuperAdmin } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return {
    props: {
      logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    },
  };
}

export default function AuditLogPage({ logs }) {
  return (
    <div className="app-main" style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
      <a href="/admin" className="btn bs" style={{ marginBottom: 16 }}>← Admin</a>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}><i className="ti ti-notes"></i> Audit Log</h1>
      <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 20 }}>সাম্প্রতিক ২০০টা Super Admin অ্যাকশন — extend, suspend, impersonate, payment review ইত্যাদি।</p>

      <div className="card" style={{ overflow: 'hidden' }}>
        {logs.length === 0 && <div style={{ padding: 20, color: 'var(--mu)', fontSize: 13 }}>কোনো লগ নেই</div>}
        {logs.map((l) => (
          <div key={l.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--bd)', fontSize: 12.5 }}>
            <span className="badge badge-bl" style={{ marginRight: 8 }}>{l.action}</span>
            <b>{l.actorName}</b>
            {l.targetOrgName && <> → <b>{l.targetOrgName}</b></>}
            {l.details && <span style={{ color: 'var(--mu)' }}> — {l.details}</span>}
            <span style={{ color: 'var(--mu)', float: 'right' }}>{new Date(l.createdAt).toLocaleString('en-GB')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
