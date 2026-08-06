import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'mm_session';

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}
export async function verifyPin(pin, hash) {
  return bcrypt.compare(String(pin), hash);
}

// Create a signed session token for a user and set it as an httpOnly cookie.
export function createSession(res, user) {
  const token = jwt.sign(
    { uid: user.id, orgId: user.orgId, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  );
}

export function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
  );
}

// Read + verify the session cookie from an incoming request. Returns the
// decoded payload ({uid, orgId, role}) or null if missing/invalid.
export function getSession(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Given an org, figure out its effective status (auto-expires trial/
// subscription dates that have passed even if a cron hasn't run yet).
export function effectiveOrgStatus(org) {
  const now = new Date();
  if (org.status === 'suspended') return 'suspended';
  if (org.status === 'trial' && org.trialEndsAt && now > new Date(org.trialEndsAt)) {
    return 'expired';
  }
  if (org.status === 'active' && org.subscriptionEndsAt && now > new Date(org.subscriptionEndsAt)) {
    return 'expired';
  }
  return org.status;
}

// For API routes: verifies the session and returns {uid, orgId, role}, or
// null. API routes call this first and 401 immediately if it's null —
// keeps every data route consistently scoped to the caller's own org.
export function requireApiSession(req, res) {
  const session = getSession(req);
  if (!session || !session.orgId) {
    res.status(401).json({ error: 'লগইন করুন' });
    return null;
  }
  return session;
}
