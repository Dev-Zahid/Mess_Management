import * as XLSX from 'xlsx';
import { prisma } from './db';
import { genId } from './gen-id';
import { calcCarryFwd } from './rpc-handlers';
import { MONTHS } from './perms';
import { validateImportData, SHEET_NAME_CANDIDATES } from './import-shared';

function sheetRowsByCandidates(wb, candidates) {
  for (const name of candidates) {
    if (wb.Sheets[name]) {
      return { rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false }), foundAs: name };
    }
  }
  return { rows: [], foundAs: null };
}

export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const rawRows = {};
  const foundSheets = {};
  for (const key of Object.keys(SHEET_NAME_CANDIDATES)) {
    const { rows, foundAs } = sheetRowsByCandidates(wb, SHEET_NAME_CANDIDATES[key]);
    rawRows[key] = rows;
    foundSheets[key] = foundAs;
  }
  return validateImportData(rawRows, foundSheets);
}

export async function commitImport(orgId, parsed) {
  const { flats, tenants, rentPayments, servicePayments, advancePayments } = parsed;

  const existingFlats = await prisma.flat.findMany({ where: { orgId } });
  const flatIdByName = new Map(existingFlats.map((f) => [f.name.toLowerCase(), f.id]));
  const flatIdByOrigId = new Map();
  for (const f of flats) {
    const key = f.name.toLowerCase();
    let realId = flatIdByName.get(key);
    if (!realId) {
      realId = genId('F', existingFlats.map((x) => x.id));
      await prisma.flat.create({
        data: { orgId, id: realId, name: f.name, address: f.address, ownerName: f.ownerName, flatRent: f.flatRent, totalRooms: f.totalRooms, totalSeats: f.totalSeats, roomsJson: '[]' },
      });
      existingFlats.push({ id: realId, name: f.name });
      flatIdByName.set(key, realId);
    }
    if (f.id) flatIdByOrigId.set(f.id.toLowerCase(), realId);
  }
  function resolveFlatId(resolved) {
    if (!resolved) return '';
    if (resolved.by === 'name') return flatIdByName.get(resolved.value) || '';
    if (resolved.by === 'id') return flatIdByOrigId.get(resolved.value) || '';
    return '';
  }

  const existingTenants = await prisma.tenant.findMany({ where: { orgId } });
  const tenantByKey = new Map(existingTenants.map((t) => [`${t.name.toLowerCase()}|${t.room.toLowerCase()}`, t]));
  const tenantByOrigId = new Map();
  const tenantDataByRealId = new Map(existingTenants.map((t) => [t.id, { name: t.name, room: t.room, rent: t.rent, serviceCharge: t.serviceCharge, advanceDue: t.advanceDue, flatId: t.flatId }]));

  for (const t of tenants) {
    const key = `${t.name.toLowerCase()}|${t.room.toLowerCase()}`;
    const flatId = resolveFlatId(t.flatResolved);
    let existing = tenantByKey.get(key);
    let realId;
    if (existing) {
      realId = existing.id;
    } else {
      realId = genId('T', existingTenants.map((x) => x.id));
      await prisma.tenant.create({
        data: { orgId, id: realId, flatId, name: t.name, room: t.room, phone: t.phone, rent: t.rent, serviceCharge: t.serviceCharge, advanceDue: t.advanceDue, entry: t.entry, status: t.status },
      });
      existingTenants.push({ id: realId, name: t.name, room: t.room });
      tenantByKey.set(key, { id: realId });
    }
    tenantDataByRealId.set(realId, { name: t.name, room: t.room, rent: t.rent, serviceCharge: t.serviceCharge, advanceDue: t.advanceDue, flatId });
    if (t.id) tenantByOrigId.set(t.id.toLowerCase(), realId);
  }

  function resolveTenant(resolved) {
    if (!resolved) return null;
    let tid = null;
    if (resolved.by === 'id') tid = tenantByOrigId.get(resolved.value) || null;
    else if (resolved.by === 'key') tid = (tenantByKey.get(resolved.value) || {}).id || null;
    if (!tid) return null;
    const data = tenantDataByRealId.get(tid);
    return data ? { tid, data } : null;
  }

  const existingRent = await prisma.rentPayment.findMany({ where: { orgId } });
  const rentLite = existingRent.map((p) => ({ tid: p.tid, month: p.month, year: p.year, paid: p.paid, carryIn: p.carryIn }));
  const sortedRent = [...rentPayments].sort((a, b) => a.year - b.year || MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
  let rentInserted = 0;
  for (const r of sortedRent) {
    const found = resolveTenant(r.tenantResolved);
    if (!found) continue;
    const { tid, data } = found;
    const carryIn = calcCarryFwd(tid, r.month, r.year, rentLite, data.rent);
    const id = genId('R', existingRent.map((x) => x.id));
    await prisma.rentPayment.create({
      data: { orgId, id, date: r.date, flatId: data.flatId || '', tid, name: data.name, room: data.room, month: r.month, year: r.year, rentAmount: data.rent, paid: r.amount, carryIn, method: 'Import' },
    });
    existingRent.push({ id });
    rentLite.push({ tid, month: r.month, year: r.year, paid: r.amount, carryIn });
    rentInserted++;
  }

  const existingSvc = await prisma.servicePayment.findMany({ where: { orgId } });
  let svcInserted = 0;
  for (const s of servicePayments) {
    const found = resolveTenant(s.tenantResolved);
    if (!found) continue;
    const { tid, data } = found;
    const id = genId('S', existingSvc.map((x) => x.id));
    await prisma.servicePayment.create({
      data: { orgId, id, date: s.date, tid, name: data.name, serviceTotal: data.serviceCharge, paid: s.amount, method: 'Import' },
    });
    existingSvc.push({ id });
    svcInserted++;
  }

  const existingAdv = await prisma.advancePayment.findMany({ where: { orgId } });
  let advInserted = 0;
  for (const a of advancePayments) {
    const found = resolveTenant(a.tenantResolved);
    if (!found) continue;
    const { tid, data } = found;
    const id = genId('A', existingAdv.map((x) => x.id));
    await prisma.advancePayment.create({
      data: { orgId, id, date: a.date, tid, name: data.name, advanceTotal: data.advanceDue, paid: a.amount, method: 'Import' },
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
