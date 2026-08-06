import Layout from '../../components/Layout';
import { pageContext } from '../../lib/guard';

export async function getServerSideProps({ req }) {
  const ctx = await pageContext(req);
  if (ctx.redirect) return ctx;
  return { props: { layoutProps: ctx.layoutProps } };
}

export default function OwnerPanelPage({ layoutProps }) {
  return (
    <Layout {...layoutProps}>
      <div className="dash-topbar"><div className="dash-title">ওনার প্যানেল</div></div>
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🚧</div>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>শীঘ্রই আসছে</h3>
        <p style={{ fontSize: 13.5, color: 'var(--mu)', maxWidth: 420, margin: '0 auto' }}>
          Owner payments, owner advances, এবং investments ট্র্যাকিং — এই তিনটা এখনো পোর্ট করা হয়নি। এটা Phase 2-এর
          পরবর্তী অংশে যোগ করা হবে।
        </p>
      </div>
    </Layout>
  );
}
