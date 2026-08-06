import { useState } from 'react';
import { requireOrgUser } from '../lib/guard';
import { PLANS, PAYMENT_NUMBERS } from '../lib/plans';

export async function getServerSideProps({ req }) {
  const result = await requireOrgUser(req);
  if (result.redirect) return result;
  const { org, status } = result;

  const daysLeft =
    status === 'trial'
      ? Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / 86400000))
      : status === 'active'
      ? Math.max(0, Math.ceil((new Date(org.subscriptionEndsAt) - new Date()) / 86400000))
      : 0;

  return { props: { orgId: org.id, status, daysLeft } };
}

export default function Billing({ orgId, status, daysLeft, locked }) {
  const [method, setMethod] = useState('bKash');
  const [plan, setPlan] = useState('monthly');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submitPayment(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/billing/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          senderNumber,
          trxId,
          planApplied: plan,
          amount: PLANS[plan].price,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'সাবমিট করা যায়নি');
      setMsg({ type: 'ok', text: 'পেমেন্ট সাবমিট হয়েছে। ২৪ ঘণ্টার মধ্যে ভেরিফাই হয়ে অ্যাকাউন্ট একটিভ হবে।' });
      setTrxId('');
      setSenderNumber('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>বিলিং ও সাবস্ক্রিপশন</h1>

        {status === 'expired' && (
          <div className="alert alert-error">
            আপনার {status === 'expired' ? 'ট্রায়াল/সাবস্ক্রিপশন' : ''} শেষ হয়ে গেছে। নিচে পেমেন্ট সাবমিট করে আবার অ্যাক্টিভ করুন।
          </div>
        )}
        {status === 'trial' && (
          <div className="alert alert-warn">ফ্রি ট্রায়ালের <b>{daysLeft} দিন</b> বাকি আছে।</div>
        )}
        {status === 'active' && (
          <div className="alert alert-ok">সাবস্ক্রিপশন সক্রিয় — আরও <b>{daysLeft} দিন</b> বাকি।</div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>প্ল্যান বেছে নিন</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {Object.values(PLANS).map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className="btn"
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  height: 'auto',
                  padding: '14px',
                  borderColor: plan === p.id ? 'var(--pr)' : 'var(--bd)',
                  background: plan === p.id ? 'var(--pr2)' : '#fff',
                  color: plan === p.id ? 'var(--pr)' : 'var(--tx)',
                }}
              >
                <span style={{ fontWeight: 800 }}>{p.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>৳{p.price}</span>
              </button>
            ))}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>পেমেন্ট পাঠান</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['bKash', 'Nagad'].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className="btn"
                style={{
                  flex: 1,
                  borderColor: method === m ? 'var(--pr)' : 'var(--bd)',
                  background: method === m ? 'var(--pr2)' : '#fff',
                  color: method === m ? 'var(--pr)' : 'var(--tx)',
                  fontWeight: 800,
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="alert alert-warn" style={{ marginBottom: 18 }}>
            <b>{method}</b> নম্বর <b>{PAYMENT_NUMBERS[method]}</b>-এ <b>Send Money</b> করে ৳{PLANS[plan].price} পাঠান, তারপর নিচে
            Transaction ID দিয়ে সাবমিট করুন। ২৪ ঘণ্টার মধ্যে ভেরিফাই করে আপনার অ্যাকাউন্ট একটিভ করে দেওয়া হবে।
          </div>

          {msg && <div className={`alert ${msg.type === 'ok' ? 'alert-ok' : 'alert-error'}`}>{msg.text}</div>}

          <form onSubmit={submitPayment}>
            <div className="field">
              <label>যে নম্বর থেকে পাঠিয়েছেন</label>
              <input required value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div className="field">
              <label>Transaction ID (TrxID)</label>
              <input required value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="যেমন: 8N7A6B5C4D" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'সাবমিট হচ্ছে...' : `পেমেন্ট সাবমিট করুন (৳${PLANS[plan].price})`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
