import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PLANS, TRIAL_DAYS } from '../lib/plans';
import { LANDING_TEXT } from '../lib/i18n-landing';

function MiniDashboardPreview({ t }) {
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
            <div className="preview-stat-l">{t.previewActiveTenants}</div>
            <div className="preview-stat-v" style={{ color: '#3B6DF0' }}>9</div>
          </div>
          <div className="preview-stat">
            <div className="preview-stat-l">{t.previewCollected}</div>
            <div className="preview-stat-v" style={{ color: '#12B76A' }}>৳26,500</div>
          </div>
          <div className="preview-stat">
            <div className="preview-stat-l">{t.previewDue}</div>
            <div className="preview-stat-v" style={{ color: '#F04438' }}>৳0</div>
          </div>
        </div>
        <div className="preview-rows">
          {[
            ['ZAHID', '৳3,500', 'Paid'],
            ['AHAD', '৳3,500', 'Paid'],
            ['JAHID', '৳3,500', 'Paid'],
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
  const [lang, setLang] = useState('bn');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mm_lang') : null;
    if (saved === 'bn' || saved === 'en') setLang(saved);
  }, []);

  function switchLang(next) {
    setLang(next);
    try { localStorage.setItem('mm_lang', next); } catch (e) {}
  }

  const t = LANDING_TEXT[lang];

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDesc} />
      </Head>

      <nav className="nav-bar">
        <div className="nav-inner">
          <div className="brand"><span className="ic"><i className="ti ti-building-community"></i></span>Mess Manager</div>
          <div className="nav-links">
            <a href="#how">{t.navHow}</a>
            <a href="#features">{t.navFeatures}</a>
            <a href="#pricing">{t.navPricing}</a>
            <a href="#faq">{t.navFaq}</a>
            <Link href="/login">{t.navLogin}</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="lang-switch">
              <button className={lang === 'bn' ? 'on' : ''} onClick={() => switchLang('bn')}>বাং</button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => switchLang('en')}>EN</button>
            </div>
            <Link href="/login" className="btn bs nav-login-mobile">{t.navLogin}</Link>
            <Link href="/signup" className="btn btn-primary">{t.navCta}</Link>
          </div>
        </div>
      </nav>

      <section className="hero hero-split">
        <div className="hero-text">
          <div className="hero-tag"><i className="ti ti-map-pin"></i> {t.heroTag}</div>
          <h1>{t.heroTitle1}<span>{t.heroTitleHighlight}</span>{t.heroTitle2}</h1>
          <p>{t.heroDesc}</p>
          <div className="hero-ctas">
            <Link href="/signup" className="btn btn-primary btn-lg">{TRIAL_DAYS}{t.heroCta1}</Link>
            <a href="#how" className="btn btn-lg">{t.heroCta2}</a>
          </div>
          <div className="hero-trust">
            <span><i className="ti ti-circle-check"></i> {t.heroTrust1}</span>
            <span><i className="ti ti-circle-check"></i> {t.heroTrust2}</span>
            <span><i className="ti ti-circle-check"></i> {t.heroTrust3}</span>
          </div>
        </div>
        <div className="hero-visual">
          <MiniDashboardPreview t={t} />
        </div>
      </section>

      <section className="section" style={{ background: '#fff', paddingTop: 40 }}>
        <h2 className="section-title">{t.painsTitle}</h2>
        <p className="section-sub">{t.painsSub}</p>
        <div className="feat-grid" style={{ maxWidth: 920 }}>
          {t.pains.map((p) => (
            <div className="card feat-card" key={p.title} style={{ textAlign: 'center' }}>
              <div className="feat-ic" style={{ background: '#FDEDEC', color: '#F04438', margin: '0 auto 16px' }}><i className={`ti ${p.ic}`}></i></div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2 className="section-title">{t.howTitle}</h2>
        <p className="section-sub">{t.howSub}</p>
        <div className="steps-row">
          {t.steps.map((s) => (
            <div className="step-card" key={s.n}>
              <div className="step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="features" style={{ background: '#fff' }}>
        <h2 className="section-title">{t.featuresTitle}</h2>
        <p className="section-sub">{t.featuresSub}</p>
        <div className="feat-grid">
          {t.features.map((f) => (
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
            <h3>{t.securityTitle}</h3>
            <p>{t.securityDesc}</p>
          </div>
        </div>
      </section>

      <section className="section" id="pricing" style={{ background: '#fff' }}>
        <h2 className="section-title">{t.pricingTitle}</h2>
        <p className="section-sub">{t.pricingSub}</p>
        <div className="pricing-grid">
          <div className="card price-card">
            <div className="price-plan">{PLANS.monthly.label}</div>
            <div className="price-amt">৳{PLANS.monthly.price}<span>{t.perMonth}</span></div>
            <div className="price-tagline">{PLANS.monthly.tagline}</div>
            <ul className="price-feats">
              {t.monthlyFeats.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/signup" className="btn btn-block">{t.startBtn}</Link>
          </div>
          <div className="card price-card featured">
            <span className="price-tag">{t.mostPopular}</span>
            <div className="price-plan">{PLANS.yearly.label}</div>
            <div className="price-amt">৳{PLANS.yearly.price}<span>{t.perYear}</span></div>
            <div className="price-tagline">{PLANS.yearly.tagline}</div>
            <ul className="price-feats">
              {t.yearlyFeats.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/signup" className="btn btn-primary btn-block">{t.startBtn}</Link>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <h2 className="section-title">{t.faqTitle}</h2>
        <p className="section-sub">{t.faqSub}</p>
        <div className="faq-list">
          {t.faqs.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}<i className="ti ti-chevron-down"></i></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <div className="final-cta">
          <h2>{t.finalCtaTitle}{TRIAL_DAYS}{t.finalCtaTitle2}</h2>
          <p>{t.finalCtaDesc}</p>
          <Link href="/signup" className="btn btn-primary btn-lg">{t.navCta}</Link>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="brand"><span className="ic"><i className="ti ti-building-community"></i></span>Mess Manager</div>
            <p>{t.footTagline}</p>
          </div>
          <div className="foot-col">
            <h4>{t.footProduct}</h4>
            <a href="#how">{t.navHow}</a>
            <a href="#features">{t.navFeatures}</a>
            <a href="#pricing">{t.navPricing}</a>
          </div>
          <div className="foot-col">
            <h4>{t.footAccount}</h4>
            <Link href="/login">{t.navLogin}</Link>
            <Link href="/signup">{t.footSignup}</Link>
          </div>
          <div className="foot-col">
            <h4>{t.footLegal}</h4>
            <Link href="/terms">{t.footTerms}</Link>
            <Link href="/privacy">{t.footPrivacy}</Link>
          </div>
        </div>
        <div className="foot-bottom">© {new Date().getFullYear()} Mess Manager. {t.footRights}</div>
      </footer>
    </>
  );
}
