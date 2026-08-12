import { requireOrgUser } from '../../lib/guard';

// This route exists only so /login and /signup can keep redirecting to
// "/dashboard" — it does the same auth + trial/expiry check every other
// protected page does, then hands off to the ORIGINAL, unmodified
// index.html (served as a static file at /app-shell.html, with only the
// google.script.run → fetch('/api/rpc') shim injected). No UI, no
// business logic lives in this Next.js page — the real app does.
export async function getServerSideProps({ req }) {
  const result = await requireOrgUser(req);
  if (result.redirect) return result;
  const { status } = result;

  if (status === 'expired' || status === 'suspended') {
    return { redirect: { destination: '/billing?locked=1', permanent: false } };
  }

  return { redirect: { destination: '/app-shell.html', permanent: false } };
}

export default function DashboardRedirect() {
  return null;
}
