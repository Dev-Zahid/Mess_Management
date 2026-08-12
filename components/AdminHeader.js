export default function AdminHeader({ title, backHref }) {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {backHref && <a href={backHref} className="btn bs"><i className="ti ti-arrow-left"></i></a>}
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h1>
      </div>
      <button className="btn bs" style={{ color: 'var(--rd)' }} onClick={logout}>
        <i className="ti ti-logout"></i> Logout
      </button>
    </div>
  );
}
