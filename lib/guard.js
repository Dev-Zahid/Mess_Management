import { prisma } from './db';
import { getSession, effectiveOrgStatus } from './auth';

// Use inside getServerSideProps of any protected page. Redirects to /login
// if not authenticated, and to /billing (locked view) if the org's trial
// or subscription has expired — the actual page never renders in that case.
export async function requireOrgUser(req) {
  const session = getSession(req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  if (user.role === 'SuperAdmin') {
    return { redirect: { destination: '/admin', permanent: false } };
  }

  const org = await prisma.organization.findUnique({ where: { id: user.orgId } });
  if (!org) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const status = effectiveOrgStatus(org);
  return { user, org, status };
}

export async function requireSuperAdmin(req) {
  const session = getSession(req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== 'SuperAdmin') {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { user };
}

// Convenience wrapper for every /dashboard/* page: auth + trial/expiry gate
// + serializable props ready to hand straight to <Layout>.
export async function pageContext(req) {
  const result = await requireOrgUser(req);
  if (result.redirect) return result;
  const { user, org, status } = result;

  if (status === 'expired' || status === 'suspended') {
    return { redirect: { destination: '/billing?locked=1', permanent: false } };
  }

  const daysLeft =
    status === 'trial'
      ? Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / 86400000))
      : null;

  return {
    user,
    org,
    status,
    layoutProps: {
      orgName: org.name,
      userName: user.name,
      status,
      daysLeft,
    },
  };
}
