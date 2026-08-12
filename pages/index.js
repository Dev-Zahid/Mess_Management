import Head from 'next/head';
import Link from 'next/link';
import { PLANS, TRIAL_DAYS } from '../lib/plans';

const PAINS = [
  { ic: 'ti-notebook', title: 'খাতা-কলমে হিসাব রাখা', desc: 'কে ভাড়া দিয়েছে, কে দেয়নি — খাতা হারিয়ে গেলে বা ছিঁড়ে গেলে সব হিসাব শেষ।' },
  { ic: 'ti-alert-triangle', title: 'হিসাবে ভুল হয়ে যাওয়া', desc: 'ম্যানুয়াল হিসাবে ভুল হওয়া স্বাভাবিক — মাস শেষে মিলাতে গিয়ে মাথা খারাপ হয়ে যায়।' },
  { ic: 'ti-clock-hour-4', title: 'সময় নষ্ট হওয়া', desc: 'প্রতি মাসে কে কত দিলো, কার কত বাকি — এসব হিসাব করতেই ঘণ্টার পর ঘণ্টা চলে যায়।' },
];

const STEPS = [
  { n: '১', title: 'ফ্রি অ্যাকাউন্ট বানান', desc: 'মেসের নাম, আপনার নাম ও ফোন নম্বর দিয়ে ৩০ সেকেন্ডে সাইনআপ করুন — কোনো কার্ড লাগবে না।' },
  { n: '২', title: 'ফ্ল্যাট ও টেনেন্ট যোগ করুন', desc: 'আপনার ফ্ল্যাট/রুম/সিট সেটআপ করুন, তারপর বর্তমান টেনেন্টদের তথ্য একে একে যোগ করুন।' },
  { n: '৩', title: 'ভাড়া তোলা শুরু করুন', desc: 'পেমেন্ট রেকর্ড করুন, রিসিট দিন, কে বাকি আছে তা এক নজরে দেখুন — সব ডিজিটাল, সব নির্ভুল।' },
];

const FEATURES = [
  { ic: 'ti-building-community', bg: '#EAF0FE', color: '#3B6DF0', title: 'মাল্টি-ফ্ল্যাট ম্যানেজমেন্ট', desc: 'একাধিক ফ্ল্যাট/মেস একটা ড্যাশবোর্ড থেকে পরিচালনা করুন — ভাড়া, সিট, টেনেন্ট সব একসাথে।' },
  { ic: 'ti-cash', bg: '#E6F9EF', color: '#12B76A', title: 'অটোমেটিক রেন্ট ট্র্যাকিং', desc: 'কে পেইড, কে ডিউ, কে পার্শিয়াল — এক নজরে দেখুন, carry-forward হিসাবও অটোমেটিক হয়।' },
  { ic: 'ti-chart-bar', bg: '#F1EBFE', color: '#8B5CF6', title: 'রিপোর্ট ও অ্যানালিটিক্স', desc: 'মাসওয়ারি আয়-ব্যয়, অকুপ্যান্সি ট্রেন্ড, প্রফিট/লস — সব গ্রাফে দেখুন।' },
  { ic: 'ti-users', bg: '#FEF3E2', color: '#F79009', title: 'টিম অ্যাক্সেস (ফোন + PIN)', desc: 'কেয়ারটেকার বা ম্যানেজারকে নিজের ফোন নম্বর ও PIN দিয়ে সীমিত অ্যাক্সেস দিন — কে কী দেখবে/এডিট করবে আপনি ঠিক করুন।' },
  { ic: 'ti-receipt', bg: '#FDEDEC', color: '#F04438', title: 'রিসিট ও এক্সপেন্স ট্র্যাকার', desc: 'প্রতিটা পেমেন্টের রিসিট, বাজার খরচ, ইউটিলিটি বিল, ওনার পকেট — সব এক জায়গায়।' },
  { ic: 'ti-device-mobile', bg: '#EAF0FE', color: '#3B6DF0', title: 'মোবাইল থেকেই চালান', desc: 'ফোন, ট্যাব বা কম্পিউটার — যেকোনো ডিভাইস থেকে অ্যাক্সেস করুন, ইনস্টল করার দরকার নেই।' },
  { ic: 'ti-brand-whatsapp', bg: '#E6F9EF', color: '#12B76A', title: 'হোয়াটসঅ্যাপ রিমাইন্ডার', desc: 'বকেয়া থাকা টেনেন্টকে এক ক্লিকে হোয়াটসঅ্যাপে রিমাইন্ডার পাঠান।' },
  { ic: 'ti-lock', bg: '#F1EBFE', color: '#8B5CF6', title: 'সম্পূর্ণ ডেটা প্রাইভেসি', desc: 'আপনার মেসের ডেটা শুধু আপনার — কারো সাথে শেয়ার বা বিক্রি করা হয় না।' },
];

const FAQS = [
  { q: 'ফ্রি ট্রায়ালে কি কার্ড লাগবে?', a: `না। ${TRIAL_DAYS} দিনের ফ্রি ট্রায়ালে কোনো কার্ড বা পেমেন্ট তথ্য লাগবে না — শুধু নাম ও ফোন নম্বর দিয়ে সাইনআপ করলেই হবে।` },
  { q: 'পেমেন্ট কীভাবে করব?', a: 'bKash বা Nagad দিয়ে সরাসরি Send Money করে Transaction ID সাবমিট করবেন। ২৪ ঘণ্টার মধ্যে ভেরিফাই করে অ্যাকাউন্ট একটিভ করে দেওয়া হয়।' },
  { q: 'আমার ডেটা কি নিরাপদ?', a: 'হ্যাঁ। আপনার মেসের সব তথ্য (টেনেন্ট, পেমেন্ট, হিসাব) এনক্রিপ্টেড ডেটাবেসে সংরক্ষিত থাকে এবং শুধু আপনি ও আপনার অনুমোদিত টিম মেম্বাররাই অ্যাক্সেস করতে পারবেন।' },
  { q: 'একাধিক ফ্ল্যাট/মেস চালাতে পারব?', a: 'হ্যাঁ, প্ল্যান অনুযায়ী একাধিক ফ্ল্যাট একই অ্যাকাউন্ট থেকে পরিচালনা করা যায়।' },
  { q: 'আমার কেয়ারটেকার বা ম্যানেজারকে অ্যাক্সেস দিতে পারব?', a: 'হ্যাঁ — Team/PINs থেকে তাদের ফোন নম্বর ও PIN দিয়ে যোগ করুন, তারা নিজেরাই লগইন করে শুধু আপনার দেওয়া অনুমতি অনুযায়ী কাজ করতে পারবে।' },
  { q: 'সাবস্ক্রিপশন বন্ধ করে দিলে আমার ডেটা কী হবে?', a: 'আপনার সব ডেটা আপনার মালিকানাধীন থাকে। অ্যাকাউন্ট বন্ধ করলেও নির্দিষ্ট সময় পর্যন্ত ডেটা এক্সপোর্ট করে নেওয়ার সুযোগ পাবেন।' },
];

function MiniDashboardPreview() {
  return (
    <div className="preview-card" aria-hidden="true">
      <div className="preview-top">
        <div className="preview-dot" style={{ background: '#F04438' }} />
        <div className="preview-dot" style={{ background: '#F79009' }} />
        <div className="preview-dot" style={{ background: '#12B76A' }} />
      </div>
      <div className="preview-body">
        <div className="preview-stats">
          <div className="preview-stat">
            <div className="preview-stat-l">সক্রিয় টেনেন্ট</div>
            <div className="preview-stat-v" style={{ color: '#3B6DF0' }}>৯</div>
          </div>
          <div className="preview-stat">
            <div className="preview-stat-l">এই মাসে কালেক্টেড</div>
            <div className="preview-stat-v" style={{ color: '#12B76A' }}>৳২৬,৫০০</div>
          </div>
          <div className="preview-stat">
            <div className="preview-stat-l">মোট বকেয়া</div>
            <div className="preview-stat-v" style={{ color: '#F04438' }}>৳০</div>
          </div>
        </div>
        <div className="preview-rows">
          {[
            ['ZAHID', '৳৩,৫০০', 'Paid'],
            ['AHAD', '৳৩,৫০০', 'Paid'],
            ['JAHID', '৳৩,৫০০', 'Paid'],
          ].map(([name, amt, status]) => (
            <div className="preview-row" key={name}>
              <span>{name}</span><span style={{ color: '#12B76A', fontWeight: 700 }}>{amt}</span>
              <span className="preview-badge">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <Head>
        <title>Mess Manager — মেস/হোস্টেল ভাড়া ও হিসাব ব্যবস্থাপনা সফটওয়্যার</title>
        <meta name="description" content="বাংলাদেশের মেস ও হোস্টেল মালিকদের জন্য সবচেয়ে সহজ ভাড়া ও হিসাব ব্যবস্থাপনা সফটওয়্যার। খাতা-কলম বাদ দিয়ে ডিজিটাল হিসাব রাখুন। ৭ দিন ফ্রি ট্রায়াল, কোনো কার্ড লাগবে না।" />
      </Head>

      <nav className="nav-bar">
        <div className="nav-inner">
          <div className="brand"><span className="ic"><i className="ti ti-building-community"></i></span>Mess Manager</div>
          <div className="nav-links">
            <a href="#how">কীভাবে কাজ করে</a>
            <a href="#features">ফিচার</a>
            <a href="#pricing">প্রাইসিং</a>
            <a href="#faq">প্রশ্নোত্তর</a>
            <Link href="/login">লগইন</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" className="btn bs nav-login-mobile">লগইন</Link>
            <Link href="/signup" className="btn btn-primary">ফ্রি ট্রায়াল শুরু করুন</Link>
          </div>
        </div>
      </nav>

      <section className="hero hero-split">
        <div className="hero-text">
          <div className="hero-tag"><i className="ti ti-map-pin"></i> বাংলাদেশের মেস মালিকদের জন্য তৈরি</div>
          <h1>মেস চালান <span>খাতা-কলম ছাড়াই</span>, ভুলবিহীন হিসাবে</h1>
          <p>ভাড়া, সিট, টেনেন্ট, খরচ — সব হিসাব একটা অ্যাপে ডিজিটাল করুন। মোবাইল থেকেই সব দেখুন, বকেয়ার হোয়াটসঅ্যাপ রিমাইন্ডার পাঠান, মাস শেষে হিসাব মিলাতে আর মাথা ঘামাতে হবে না।</p>
          <div className="hero-ctas">
            <Link href="/signup" className="btn btn-primary btn-lg">{TRIAL_DAYS} দিন ফ্রি ট্রায়াল শুরু করুন</Link>
            <a href="#how" className="btn btn-lg">কীভাবে কাজ করে দেখুন</a>
          </div>
          <div className="hero-trust">
            <span><i className="ti ti-circle-check"></i> কার্ড লাগবে না</span>
            <span><i className="ti ti-circle-check"></i> ৩০ সেকেন্ডে সাইনআপ</span>
            <span><i className="ti ti-circle-check"></i> যেকোনো সময় বাতিল করুন</span>
          </div>
        </div>
        <div className="hero-visual">
          <MiniDashboardPreview />
        </div>
      </section>

      <section className="section" style={{ background: '#fff', paddingTop: 40 }}>
        <h2 className="section-title">মেস চালাতে গিয়ে যেসব ঝামেলায় পড়েন</h2>
        <p className="section-sub">এই সমস্যাগুলোর কথা মনে হচ্ছে? আপনি একা নন।</p>
        <div className="feat-grid" style={{ maxWidth: 920 }}>
          {PAINS.map((p) => (
            <div className="card feat-card" key={p.title} style={{ textAlign: 'center' }}>
              <div className="feat-ic" style={{ background: '#FDEDEC', color: '#F04438', margin: '0 auto 16px' }}><i className={`ti ${p.ic}`}></i></div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2 className="section-title">কীভাবে কাজ করে</h2>
        <p className="section-sub">মাত্র ৩টা ধাপ — কারিগরি কিছু জানার দরকার নেই</p>
        <div className="steps-row">
          {STEPS.map((s) => (
            <div className="step-card" key={s.n}>
              <div className="step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="features" style={{ background: '#fff' }}>
        <h2 className="section-title">যা যা পাচ্ছেন</h2>
        <p className="section-sub">মেস চালানোর প্রতিটা ঝামেলার সমাধান একটা অ্যাপে</p>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="card feat-card" key={f.title}>
              <div className="feat-ic" style={{ background: f.bg, color: f.color }}><i className={`ti ${f.ic}`}></i></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="security-band">
          <div className="security-ic"><i className="ti ti-shield-check"></i></div>
          <div>
            <h3>আপনার ডেটা সম্পূর্ণ নিরাপদ ও একান্ত আপনার</h3>
            <p>আপনার মেসের তথ্য, টেনেন্টদের ডেটা, পেমেন্ট রেকর্ড — কোনো কিছুই তৃতীয় পক্ষের কাছে শেয়ার বা বিক্রি করা হয় না। এনক্রিপ্টেড সংযোগ, নিয়মিত ব্যাকআপ, এবং শুধুমাত্র আপনার অনুমোদিত টিমের অ্যাক্সেস।</p>
          </div>
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

      <section className="section" id="faq">
        <h2 className="section-title">প্রশ্নোত্তর</h2>
        <p className="section-sub">আরও প্রশ্ন থাকলে সরাসরি যোগাযোগ করুন</p>
        <div className="faq-list">
          {FAQS.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}<i className="ti ti-chevron-down"></i></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <div className="final-cta">
          <h2>আজই শুরু করুন — {TRIAL_DAYS} দিন সম্পূর্ণ ফ্রি</h2>
          <p>কোনো কার্ড লাগবে না। ৩০ সেকেন্ডে সাইনআপ করুন, আজ থেকেই ডিজিটাল হিসাব রাখা শুরু করুন।</p>
          <Link href="/signup" className="btn btn-primary btn-lg">ফ্রি ট্রায়াল শুরু করুন</Link>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="brand"><span className="ic"><i className="ti ti-building-community"></i></span>Mess Manager</div>
            <p>বাংলাদেশের মেস ও হোস্টেল মালিকদের জন্য সহজ ভাড়া ও হিসাব ব্যবস্থাপনা সফটওয়্যার।</p>
          </div>
          <div className="foot-col">
            <h4>প্রোডাক্ট</h4>
            <a href="#how">কীভাবে কাজ করে</a>
            <a href="#features">ফিচার</a>
            <a href="#pricing">প্রাইসিং</a>
          </div>
          <div className="foot-col">
            <h4>অ্যাকাউন্ট</h4>
            <Link href="/login">লগইন</Link>
            <Link href="/signup">সাইনআপ</Link>
          </div>
          <div className="foot-col">
            <h4>আইনি</h4>
            <Link href="/terms">শর্তাবলী</Link>
            <Link href="/privacy">প্রাইভেসি পলিসি</Link>
          </div>
        </div>
        <div className="foot-bottom">© {new Date().getFullYear()} Mess Manager. সর্বস্বত্ব সংরক্ষিত।</div>
      </footer>
    </>
  );
}
