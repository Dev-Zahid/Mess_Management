import { useState } from 'react';
import { requireOrgUser } from '../lib/guard';

export async function getServerSideProps({ req }) {
  const result = await requireOrgUser(req);
  if (result.redirect) return result;
  const { status } = result;
  if (status === 'expired' || status === 'suspended') {
    return { redirect: { destination: '/billing?locked=1', permanent: false } };
  }
  return { props: {} };
}

const SHEET_LABELS = {
  flats: 'Flats', tenants: 'Tenants', rentPayments: 'Rent Payments',
  servicePayments: 'Service Payments', advancePayments: 'Advance Payments',
};

function PreviewResult({ preview, busy, onCommit }) {
  return (
    <div className="card" style={{ padding: 22, marginBottom: 20 }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 14 }}>ধাপ ২ — যাচাই করুন</h3>

      {preview.foundSheets && (
        <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 14 }}>
          যা খুঁজে পাওয়া গেছে:{' '}
          {Object.keys(SHEET_LABELS).map((k) => (
            <span key={k} style={{ marginRight: 10 }}>
              {SHEET_LABELS[k]}: {preview.foundSheets[k] ? <b style={{ color: 'var(--gn)' }}>✓ "{preview.foundSheets[k]}"</b> : <span style={{ color: 'var(--rd)' }}>পাওয়া যায়নি</span>}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['ফ্ল্যাট', preview.counts.flats],
          ['টেনেন্ট', preview.counts.tenants],
          ['রেন্ট পেমেন্ট', preview.counts.rentPayments],
          ['সার্ভিস পেমেন্ট', preview.counts.servicePayments],
          ['অ্যাডভান্স পেমেন্ট', preview.counts.advancePayments],
        ].map(([label, val]) => (
          <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mu)', fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      {preview.errors.length > 0 && (
        <div className="alert alert-error">
          <b>{preview.errors.length}টা ভুল পাওয়া গেছে — আগে ঠিক করে আবার চেষ্টা করুন:</b>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {preview.errors.slice(0, 15).map((e, i) => <li key={i} style={{ fontSize: 12.5, marginBottom: 3 }}>{e}</li>)}
          </ul>
          {preview.errors.length > 15 && <p style={{ fontSize: 12 }}>...আরও {preview.errors.length - 15}টা ভুল আছে</p>}
        </div>
      )}

      {preview.warnings.length > 0 && (
        <div className="alert alert-warn">
          <b>সতর্কতা:</b>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {preview.warnings.slice(0, 10).map((w, i) => <li key={i} style={{ fontSize: 12.5, marginBottom: 3 }}>{w}</li>)}
          </ul>
        </div>
      )}

      {preview.errors.length === 0 && (
        <>
          <div className="alert alert-ok">সব ঠিক আছে! নিচে Confirm করলে ডেটা যোগ হয়ে যাবে।</div>
          <button className="btn btn-primary" disabled={busy} onClick={onCommit}>
            {busy ? 'ইমপোর্ট হচ্ছে...' : '✓ Confirm করে ইমপোর্ট করুন'}
          </button>
        </>
      )}
    </div>
  );
}

function ResultCard({ result }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="alert alert-ok" style={{ marginBottom: 0 }}>
        <b>✓ সফলভাবে ইমপোর্ট হয়েছে!</b>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {result.flatsCreated} টা ফ্ল্যাট, {result.tenantsCreated} জন টেনেন্ট, {result.rentPaymentsInserted} টা রেন্ট
          পেমেন্ট, {result.servicePaymentsInserted} টা সার্ভিস পেমেন্ট, {result.advancePaymentsInserted} টা অ্যাডভান্স
          পেমেন্ট যোগ হয়েছে।
        </div>
      </div>
      <a href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>ড্যাশবোর্ডে দেখুন →</a>
    </div>
  );
}

export default function ImportPage() {
  const [mode, setMode] = useState('sheet');
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  function reset() {
    setPreview(null); setErr(''); setResult(null);
  }

  async function runExcelPreview() {
    if (!file) return setErr('আগে একটা ফাইল বেছে নিন');
    setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'preview');
      const res = await fetch('/api/import/process', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ফাইল পড়া যায়নি');
      setPreview(data);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function runExcelCommit() {
    setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'commit');
      const res = await fetch('/api/import/process', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ইমপোর্ট ব্যর্থ হয়েছে');
      setResult(data); setPreview(null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function runSheetPreview() {
    if (!sheetUrl.trim()) return setErr('আগে Google Sheet-এর লিংক দিন');
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/import/google-sheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl, mode: 'preview' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'শিট পড়া যায়নি');
      setPreview(data);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function runSheetCommit() {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/import/google-sheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl, mode: 'commit' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ইমপোর্ট ব্যর্থ হয়েছে');
      setResult(data); setPreview(null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start', paddingTop: 50 }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="auth-logo" style={{ marginBottom: 0 }}>
            <span className="ic"><i className="ti ti-building-community"></i></span><span className="tx">ডেটা ইমপোর্ট</span>
          </div>
          <a href="/dashboard" className="btn bs" style={{ marginLeft: 'auto' }}>← ড্যাশবোর্ডে ফিরুন</a>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>আগের ডেটা ইমপোর্ট করুন</h1>
        <p style={{ color: 'var(--mu)', fontSize: 13.5, marginBottom: 20 }}>
          আপনার আগের ফ্ল্যাট, টেনেন্ট, আর গত কয়েক মাসের ভাড়ার হিসাব একসাথে যোগ করে দিন — নতুন করে টাইপ
          করার দরকার নেই।
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className={`btn ${mode === 'sheet' ? 'btn-primary' : ''}`} onClick={() => { setMode('sheet'); reset(); }}>
            <i className="ti ti-brand-google-drive"></i> Google Sheet থেকে
          </button>
          <button className={`btn ${mode === 'excel' ? 'btn-primary' : ''}`} onClick={() => { setMode('excel'); reset(); }}>
            <i className="ti ti-file-spreadsheet"></i> Excel ফাইল আপলোড
          </button>
        </div>

        {err && <div className="alert alert-error">{err}</div>}

        {mode === 'sheet' && (
          <div className="card" style={{ padding: 22, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>ধাপ ১ — আপনার Google Sheet-এর লিংক দিন</h3>
            <div className="alert alert-warn" style={{ fontSize: 12.5 }}>
              <b>শেয়ার করা আছে কিনা চেক করুন:</b> Google Sheet খুলে উপরে ডানদিকে <b>Share</b> বাটনে ক্লিক
              করুন → "General access"-এ <b>Anyone with the link</b> (Viewer) সিলেক্ট করুন → Done। তারপর
              ব্রাউজারের ঠিকানা বার থেকে পুরো লিংক কপি করে নিচে বসান।
            </div>
            <input
              type="text" placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14 }}
            />
            <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 14 }}>
              আপনার শিটে <b>Flats</b> ও <b>Tenants</b> নামের ট্যাব (বা কাছাকাছি নাম) থাকতে হবে। ভাড়ার
              হিসাবের জন্য <b>Rent Payments</b>, <b>Service Payments</b>, <b>Advance Payments</b> ট্যাবও
              দেওয়া যাবে (না থাকলেও চলবে)। কলামের নাম হুবহু না মিললেও (যেমন "Name" বা "Tenant Name" দুটোই
              চলবে) সিস্টেম নিজে থেকে বোঝার চেষ্টা করবে — মিলাতে না পারলে Preview-তে স্পষ্ট জানিয়ে দেবে।
            </p>
            <button className="btn btn-primary bs" disabled={busy} onClick={runSheetPreview}>
              {busy ? 'পড়া হচ্ছে...' : 'প্রিভিউ দেখুন'}
            </button>
          </div>
        )}

        {mode === 'excel' && (
          <>
            <div className="card" style={{ padding: 22, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>ধাপ ১ — টেমপ্লেট ডাউনলোড করুন</h3>
              <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 14 }}>
                এই Excel ফাইলে প্রতিটা ট্যাবে একটা উদাহরণ সারি দেওয়া আছে — সেভাবে আপনার তথ্য বসিয়ে দিন।
              </p>
              <a href="/api/import/template" className="btn btn-primary bs"><i className="ti ti-download"></i> টেমপ্লেট ডাউনলোড করুন</a>
            </div>
            <div className="card" style={{ padding: 22, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>ধাপ ২ — পূরণ করা ফাইল আপলোড করুন</h3>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0] || null); reset(); }} style={{ marginBottom: 14, fontSize: 13 }} />
              <div>
                <button className="btn btn-primary bs" disabled={!file || busy} onClick={runExcelPreview}>
                  {busy ? 'পড়া হচ্ছে...' : 'প্রিভিউ দেখুন'}
                </button>
              </div>
            </div>
          </>
        )}

        {preview && <PreviewResult preview={preview} busy={busy} onCommit={mode === 'sheet' ? runSheetCommit : runExcelCommit} />}
        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}
