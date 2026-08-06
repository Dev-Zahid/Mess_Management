import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'লগইন ব্যর্থ হয়েছে');
      router.push(data.role === 'SuperAdmin' ? '/admin' : '/dashboard');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-logo"><span className="ic">🏠</span><span className="tx">Mess Manager</span></div>
        <div className="auth-title">লগইন করুন</div>
        <div className="auth-sub">আপনার মোবাইল নম্বর ও PIN দিন</div>

        {err && <div className="alert alert-error">{err}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>মোবাইল নম্বর</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div className="field">
            <label>PIN</label>
            <input required type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'লগইন হচ্ছে...' : 'লগইন'}
          </button>
        </form>

        <div className="auth-foot">
          অ্যাকাউন্ট নেই? <Link href="/signup">ফ্রি ট্রায়াল শুরু করুন</Link>
        </div>
      </div>
    </div>
  );
}
