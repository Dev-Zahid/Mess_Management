import * as XLSX from 'xlsx';
import { prisma } from './db';
import { genId, N } from './gen-id';
import { calcCarryFwd } from './rpc-handlers';
import { MONTHS } from './perms';

function S(v) {
  return String(v ?? '').trim();
}

function toIsoDate(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
}

// Parses the workbook into validated, structured data. Never touches the
// database — safe to call as many times as needed for a live preview.
export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const errors = [];
  const warnings = [];

  const flatRows = sheetRows(wb, 'Flats');
  const flats = [];
  const flatNames = new Set();
  flatRows.forEach((r, i) => {
    const name = S(r['Flat Name']);
    const rowNo = i + 2;
    if (!name) return;
    if (flatNames.has(name.toLowerCase())) {
      errors.push(`Flats sheet, row ${rowNo}: "${name}" নামের Flat একাধিকবার আছে — একবারই দিন।`);
      return;
    }
    flatNames.add(name.toLowerCase());
    flats.push({
      name,
      address: S(r['Address']),
      ownerName: S(r['Owner Name']),
      flatRent: N(r['Rent Per Seat']),
      totalRooms: N(r['Total Rooms']),
      totalSeats: N(r['Total Seats']),
    });
  });

  const tenantRows = sheetRows(wb, 'Tenants');
  const tenants = [];
  const tenantKeys = new Set();
  tenantRows.forEach((r, i) => {
    const name = S(r['Tenant Name']);
    const rowNo = i + 2;
    if (!name) return;
    const flatName = S(r['Flat Name']);
    const room = S(r['Room']);
    if (!flatName || !flatNames.has(flatName.toLowerCase())) {
      errors.push(`Tenants sheet, row ${rowNo}: Flat Name "${flatName}" — Flats ট্যাবে এই নামের কোনো ফ্ল্যাট পাওয়া যায়নি।`);
      return;
    }
    const key = `${flatName.toLowerCase()}|${name.toLowerCase()}|${room.toLowerCase()}`;
    if (tenantKeys.has(key)) {
      errors.push(`Tenants sheet, row ${rowNo}: "${name}" (Room ${room}) একাধিকবার আছে।`);
      return;
    }
    tenantKeys.add(key);
    const statusRaw = S(r['Status (Active/Left)']) || 'Active';
    const status = ['Active', 'Left', 'Inactive'].includes(statusRaw) ? statusRaw : 'Active';
    if (statusRaw && !['Active', 'Left', 'Inactive'].includes(statusRaw)) {
      warnings.push(`Tenants sheet, row ${rowNo}: Status "${statusRaw}" চেনা যায়নি, "Active" ধরা হয়েছে।`);
    }
    tenants.push({
      flatName, name, room,
      phone: S(r['Phone']),
      rent: N(r['Monthly Rent']),
      serviceCharge: N(r['Service Charge']),
      advanceDue: N(r['Advance Amount']),
      entry: toIsoDate(r['Entry Date (YYYY-MM-DD)']),
      status,
    });
  });

  function validatePaymentRows(sheetName, hasMonthYear) {
    const rows = sheetRows(wb, sheetName);
    const out = [];
    rows.forEach((r, i) => {
      const name = S(r['Tenant Name']);
      const rowNo = i + 2;
      if (!name) return;
      const room = S(r['Room']);
      const key = `${name.toLowerCase()}|${room.toLowerCase()}`;
      const tenantExists = tenants.some((t) => `${t.name.toLowerCase()}|${t.room.toLowerCase()}` === key);
      if (!tenantExists) {
        errors.push(`${sheetName} sheet, row ${rowNo}: "${name}" (Room ${room}) — Tenants ট্যাবে এই নাম+রুম মেলেনি।`);
        return;
      }
      const amount = N(r['Amount Paid']);
      if (amount <= 0) {
        errors.push(`${sheetName} sheet, row ${rowNo}: Amount Paid অবশ্যই ০-এর বেশি হতে হবে।`);
        return;
      }
      const date = toIsoDate(r['Payment Date (YYYY-MM-DD)']);
      if (!date) {
        errors.push(`${sheetName} sheet, row ${rowNo}: Payment Date সঠিক ফরম্যাটে (YYYY-MM-DD) নেই।`);
        return;
      }
      const row = { name, room, amount, date };
      if (hasMonthYear) {
        const month = S(r['Month']);
        const year = N(r['Year']);
        if (!MONTHS.includes(month)) {
          errors.push(`${sheetName} sheet, row ${rowNo}: Month "${month}" চেনা যায়নি — পুরো ইংরেজি নাম দিন (যেমন: July)।`);
          return;
        }
        if (!year || year < 2000 || year > 2100) {
          errors.push(`${sheetName} sheet, row ${rowNo}: Year "${r['Year']}" সঠিক না।`);
          return;
        }
        row.month = month;
        row.year = year;
      }
      out.push(row);
    });
    return out;
  }

  const rentPayments = validatePaymentRows('Rent Payments', true);
  const servicePayments = validatePaymentRows('Service Payments', true);
  const advancePayments = validatePaymentRows('Advance Payments', false);

  return {
    flats, tenants, rentPayments, servicePayments, advancePayments,
    errors, warnings,
    counts: {
      flats: flats.length, tenants: tenants.length,
      rentPayments: rentPayments.length, servicePayments: servicePayments.length,
      advancePayments: advancePayments.length,
    },
  };
}

// Actually writes the parsed+validated data into the database, scoped to
// orgId. Re-uses the exact same ID-generation and carry-forward logic as
// manual entry (addFlat/addTenant/addRentPayment in rpc-handlers.js) so
// imported history behaves identically to hand-entered history.
export async function commitImport(orgId, parsed) {
  const { flats, tenants, rentPayments, servicePayments, advancePayments } = parsed;

  const existingFlats = await prisma.flat.findMany({ where: { orgId } });
  const flatIdByName = new Map(existingFlats.map((f) => [f.name.toLowerCase(), f.id]));
  for (const f of flats) {
    const key = f.name.toLowerCase();
    if (flatIdByName.has(key)) continue;
    const id = genId('F', existingFlats.map((x) => x.id));
    await prisma.flat.create({
      data: { orgId, id, name: f.name, address: f.address, ownerName: f.ownerName, flatRent: f.flatRent, totalRooms: f.totalRooms, totalSeats: f.totalSeats, roomsJson: '[]' },
    });
    existingFlats.push({ id, name: f.name });
    flatIdByName.set(key, id);
  }

  const existingTenants = await prisma.tenant.findMany({ where: { orgId } });
  const tenantIdByKey = new Map(existingTenants.map((t) => [`${t.name.toLowerCase()}|${t.room.toLowerCase()}`, t.id]));
  const tenantFlatByKey = new Map();
  for (const t of tenants) {
    const key = `${t.name.toLowerCase()}|${t.room.toLowerCase()}`;
    tenantFlatByKey.set(key, t.flatName);
    if (tenantIdByKey.has(key)) continue;
    const flatId = flatIdByName.get(t.flatName.toLowerCase()) || '';
    const id = genId('T', existingTenants.map((x) => x.id));
    await prisma.tenant.create({
      data: { orgId, id, flatId, name: t.name, room: t.room, phone: t.phone, rent: t.rent, serviceCharge: t.serviceCharge, advanceDue: t.advanceDue, entry: t.entry, status: t.status },
    });
    existingTenants.push({ id, name: t.name, room: t.room });
    tenantIdByKey.set(key, id);
  }

  function tenantId(name, room) {
    return tenantIdByKey.get(`${name.toLowerCase()}|${room.toLowerCase()}`) || null;
  }
  function tenantFlatId(name, room) {
    const flatName = tenantFlatByKey.get(`${name.toLowerCase()}|${room.toLowerCase()}`);
    return flatName ? flatIdByName.get(flatName.toLowerCase()) || '' : '';
  }

  const existingRent = await prisma.rentPayment.findMany({ where: { orgId } });
  const rentLite = existingRent.map((p) => ({ tid: p.tid, month: p.month, year: p.year, paid: p.paid, carryIn: p.carryIn }));
  const sortedRent = [...rentPayments].sort((a, b) => a.year - b.year || MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
  let rentInserted = 0;
  for (const r of sortedRent) {
    const tid = tenantId(r.name, r.room);
    if (!tid) continue;
    const tenant = tenants.find((t) => t.name.toLowerCase() === r.name.toLowerCase() && t.room.toLowerCase() === r.room.toLowerCase());
    const rent = tenant ? tenant.rent : 0;
    const carryIn = calcCarryFwd(tid, r.month, r.year, rentLite, rent);
    const id = genId('R', existingRent.map((x) => x.id));
    await prisma.rentPayment.create({
      data: { orgId, id, date: r.date, flatId: tenantFlatId(r.name, r.room), tid, name: r.name, room: r.room, month: r.month, year: r.year, rentAmount: rent, paid: r.amount, carryIn, method: 'Import' },
    });
    existingRent.push({ id });
    rentLite.push({ tid, month: r.month, year: r.year, paid: r.amount, carryIn });
    rentInserted++;
  }

  const existingSvc = await prisma.servicePayment.findMany({ where: { orgId } });
  let svcInserted = 0;
  for (const s of servicePayments) {
    const tid = tenantId(s.name, s.room);
    if (!tid) continue;
    const tenant = tenants.find((t) => t.name.toLowerCase() === s.name.toLowerCase() && t.room.toLowerCase() === s.room.toLowerCase());
    const id = genId('S', existingSvc.map((x) => x.id));
    await prisma.servicePayment.create({
      data: { orgId, id, date: s.date, tid, name: s.name, serviceTotal: tenant ? tenant.serviceCharge : 0, paid: s.amount, method: 'Import' },
    });
    existingSvc.push({ id });
    svcInserted++;
  }

  const existingAdv = await prisma.advancePayment.findMany({ where: { orgId } });
  let advInserted = 0;
  for (const a of advancePayments) {
    const tid = tenantId(a.name, a.room);
    if (!tid) continue;
    const tenant = tenants.find((t) => t.name.toLowerCase() === a.name.toLowerCase() && t.room.toLowerCase() === a.room.toLowerCase());
    const id = genId('A', existingAdv.map((x) => x.id));
    await prisma.advancePayment.create({
      data: { orgId, id, date: a.date, tid, name: a.name, advanceTotal: tenant ? tenant.advanceDue : 0, paid: a.amount, method: 'Import' },
    });
    existingAdv.push({ id });
    advInserted++;
  }

  return {
    flatsCreated: flats.length,
    tenantsCreated: tenants.length,
    rentPaymentsInserted: rentInserted,
    servicePaymentsInserted: svcInserted,
    advancePaymentsInserted: advInserted,
  };
}
