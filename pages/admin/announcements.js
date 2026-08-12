import { useState, useEffect } from 'react';
import { requireSuperAdmin } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;
  return { props: {} };
}

export default function AnnouncementsPage() {
  const [list, setList] = useState(null);
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/announcements').then((r) => r.json()).then(setList);
  }, [reloadKey]);

  async function create(e) {
    e.preventDefault();
    if (!message.trim()) return;
    await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    setMessage('');
    setReloadKey((k) => k + 1);
  }

  async function toggle(id, active) {
    await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="app-main" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px' }}>
      <a href="/admin" className="btn bs" style={{ marginBottom: 16 }}>← Admin</a>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}><i className="ti ti-speakerphone"></i> Announcements</h1>
      <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 20 }}>
        নতুন announcement বানালে সব কাস্টমারের অ্যাপে একটা ব্যানার দেখাবে — একবারে শুধু একটাই active থাকতে পারে।
      </p>

      <div className="card" style={{ padding: 18, marginBottom: 24 }}>
        <form onSubmit={create} style={{ display: 'flex', gap: 8 }}>
          <input placeholder="যেমন: রবিবার রাত ১১টায় মেইনটেনেন্স হবে" value={message} onChange={(e) => setMessage(e.target.value)}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8, padding: 10, fontSize: 13 }} />
          <button className="btn btn-primary bs">Publish</button>
        </form>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {(list || []).map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--bd)' }}>
            <span style={{ fontSize: 13, flex: 1 }}>{a.message}</span>
            {a.active && <span className="badge badge-gn">Active</span>}
            <button className="btn bs" onClick={() => toggle(a.id, a.active)}>{a.active ? 'Hide' : 'Show'}</button>
          </div>
        ))}
        {list && list.length === 0 && <div style={{ padding: 20, color: 'var(--mu)', fontSize: 13 }}>কোনো announcement নেই</div>}
      </div>
    </div>
  );
}
