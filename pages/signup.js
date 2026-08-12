import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { TRIAL_DAYS } from '../lib/plans';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ messName: '', ownerName: '', phone: '', pin: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (form.pin.length < 4) return setErr('PIN কমপক্ষে ৪ ডিজিট হতে হবে');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'কিছু ভুল হয়েছে');
      router.push('/dashboard');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-logo"><span className="ic"><i className="ti ti-building-community"></i></span><span className="tx">Mess Manager</span></div>
        <div className="auth-title">ফ্রি ট্রায়াল শুরু করুন</div>
        <div className="auth-sub">{TRIAL_DAYS} দিন সম্পূর্ণ ফ্রি — কোনো কার্ড লাগবে না</div>

        {err && <div className="alert alert-error">{err}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>মেস / ফ্ল্যাটের নাম</label>
            <input required value={form.messName} onChange={(e) => update('messName', e.target.value)} placeholder="যেমন: Advocate House Mess" />
          </div>
          <div className="field">
            <label>আপনার নাম</label>
            <input required value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} placeholder="যেমন: মোঃ জাহিদ" />
          </div>
          <div className="field">
            <label>মোবাইল নম্বর</label>
            <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div className="field">
            <label>৪-৬ ডিজিটের PIN সেট করুন</label>
            <input required type="password" inputMode="numeric" value={form.pin} onChange={(e) => update('pin', e.target.value)} placeholder="••••" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'তৈরি হচ্ছে...' : 'ট্রায়াল শুরু করুন'}
          </button>
        </form>

        <div className="auth-foot">
          আগে থেকে অ্যাকাউন্ট আছে? <Link href="/login">লগইন করুন</Link>
        </div>
      </div>
    </div>
  );
}
