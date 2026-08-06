import { requireOrgUser } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireOrgUser(req);
  if (result.redirect) return result;
  const { user, org, status } = result;

  if (status === 'expired' || status === 'suspended') {
    return { redirect: { destination: '/billing?locked=1', permanent: false } };
  }

  const daysLeft =
    status === 'trial'
      ? Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / 86400000))
      : null;

  return {
    props: {
      userName: user.name,
      orgName: org.name,
      status,
      daysLeft,
    },
  };
}

export default function Dashboard({ userName, orgName, status, daysLeft }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🏠 {orgName}</div>
        <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>{userName}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a className="btn" style={{ justifyContent: 'flex-start', border: 'none' }}>ড্যাশবোর্ড</a>
          <a className="btn" style={{ justifyContent: 'flex-start', border: 'none' }} href="/dashboard/flats">ফ্ল্যাটস</a>
          <a className="btn" style={{ justifyContent: 'flex-start', border: 'none' }} href="/dashboard/tenants">টেনেন্টস</a>
          <a className="btn" style={{ justifyContent: 'flex-start', border: 'none' }} href="/billing">বিলিং</a>
          <form action="/api/auth/logout" method="post" onSubmit={(e) => { e.preventDefault(); fetch('/api/auth/logout', { method: 'POST' }).then(() => (window.location.href = '/login')); }}>
            <button className="btn" style={{ justifyContent: 'flex-start', border: 'none', color: 'var(--rd)', width: '100%' }}>লগআউট</button>
          </form>
        </nav>
      </aside>

      <main className="app-main">
        {status === 'trial' && (
          <div className="alert alert-warn">
            আপনার ফ্রি ট্রায়ালের <b>{daysLeft} দিন</b> বাকি আছে। ট্রায়াল শেষ হওয়ার আগে{' '}
            <a href="/billing" style={{ fontWeight: 800, color: 'var(--pr)' }}>সাবস্ক্রিপশন চালু করুন</a> — না হলে অ্যাক্সেস বন্ধ হয়ে যাবে।
          </div>
        )}

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>স্বাগতম, {userName} 👋</h1>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--mu)', fontSize: 14 }}>
            এখানে পুরো Mess Manager ড্যাশবোর্ড (Flats, Tenants, Rent Payments, Service Charge, Advance Money,
            Due Tracker, Expenses, Owner Panel) বসানো হবে — এটা Phase 1 এর পরের ধাপ। আপাতত অ্যাকাউন্ট, ট্রায়াল
            এবং বিলিং সিস্টেম কাজ করছে।
          </p>
        </div>
      </main>
    </div>
  );
}
