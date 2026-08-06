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
