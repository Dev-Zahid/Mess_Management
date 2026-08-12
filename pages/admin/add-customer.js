import { useState } from 'react';
import { useRouter } from 'next/router';
import { requireSuperAdmin } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireSuperAdmin(req);
  if (result.redirect) return result;
  return { props: {} };
}

export default function AddCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ messName: '', ownerName: '', phone: '', pin: '', trialDays: 7 });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/add-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/admin/customers/${data.orgId}`);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-main" style={{ maxWidth: 480, margin: '0 auto', padding: '28px 24px' }}>
      <a href="/admin" className="btn bs" style={{ marginBottom: 16 }}>← Admin</a>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>নতুন কাস্টমার (Manual)</h1>
      <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 20 }}>অফলাইনে ফোনে সেল হলে এখান থেকে সরাসরি অ্যাকাউন্ট বানিয়ে দিন।</p>

      {err && <div className="alert alert-error">{err}</div>}

      <form onSubmit={submit} className="card" style={{ padding: 18 }}>
        <div className="field"><label>মেসের নাম</label><input required value={form.messName} onChange={(e) => setForm((f) => ({ ...f, messName: e.target.value }))} /></div>
        <div className="field"><label>মালিকের নাম</label><input required value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} /></div>
        <div className="field"><label>ফোন</label><input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
        <div className="field"><label>PIN</label><input required value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))} placeholder="1234" /></div>
        <div className="field"><label>Trial দিন</label><input type="number" value={form.trialDays} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} /></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}</button>
      </form>
    </div>
  );
}
