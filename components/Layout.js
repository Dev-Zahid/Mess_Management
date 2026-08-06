import { useRouter } from 'next/router';

const NAV = [
  { href: '/dashboard', label: 'ড্যাশবোর্ড', ic: '📊' },
  { href: '/dashboard/flats', label: 'ফ্ল্যাটস', ic: '🏠' },
  { href: '/dashboard/tenants', label: 'টেনেন্টস', ic: '👥' },
  { href: '/dashboard/rent-payments', label: 'রেন্ট পেমেন্ট', ic: '💳' },
  { href: '/dashboard/service-charge', label: 'সার্ভিস চার্জ', ic: '⚙️' },
  { href: '/dashboard/advance-money', label: 'অ্যাডভান্স মানি', ic: '🪙' },
  { href: '/dashboard/due-tracker', label: 'ডিউ ট্র্যাকার', ic: '⏰' },
  { href: '/dashboard/expenses', label: 'খরচ', ic: '🧾' },
  { href: '/dashboard/owner-panel', label: 'ওনার প্যানেল', ic: '👤' },
  { href: '/billing', label: 'বিলিং', ic: '💼' },
];

export default function Layout({ orgName, userName, status, daysLeft, children }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <span className="ic">🏠</span>
          <div>
            <div className="tx">{orgName || 'Mess Manager'}</div>
            <div className="sub">{userName}</div>
          </div>
        </div>
        <nav className="dash-nav">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={`dash-nb ${router.pathname === n.href ? 'on' : ''}`}>
              <span>{n.ic}</span>{n.label}
            </a>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 8, marginTop: 8 }}>
          <div className="dash-nb" style={{ color: 'var(--rd)' }} onClick={logout}>
            <span>🚪</span>লগআউট
          </div>
        </div>
      </aside>

      <div className="dash-content">
        {status === 'trial' && daysLeft !== null && daysLeft !== undefined && (
          <div className="alert alert-warn">
            ফ্রি ট্রায়ালের <b>{daysLeft} দিন</b> বাকি — <a href="/billing" style={{ fontWeight: 800, color: 'var(--pr)' }}>সাবস্ক্রিপশন চালু করুন</a>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
