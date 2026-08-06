import Head from 'next/head';
import Link from 'next/link';
import { PLANS, TRIAL_DAYS } from '../lib/plans';

const FEATURES = [
  { ic: '🏠', bg: '#EAF0FE', color: '#3B6DF0', title: 'মাল্টি-ফ্ল্যাট ম্যানেজমেন্ট', desc: 'একাধিক ফ্ল্যাট/মেস একটা ড্যাশবোর্ড থেকে পরিচালনা করুন — ভাড়া, সিট, টেনেন্ট সব একসাথে।' },
  { ic: '💰', bg: '#E6F9EF', color: '#12B76A', title: 'অটোমেটিক রেন্ট ট্র্যাকিং', desc: 'কে পেইড, কে ডিউ, কে পার্শিয়াল — এক নজরে দেখুন, ম্যানুয়াল হিসাব লাগবে না।' },
  { ic: '📊', bg: '#F1EBFE', color: '#8B5CF6', title: 'রিপোর্ট ও অ্যানালিটিক্স', desc: 'মাসওয়ারি আয়-ব্যয়, অকুপ্যান্সি ট্রেন্ড, প্রফিট/লস — সব গ্রাফে দেখুন।' },
  { ic: '👥', bg: '#FEF3E2', color: '#F79009', title: 'টিম অ্যাক্সেস (PIN ভিত্তিক)', desc: 'কেয়ারটেকার বা ম্যানেজারকে আলাদা PIN দিয়ে সীমিত অ্যাক্সেস দিন।' },
  { ic: '🧾', bg: '#FDEDEC', color: '#F04438', title: 'রিসিট ও এক্সপেন্স ট্র্যাকার', desc: 'প্রতিটা পেমেন্টের রিসিট, বাজার খরচ, ইউটিলিটি বিল — সব এক জায়গায়।' },
  { ic: '📱', bg: '#EAF0FE', color: '#3B6DF0', title: 'মোবাইল থেকেই চালান', desc: 'ফোন, ট্যাব বা কম্পিউটার — যেকোনো ডিভাইস থেকে অ্যাক্সেস করুন।' },
];

export default function Landing() {
  return (
    <>
      <Head>
        <title>Mess Manager — মেস/হোস্টেল ম্যানেজমেন্ট সফটওয়্যার</title>
        <meta name="description" content="বাংলাদেশের মেস ও হোস্টেল মালিকদের জন্য সবচেয়ে সহজ ভাড়া ও হিসাব ব্যবস্থাপনা সফটওয়্যার। ৭ দিন ফ্রি ট্রায়াল।" />
      </Head>

      <nav className="nav-bar">
        <div className="nav-inner">
          <div className="brand"><span className="ic">🏠</span>Mess Manager</div>
          <div className="nav-links">
            <a href="#features">ফিচার</a>
            <a href="#pricing">প্রাইসিং</a>
            <Link href="/login">লগইন</Link>
          </div>
          <Link href="/signup" className="btn btn-primary">ফ্রি ট্রায়াল শুরু করুন</Link>
        </div>
      </nav>

      <section className="hero">
        <h1>আপনার মেস চালান <span>এক ক্লিকে</span>, খাতা-কলম ছাড়াই</h1>
        <p>ভাড়া, সিট, টেনেন্ট, খরচ — সব হিসাব ডিজিটাল করুন। বাংলাদেশের মেস ও হোস্টেল মালিকদের জন্য বানানো সহজ, নির্ভরযোগ্য সফটওয়্যার।</p>
        <div className="hero-ctas">
          <Link href="/signup" className="btn btn-primary btn-lg">{TRIAL_DAYS} দিন ফ্রি ট্রায়াল</Link>
          <a href="#features" className="btn btn-lg">ফিচার দেখুন</a>
        </div>
      </section>

      <section className="section" id="features">
        <h2 className="section-title">যা যা পাচ্ছেন</h2>
        <p className="section-sub">মেস চালানোর প্রতিটা ঝামেলার সমাধান একটা অ্যাপে</p>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="card feat-card" key={f.title}>
              <div className="feat-ic" style={{ background: f.bg, color: f.color }}>{f.ic}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="pricing" style={{ background: '#fff' }}>
        <h2 className="section-title">সহজ প্রাইসিং</h2>
        <p className="section-sub">কোনো হিডেন চার্জ নেই, যেকোনো সময় ক্যান্সেল করুন</p>
        <div className="pricing-grid">
          <div className="card price-card">
            <div className="price-plan">{PLANS.monthly.label}</div>
            <div className="price-amt">৳{PLANS.monthly.price}<span>/মাস</span></div>
            <div className="price-tagline">{PLANS.monthly.tagline}</div>
            <ul className="price-feats">
              <li>আনলিমিটেড টেনেন্ট</li>
              <li>৩টি পর্যন্ত ফ্ল্যাট</li>
              <li>bKash/Nagad পেমেন্ট</li>
              <li>ইমেইল/হোয়াটসঅ্যাপ সাপোর্ট</li>
            </ul>
            <Link href="/signup" className="btn btn-block">শুরু করুন</Link>
          </div>
          <div className="card price-card featured">
            <span className="price-tag">সবচেয়ে জনপ্রিয়</span>
            <div className="price-plan">{PLANS.yearly.label}</div>
            <div className="price-amt">৳{PLANS.yearly.price}<span>/বছর</span></div>
            <div className="price-tagline">{PLANS.yearly.tagline}</div>
            <ul className="price-feats">
              <li>আনলিমিটেড টেনেন্ট</li>
              <li>৫টি পর্যন্ত ফ্ল্যাট</li>
              <li>bKash/Nagad পেমেন্ট</li>
              <li>প্রায়োরিটি সাপোর্ট</li>
            </ul>
            <Link href="/signup" className="btn btn-primary btn-block">শুরু করুন</Link>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div>© {new Date().getFullYear()} Mess Manager. সর্বস্বত্ব সংরক্ষিত।</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/terms">শর্তাবলী</Link>
          <Link href="/privacy">প্রাইভেসি পলিসি</Link>
        </div>
      </footer>
    </>
  );
}
