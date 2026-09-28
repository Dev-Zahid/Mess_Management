// ══════════════════════════════════════════════════════════════
//  Faithful port of Code.gs — every exported function here matches the
//  original Google Apps Script function of the same name: same params,
//  same return shape ({success,message,...} for mutations; plain arrays/
//  objects for reads). The only structural difference: everything is
//  scoped by `orgId` (derived server-side from the web-login session,
//  never from client input) instead of "whichever spreadsheet this
//  script is bound to". Skipped on purpose: initSheets/reArrangeAllSheets/
//  performBackup/backupNow/autoWeeklyBackup/installAutomationTriggers/
//  removeAutomationTriggers/onOpen/menuBackupNow — these managed Google
//  Sheets/Drive housekeeping that a real Postgres database (with its own
//  automatic backups on Supabase) doesn't need.
// ══════════════════════════════════════════════════════════════
import { prisma } from './db';
import { hashPin } from './auth';
import { genId, N } from './gen-id';
import { defaultPerms, normalizePerms, normalizeSource, MONTHS } from './perms';

function S(v) {
  return String(v || '').trim();
}
function isoDate(v) {
  if (!v) return '';
  try {
    const d = v instanceof Date ? v : new Date(String(v));
    if (isNaN(d.getTime())) return S(v);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch (e) {
    return S(v);
  }
}

// ── In-app team members: every login-capable person is a `User` row now
//    (Owner, Management, SuperAdmin) — identity comes from the *session*
//    (set by /api/rpc.js from the signed cookie), never from client input.
//    This is what makes it impossible for one org's data/actions to leak
//    into another's, and impossible to "log in as" someone by guessing a
//    PIN string sent in a request body. ──
async function getUsers(orgId) {
  const rows = await prisma.user.findMany({ where: { orgId }, orderBy: { createdAt: 'asc' } });
  return rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    name: r.name,
    role: r.role === 'Owner' || r.role === 'Admin' ? 'Admin' : 'Management',
    flats: r.flats ? r.flats.split(',').map((x) => x.trim()).filter(Boolean) : ['ALL'],
    perms: normalizePerms(r.perms),
  }));
}

// Central access-check used by every mutating function. `session` is
// {uid, orgId, role} straight from the verified JWT cookie.
async function authCheck(session, opts) {
  opts = opts || {};
  const me = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!me || me.orgId !== session.orgId) return { ok: false, message: 'Session invalid — আবার লগইন করুন।' };

  const isAdmin = me.role === 'Owner' || me.role === 'Admin';
  if (isAdmin) return { ok: true, role: 'Admin', name: me.name, flats: ['ALL'], perms: null };

  if (opts.adminOnly) return { ok: false, message: 'শুধু Admin এই কাজটি করতে পারবেন।' };

  const flats = me.flats ? me.flats.split(',').map((x) => x.trim()).filter(Boolean) : ['ALL'];
  const perms = normalizePerms(me.perms);

  if (opts.resource && opts.action) {
    const p = perms[opts.resource] || { v: false, e: false, d: false };
    const allowed = opts.action === 'view' ? p.v : opts.action === 'edit' ? p.e : opts.action === 'delete' ? p.d : false;
    if (!allowed) return { ok: false, message: 'এই কাজের অনুমতি আপনার নেই। Admin-কে জিজ্ঞেস করুন।' };
  }
  if (opts.flatId) {
    const allowed = flats.includes('ALL') || flats.includes(opts.flatId);
    if (!allowed) return { ok: false, message: 'এই flat-এ আপনার অ্যাক্সেস নেই।' };
  }
  return { ok: true, role: 'Management', name: me.name, flats, perms };
}

async function getUsersForAdmin(session) {
  const ac = await authCheck(session, { adminOnly: true });
  if (!ac.ok) return [];
  return getUsers(session.orgId);
}

// Owner (or Admin) adds a new Management team member — this creates a
// real login: the member goes to /login and signs in with their OWN
// phone + PIN, no shared-device PIN screen involved.
async function addUser(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { adminOnly: true });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!/^01\d{9}$/.test(S(d.phone))) return { success: false, message: 'সঠিক ১১ ডিজিট মোবাইল নম্বর দিন (01XXXXXXXXX)।' };
  if (!/^\d{4,6}$/.test(S(d.pin))) return { success: false, message: 'PIN 4-6 digit number হতে হবে।' };
  const existing = await prisma.user.findUnique({ where: { phone: S(d.phone) } });
  if (existing) return { success: false, message: 'এই ফোন নম্বর দিয়ে আগে থেকেই একটা অ্যাকাউন্ট আছে।' };

  const pinHash = await hashPin(S(d.pin));
  await prisma.user.create({
    data: {
      orgId: session.orgId,
      phone: S(d.phone),
      name: d.name || '',
      pinHash,
      role: d.role === 'Admin' ? 'Admin' : 'Management',
      flats: d.role === 'Admin' ? 'ALL' : (d.flats || []).join(','),
      perms: d.role === 'Admin' ? '' : JSON.stringify(normalizePerms(JSON.stringify(d.perms || {}))),
    },
  });
  return { success: true, message: `${d.name} যোগ হয়েছে — এখন উনি ${d.phone} নম্বর ও নিজের PIN দিয়ে /login-এ সরাসরি ঢুকতে পারবেন।` };
}

async function updateUser(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { adminOnly: true });
  if (!ac.ok) return { success: false, message: ac.message };
  const existing = await prisma.user.findFirst({ where: { id: d.id, orgId: session.orgId } });
  if (!existing) return { success: false, message: 'Not found' };

  const data = {
    name: d.name ?? existing.name,
    role: d.role === 'Admin' ? 'Admin' : 'Management',
    flats: d.role === 'Admin' ? 'ALL' : (d.flats || []).join(','),
    perms: d.role === 'Admin' ? '' : JSON.stringify(normalizePerms(JSON.stringify(d.perms || {}))),
  };
  if (d.phone && S(d.phone) !== existing.phone) {
    if (!/^01\d{9}$/.test(S(d.phone))) return { success: false, message: 'সঠিক ১১ ডিজিট মোবাইল নম্বর দিন।' };
    const conflict = await prisma.user.findUnique({ where: { phone: S(d.phone) } });
    if (conflict) return { success: false, message: 'এই ফোন নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত।' };
    data.phone = S(d.phone);
  }
  if (d.pin) {
    if (!/^\d{4,6}$/.test(S(d.pin))) return { success: false, message: 'PIN 4-6 digit number হতে হবে।' };
    data.pinHash = await hashPin(S(d.pin));
  }

  await prisma.user.update({ where: { id: d.id }, data });
  return { success: true, message: 'User updated' };
}

async function deleteUser(session, userId) {
  const ac = await authCheck(session, { adminOnly: true });
  if (!ac.ok) return { success: false, message: ac.message };
  if (userId === session.uid) return { success: false, message: 'নিজের নিজের একাউন্ট ডিলিট করতে পারবেন না।' };
  const existing = await prisma.user.findFirst({ where: { id: userId, orgId: session.orgId } });
  if (!existing) return { success: false, message: 'Not found' };
  await prisma.user.delete({ where: { id: userId } });
  return { success: true, message: 'Deleted' };
}


// ── Seat conflict guard ──────────────────────────────────────────────
async function findSeatConflict(orgId, flatId, room, excludeTenantId) {
  if (!S(flatId) || !S(room)) return null;
  const tenants = await getTenants(orgId);
  return (
    tenants.find(
      (t) =>
        t.flatId === flatId &&
        t.status === 'Active' &&
        S(t.room).toLowerCase() === S(room).toLowerCase() &&
        t.id !== excludeTenantId
    ) || null
  );
}

// ── Carry-forward: excess paid in previous month only (ported verbatim) ──
export function calcCarryFwd(tid, month, year, allPays, rent) {
  const mi = MONTHS.indexOf(month);
  if (mi < 0) return 0;
  const prevMon = MONTHS[mi === 0 ? 11 : mi - 1];
  const prevYr = mi === 0 ? year - 1 : year;
  const prevPays = allPays.filter((p) => p.tid === tid && p.month === prevMon && p.year === N(prevYr));
  const prevPaid = prevPays.reduce((a, p) => a + N(p.paid), 0);
  const prevCarry = prevPays.length ? N(prevPays[0].carryIn) : 0;
  const prevEffDue = Math.max(0, rent - prevCarry);
  return Math.max(0, prevPaid - prevEffDue);
}

// ── Flats CRUD ───────────────────────────────────────────────────────
function parseRoomsJSON(raw) {
  try {
    const v = S(raw);
    if (!v) return [];
    const arr = JSON.parse(v);
    if (!Array.isArray(arr)) return [];
    return arr.map((r) => ({ name: S(r.name), seats: Array.isArray(r.seats) ? r.seats.map(S).filter(Boolean) : [] }));
  } catch (e) {
    return [];
  }
}

async function getFlats(orgId) {
  const rows = await prisma.flat.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    ownerName: r.ownerName,
    flatRent: r.flatRent,
    totalRooms: r.totalRooms,
    totalSeats: r.totalSeats,
    notes: r.notes,
    rooms: parseRoomsJSON(r.roomsJson),
  }));
}

async function addFlat(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'flats', action: 'edit' });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!S(d.id) || !S(d.name)) return { success: false, message: 'Flat ID ও Name আবশ্যক।' };
  const existing = await prisma.flat.findUnique({ where: { orgId_id: { orgId, id: d.id } } });
  if (existing) return { success: false, message: 'Flat ID already exists!' };
  await prisma.flat.create({
    data: {
      orgId,
      id: d.id,
      name: d.name,
      address: d.address || '',
      ownerName: d.ownerName || '',
      flatRent: N(d.flatRent),
      totalRooms: N(d.totalRooms),
      totalSeats: N(d.totalSeats),
      notes: d.notes || '',
      roomsJson: JSON.stringify(d.rooms || []),
    },
  });
  return { success: true, message: 'Flat added' };
}

async function updateFlat(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'flats', action: 'edit', flatId: d.id });
  if (!ac.ok) return { success: false, message: ac.message };
  const existing = await prisma.flat.findUnique({ where: { orgId_id: { orgId, id: d.id } } });
  if (!existing) return { success: false, message: 'Not found' };
  await prisma.flat.update({
    where: { orgId_id: { orgId, id: d.id } },
    data: {
      name: d.name,
      address: d.address || '',
      ownerName: d.ownerName || '',
      flatRent: N(d.flatRent),
      totalRooms: N(d.totalRooms),
      totalSeats: N(d.totalSeats),
      notes: d.notes || '',
      roomsJson: JSON.stringify(d.rooms || []),
    },
  });
  return { success: true, message: 'Flat updated' };
}

async function deleteFlat(session, id) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'flats', action: 'delete', flatId: id });
  if (!ac.ok) return { success: false, message: ac.message };
  const existing = await prisma.flat.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  await prisma.flat.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Flat deleted' };
}

// ── Tenants CRUD ─────────────────────────────────────────────────────
async function getTenants(orgId) {
  const rows = await prisma.tenant.findMany({ where: { orgId } });
  return rows.map((r) => ({
    flatId: r.flatId,
    id: r.id,
    name: r.name,
    room: r.room,
    phone: r.phone,
    rent: r.rent,
    serviceCharge: r.serviceCharge,
    advanceDue: r.advanceDue,
    entry: isoDate(r.entry),
    leftDate: isoDate(r.leftDate),
    ...effectiveTenantStatus(r.status, isoDate(r.leftDate)),
    notes: r.notes,
  }));
}

// A tenant who is marked "Left" with a leave date that is still in the
// future keeps occupying the seat and shows as Active until that date has
// passed. `rawStatus` is what is actually stored (used by the edit form so
// the leave date isn't lost), `status` is what the rest of the app uses.
function todayDhaka() {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}
function effectiveTenantStatus(rawStatus, leftDate) {
  const raw = rawStatus || 'Active';
  if (raw === 'Left' && leftDate && leftDate > todayDhaka()) {
    return { status: 'Active', rawStatus: raw, leaving: true };
  }
  return { status: raw, rawStatus: raw, leaving: false };
}

async function addTenant(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'tenants', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!S(d.name)) return { success: false, message: 'Tenant Name আবশ্যক।' };
  // Tenant ID is always generated on the server (T001, T002, ...), so it
  // can never clash and nobody has to type it.
  const allTenantIds = (await prisma.tenant.findMany({ where: { orgId }, select: { id: true } })).map((x) => x.id);
  d.id = genId('T', allTenantIds);
  if ((d.status || 'Active') === 'Active') {
    const conflict = await findSeatConflict(orgId, d.flatId, d.room, null);
    if (conflict) {
      return {
        success: false,
        message: `⚠ Seat "${d.room}" already occupied by ${conflict.name}! Room/Seat বদলে দিন অথবা আগের tenant-কে Left করুন।`,
      };
    }
  }
  await prisma.tenant.create({
    data: {
      orgId,
      id: d.id,
      flatId: d.flatId || '',
      name: d.name,
      room: d.room || '',
      phone: d.phone || '',
      rent: N(d.rent),
      serviceCharge: N(d.serviceCharge),
      advanceDue: N(d.advanceDue),
      entry: d.entry || '',
      leftDate: '',
      status: d.status || 'Active',
      notes: d.notes || '',
    },
  });
  return { success: true, message: 'Tenant added (' + d.id + ')', id: d.id };
}

async function updateTenant(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'tenants', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if ((d.status || 'Active') === 'Active') {
    const conflict = await findSeatConflict(orgId, d.flatId, d.room, d.id);
    if (conflict) {
      return {
        success: false,
        message: `⚠ Seat "${d.room}" already occupied by ${conflict.name}! Room/Seat বদলে দিন অথবা আগের tenant-কে Left করুন।`,
      };
    }
  }
  const existing = await prisma.tenant.findUnique({ where: { orgId_id: { orgId, id: d.id } } });
  if (!existing) return { success: false, message: 'Not found' };
  let leftDate = d.leftDate || '';
  if (d.status === 'Left' && existing.status !== 'Left' && !leftDate) leftDate = isoDate(new Date());
  if (d.status === 'Active') leftDate = '';
  await prisma.tenant.update({
    where: { orgId_id: { orgId, id: d.id } },
    data: {
      flatId: d.flatId || '',
      name: d.name,
      room: d.room || '',
      phone: d.phone || '',
      rent: N(d.rent),
      serviceCharge: N(d.serviceCharge),
      advanceDue: N(d.advanceDue),
      entry: d.entry || '',
      leftDate,
      status: d.status,
      notes: d.notes || '',
    },
  });
  return { success: true, message: 'Tenant updated', leftDate };
}

// Final settlement: marks the tenant Left (on `exitDate`, today by default)
// and — if a refund amount is given — records the advance refund as an
// "Advance Money" expense tagged `REFUND:<tenantId>`. That makes the
// refund show up under Owner Panel → Refunded / Spent and reduces the
// held Advance balance, instead of staying in "Collected" forever.
async function settleTenant(session, d) {
  const orgId = session.orgId;
  const tid = S(d.tid);
  const t = await prisma.tenant.findUnique({ where: { orgId_id: { orgId, id: tid } } });
  if (!t) return { success: false, message: 'Tenant not found' };
  const ac = await authCheck(session, { resource: 'tenants', action: 'edit', flatId: t.flatId });
  if (!ac.ok) return { success: false, message: ac.message };

  const exitDate = S(d.exitDate) || todayDhaka();
  const refund = Math.max(0, N(d.refundAmount));
  if (refund > 0) {
    const allExp = await prisma.serviceExpense.findMany({ where: { orgId } });
    if (allExp.some((e) => S(e.notes).startsWith('REFUND:' + t.id))) {
      return { success: false, message: 'এই tenant-এর advance ফেরত আগেই record করা হয়েছে।' };
    }
    const paidRows = await prisma.advancePayment.findMany({ where: { orgId, tid: t.id } });
    const advPaid = paidRows.reduce((a, p) => a + N(p.paid), 0);
    if (refund > advPaid) {
      return { success: false, message: `Refund (৳${refund}) জমা advance (৳${advPaid}) এর বেশি হতে পারে না।` };
    }
    const today = todayDhaka();
    await prisma.serviceExpense.create({
      data: {
        orgId,
        id: genId('EXP-', allExp.map((e) => e.id)),
        date: exitDate < today ? exitDate : today,
        flatId: t.flatId || '',
        title: `Advance refund — ${t.name} (${t.id})`,
        amount: refund,
        source: normalizeSource('Advance Money'),
        notes: 'REFUND:' + t.id,
      },
    });
  }
  await prisma.tenant.update({
    where: { orgId_id: { orgId, id: t.id } },
    data: { status: 'Left', leftDate: exitDate },
  });
  return { success: true, message: refund > 0 ? `Settled — ৳${refund} advance refund record হয়েছে` : 'Settled & marked Left', refunded: refund };
}

async function deleteTenant(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.tenant.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'tenants', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.tenant.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Rent payments ────────────────────────────────────────────────────
async function getRentPayments(orgId) {
  const rows = await prisma.rentPayment.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id, date: r.date, flatId: r.flatId, tid: r.tid, name: r.name, room: r.room,
    month: r.month, year: r.year, rentAmount: r.rentAmount, paid: r.paid, carryIn: r.carryIn,
    method: r.method, receipt: r.receipt,
  }));
}

async function addRentPayment(session, d) {
  const orgId = session.orgId;
  const tenants = await getTenants(orgId);
  const tenant = tenants.find((t) => t.id === d.tid);
  if (!tenant) return { success: false, message: 'Tenant not found' };
  const ac = await authCheck(session, { resource: 'rent', action: 'edit', flatId: tenant.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (tenant.status !== 'Active') return { success: false, message: 'Only Active tenants' };
  if (N(d.paid) <= 0) return { success: false, message: 'Amount must be > 0' };

  const allPays = await getRentPayments(orgId);
  const carryIn = calcCarryFwd(d.tid, d.month, N(d.year), allPays, N(tenant.rent));
  const payId = genId('R', allPays.map((p) => p.id));
  const receipt = genId('RCP-', allPays.map((p) => p.receipt));

  await prisma.rentPayment.create({
    data: {
      orgId, id: payId, date: d.date, flatId: tenant.flatId || d.flatId || '', tid: d.tid,
      name: tenant.name, room: tenant.room, month: d.month, year: N(d.year),
      rentAmount: N(tenant.rent), paid: N(d.paid), carryIn, method: d.method || '', receipt,
    },
  });
  return { success: true, message: 'Payment saved', receipt, carryIn };
}

async function deleteRentPayment(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.rentPayment.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'rent', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.rentPayment.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Service payments ─────────────────────────────────────────────────
async function getServicePayments(orgId) {
  const rows = await prisma.servicePayment.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id, date: r.date, flatId: r.flatId, tid: r.tid, name: r.name,
    serviceTotal: r.serviceTotal, paid: r.paid, method: r.method, receipt: r.receipt,
  }));
}

async function addServicePayment(session, d) {
  const orgId = session.orgId;
  const tenants = await getTenants(orgId);
  const tenant = tenants.find((t) => t.id === d.tid);
  if (!tenant || tenant.status !== 'Active') return { success: false, message: 'Only Active tenants' };
  const ac = await authCheck(session, { resource: 'service', action: 'edit', flatId: tenant.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (N(d.paid) <= 0) return { success: false, message: 'Amount must be > 0' };

  const all = await getServicePayments(orgId);
  const payId = genId('S', all.map((p) => p.id));
  const receipt = genId('SRCP-', all.map((p) => p.receipt));
  await prisma.servicePayment.create({
    data: {
      orgId, id: payId, date: d.date, flatId: tenant.flatId || '', tid: d.tid, name: tenant.name,
      serviceTotal: N(tenant.serviceCharge), paid: N(d.paid), method: d.method || '', receipt,
    },
  });
  return { success: true, message: 'Saved', receipt };
}

async function deleteServicePayment(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.servicePayment.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'service', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.servicePayment.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Advance payments ─────────────────────────────────────────────────
async function getAdvancePayments(orgId) {
  const rows = await prisma.advancePayment.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id, date: r.date, flatId: r.flatId, tid: r.tid, name: r.name,
    advanceTotal: r.advanceTotal, paid: r.paid, method: r.method, receipt: r.receipt,
  }));
}

async function addAdvancePayment(session, d) {
  const orgId = session.orgId;
  const tenants = await getTenants(orgId);
  const tenant = tenants.find((t) => t.id === d.tid);
  if (!tenant || tenant.status !== 'Active') return { success: false, message: 'Only Active tenants' };
  const ac = await authCheck(session, { resource: 'advance', action: 'edit', flatId: tenant.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (N(d.paid) <= 0) return { success: false, message: 'Amount must be > 0' };

  const all = await getAdvancePayments(orgId);
  const payId = genId('A', all.map((p) => p.id));
  const receipt = genId('ARCP-', all.map((p) => p.receipt));
  await prisma.advancePayment.create({
    data: {
      orgId, id: payId, date: d.date, flatId: tenant.flatId || '', tid: d.tid, name: tenant.name,
      advanceTotal: N(tenant.advanceDue), paid: N(d.paid), method: d.method || '', receipt,
    },
  });
  return { success: true, message: 'Saved', receipt };
}

async function deleteAdvancePayment(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.advancePayment.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'advance', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.advancePayment.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Service expenses ─────────────────────────────────────────────────
async function getServiceExpenses(orgId) {
  const rows = await prisma.serviceExpense.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id, date: r.date, flatId: r.flatId, title: r.title, amount: r.amount,
    source: normalizeSource(r.source), notes: r.notes,
  }));
}

async function addServiceExpense(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'expenses', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!S(d.title) || N(d.amount) <= 0) return { success: false, message: 'Title ও valid Amount আবশ্যক।' };
  const all = await getServiceExpenses(orgId);
  await prisma.serviceExpense.create({
    data: {
      orgId, id: genId('EXP-', all.map((e) => e.id)), date: d.date, flatId: d.flatId || '',
      title: d.title, amount: N(d.amount), source: normalizeSource(d.source), notes: d.notes || '',
    },
  });
  return { success: true, message: 'Expense added' };
}

async function deleteServiceExpense(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.serviceExpense.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'expenses', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.serviceExpense.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Owner payments ───────────────────────────────────────────────────
async function getOwnerPayments(orgId) {
  const rows = await prisma.ownerPayment.findMany({ where: { orgId } });
  return rows.map((r) => ({
    id: r.id, date: r.date, flatId: r.flatId, month: r.month, year: r.year,
    flatRent: r.flatRent, paid: r.paid, method: r.method, notes: r.notes,
  }));
}

async function addOwnerPayment(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'owners', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  const all = await getOwnerPayments(orgId);
  await prisma.ownerPayment.create({
    data: {
      orgId, id: genId('OP-', all.map((p) => p.id)), date: d.date, flatId: d.flatId || '',
      month: d.month || '', year: N(d.year), flatRent: N(d.flatRent), paid: N(d.paid),
      method: d.method || '', notes: d.notes || '',
    },
  });
  return { success: true, message: 'Saved' };
}

async function deleteOwnerPayment(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.ownerPayment.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'owners', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.ownerPayment.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Owner advance money ──────────────────────────────────────────────
async function getOwnerAdvances(orgId) {
  const rows = await prisma.ownerAdvance.findMany({ where: { orgId } });
  return rows.map((r) => ({ id: r.id, date: r.date, flatId: r.flatId, amount: r.amount, method: r.method, notes: r.notes }));
}

async function addOwnerAdvance(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'owners', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!S(d.flatId)) return { success: false, message: 'Flat select করুন।' };
  if (N(d.amount) <= 0) return { success: false, message: 'Valid amount দিন।' };
  const all = await getOwnerAdvances(orgId);
  await prisma.ownerAdvance.create({
    data: {
      orgId, id: genId('OA-', all.map((a) => a.id)), date: d.date, flatId: d.flatId,
      amount: N(d.amount), method: d.method || 'Cash', notes: d.notes || '',
    },
  });
  return { success: true, message: 'Owner advance added' };
}

async function updateOwnerAdvance(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'owners', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  if (!S(d.flatId)) return { success: false, message: 'Flat select করুন।' };
  if (N(d.amount) <= 0) return { success: false, message: 'Valid amount দিন।' };
  const existing = await prisma.ownerAdvance.findUnique({ where: { orgId_id: { orgId, id: S(d.id) } } });
  if (!existing) return { success: false, message: 'Not found' };
  await prisma.ownerAdvance.update({
    where: { orgId_id: { orgId, id: S(d.id) } },
    data: { date: d.date, flatId: d.flatId, amount: N(d.amount), method: d.method || 'Cash', notes: d.notes || '' },
  });
  return { success: true, message: 'Owner advance updated' };
}

async function deleteOwnerAdvance(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.ownerAdvance.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'owners', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.ownerAdvance.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Investments ──────────────────────────────────────────────────────
async function getInvestments(orgId) {
  const rows = await prisma.investment.findMany({ where: { orgId } });
  return rows.map((r) => ({ id: r.id, date: r.date, flatId: r.flatId, title: r.title, amount: r.amount, notes: r.notes }));
}

async function addInvestment(session, d) {
  const orgId = session.orgId;
  const ac = await authCheck(session, { resource: 'investments', action: 'edit', flatId: d.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  const all = await getInvestments(orgId);
  await prisma.investment.create({
    data: {
      orgId, id: genId('INV-', all.map((i) => i.id)), date: d.date, flatId: d.flatId || '',
      title: d.title, amount: N(d.amount), notes: d.notes || '',
    },
  });
  return { success: true, message: 'Investment added' };
}

async function deleteInvestment(session, id) {
  const orgId = session.orgId;
  const existing = await prisma.investment.findUnique({ where: { orgId_id: { orgId, id } } });
  if (!existing) return { success: false, message: 'Not found' };
  const ac = await authCheck(session, { resource: 'investments', action: 'delete', flatId: existing.flatId });
  if (!ac.ok) return { success: false, message: ac.message };
  await prisma.investment.delete({ where: { orgId_id: { orgId, id } } });
  return { success: true, message: 'Deleted' };
}

// ── Bulk load — single round-trip, exactly like the original. Called with
//    ZERO client-supplied identity: `session` already tells us exactly who
//    is asking (from the verified cookie), so there is no PIN/name check
//    left to do here at all — that whole login handshake is gone. ──
async function getAllData(session) {
  const orgId = session.orgId;
  const me = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!me || me.orgId !== orgId) return { authError: true };

  const isAdmin = me.role === 'Owner' || me.role === 'Admin';
  const flats_ = me.flats ? me.flats.split(',').map((x) => x.trim()).filter(Boolean) : ['ALL'];
  const perms_ = normalizePerms(me.perms);
  const inScope = (fid) => isAdmin || !fid || flats_.includes(fid);

  const [flatsAll, tenantsAll, rentAll, svcAll, advAll] = await Promise.all([
    getFlats(orgId), getTenants(orgId), getRentPayments(orgId), getServicePayments(orgId), getAdvancePayments(orgId),
  ]);

  const flats = flatsAll.filter((f) => isAdmin || flats_.includes(f.id));
  const tenants = tenantsAll.filter((t) => inScope(t.flatId));
  const rentPays = rentAll.filter((p) => inScope(p.flatId));
  const svcPays = svcAll.filter((p) => inScope(p.flatId));
  const advPays = advAll.filter((p) => inScope(p.flatId));

  const [expenses, ownerPays, ownerAdvances, investments] = await Promise.all([
    isAdmin || perms_.expenses.v ? getServiceExpenses(orgId).then((r) => r.filter((e) => inScope(e.flatId))) : [],
    isAdmin || perms_.owners.v ? getOwnerPayments(orgId).then((r) => r.filter((p) => inScope(p.flatId))) : [],
    isAdmin || perms_.owners.v ? getOwnerAdvances(orgId).then((r) => r.filter((a) => inScope(a.flatId))) : [],
    isAdmin || perms_.investments.v ? getInvestments(orgId).then((r) => r.filter((i) => inScope(i.flatId))) : [],
  ]);

  return {
    flats, tenants, rentPays, svcPays, advPays,
    expenses, ownerPays, ownerAdvances, investments,
    _me: { id: me.id, name: me.name, role: isAdmin ? 'Admin' : 'Management', flats: flats_, perms: isAdmin ? null : perms_ },
  };
}

// ── Actor scope (BUGFIX) ─────────────────────────────────────────────
// Every `get*` handler below used to hand back ALL of an org's rows to
// ANY logged-in user of that org, because the dispatch table called the
// raw `getX(orgId)` reader directly — the resource-level view permission
// AND the per-user flat restriction (both enforced correctly inside
// getAllData()) were never applied to the individual get* RPCs. Since
// the frontend only *hides* buttons/tabs it doesn't have permission for
// (it still has the flat-out ability to call fn:"getOwnerPayments" etc.
// directly against /api/rpc), a Management user with e.g. Owner-Panel
// view turned OFF, or one restricted to a single flat, could previously
// read every other flat's tenants/payments and the whole org's owner
// panel / expenses / investments data just by calling that one RPC name.
// This mirrors getAllData()'s scoping so every read handler is safe to
// call directly, not just the bulk one.
async function actorScope(session) {
  const me = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!me || me.orgId !== session.orgId) return null;
  const isAdmin = me.role === 'Owner' || me.role === 'Admin';
  const flats = me.flats ? me.flats.split(',').map((x) => x.trim()).filter(Boolean) : ['ALL'];
  const perms = normalizePerms(me.perms);
  return { isAdmin, flats, perms };
}

function inFlatScope(scope, flatId) {
  if (scope.isAdmin) return true;
  if (!flatId) return true; // rows with no flat association are org-wide (e.g. legacy/imported data)
  return scope.flats.includes('ALL') || scope.flats.includes(flatId);
}

// Wraps a `getX(orgId)` reader so it's scoped to the caller's assigned
// flats, and — when `permResource` is given — also requires that the
// caller has `view` permission for that resource (Admin/Owner always do).
function scopedReader(getterFn, permResource) {
  return async (session) => {
    const scope = await actorScope(session);
    if (!scope) return [];
    if (permResource && !scope.isAdmin && !scope.perms[permResource]?.v) return [];
    const rows = await getterFn(session.orgId);
    return scope.isAdmin ? rows : rows.filter((r) => inFlatScope(scope, r.flatId));
  };
}

// ── Dispatch table exposed to /api/rpc.js ──────────────────────────────
// Reads are scoped via scopedReader() (see above); every mutation and
// getAllData take the full `session` object ({uid, orgId, role}) so they
// can identify the actor without any client-supplied identity string.
export const handlers = {
  getUsers: (session) => getUsers(session.orgId),
  getUsersForAdmin: (session) => getUsersForAdmin(session),
  addUser: (session, d) => addUser(session, d),
  updateUser: (session, d) => updateUser(session, d),
  deleteUser: (session, userId) => deleteUser(session, userId),

  getFlats: scopedReader(getFlats),
  addFlat: (session, d) => addFlat(session, d),
  updateFlat: (session, d) => updateFlat(session, d),
  deleteFlat: (session, id) => deleteFlat(session, id),

  getTenants: scopedReader(getTenants),
  addTenant: (session, d) => addTenant(session, d),
  updateTenant: (session, d) => updateTenant(session, d),
  deleteTenant: (session, id) => deleteTenant(session, id),
  settleTenant: (session, d) => settleTenant(session, d),

  getRentPayments: scopedReader(getRentPayments),
  addRentPayment: (session, d) => addRentPayment(session, d),
  deleteRentPayment: (session, id) => deleteRentPayment(session, id),

  getServicePayments: scopedReader(getServicePayments),
  addServicePayment: (session, d) => addServicePayment(session, d),
  deleteServicePayment: (session, id) => deleteServicePayment(session, id),

  getAdvancePayments: scopedReader(getAdvancePayments),
  addAdvancePayment: (session, d) => addAdvancePayment(session, d),
  deleteAdvancePayment: (session, id) => deleteAdvancePayment(session, id),

  getServiceExpenses: scopedReader(getServiceExpenses, 'expenses'),
  addServiceExpense: (session, d) => addServiceExpense(session, d),
  deleteServiceExpense: (session, id) => deleteServiceExpense(session, id),

  getOwnerPayments: scopedReader(getOwnerPayments, 'owners'),
  addOwnerPayment: (session, d) => addOwnerPayment(session, d),
  deleteOwnerPayment: (session, id) => deleteOwnerPayment(session, id),

  getOwnerAdvances: scopedReader(getOwnerAdvances, 'owners'),
  addOwnerAdvance: (session, d) => addOwnerAdvance(session, d),
  updateOwnerAdvance: (session, d) => updateOwnerAdvance(session, d),
  deleteOwnerAdvance: (session, id) => deleteOwnerAdvance(session, id),

  getInvestments: scopedReader(getInvestments, 'investments'),
  addInvestment: (session, d) => addInvestment(session, d),
  deleteInvestment: (session, id) => deleteInvestment(session, id),

  getAllData: (session) => getAllData(session),
};
