import { N } from './gen-id';
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

// Every field we care about can appear under several plausible header
// spellings — this is what lets the SAME validator work whether the data
// came from our own clean Excel template, or from someone's years-old,
// inconsistently-named Google Sheet.
export const FIELD_ALIASES = {
  flats: {
    id: ['id', 'flat id', 'flatid', 'code'],
    name: ['flat name', 'name', 'flat'],
    address: ['address'],
    ownerName: ['owner name', 'ownername', 'owner'],
    flatRent: ['rent per seat', 'flat rent', 'flatrent', 'seat rent', 'rent'],
    totalRooms: ['total rooms', 'totalrooms', 'rooms'],
    totalSeats: ['total seats', 'totalseats', 'seats'],
  },
  tenants: {
    id: ['id', 'tenant id', 'tenantid', 'tid'],
    flatRef: ['flat name', 'flat id', 'flatid', 'flat'],
    name: ['tenant name', 'name'],
    room: ['room', 'seat'],
    phone: ['phone', 'mobile', 'phone number', 'contact'],
    rent: ['monthly rent', 'rent'],
    serviceCharge: ['service charge', 'servicecharge'],
    advanceDue: ['advance amount', 'advance', 'advancedue', 'advance due'],
    entry: ['entry date (yyyy-mm-dd)', 'entry date', 'entry', 'joining date', 'join date'],
    leftDate: ['left date', 'leftdate', 'leaving date'],
    status: ['status (active/left)', 'status'],
  },
  rentPayments: {
    id: ['id', 'payment id'],
    tenantRef: ['tid', 'tenant id', 'tenantid'],
    name: ['tenant name', 'name'],
    room: ['room'],
    month: ['month'],
    year: ['year'],
    amount: ['amount paid', 'paid', 'amount', 'rent paid'],
    date: ['payment date (yyyy-mm-dd)', 'payment date', 'date'],
  },
  servicePayments: {
    id: ['id', 'payment id'],
    tenantRef: ['tid', 'tenant id', 'tenantid'],
    name: ['tenant name', 'name'],
    room: ['room'],
    month: ['month'],
    year: ['year'],
    amount: ['amount paid', 'paid', 'amount'],
    date: ['payment date (yyyy-mm-dd)', 'payment date', 'date'],
  },
  advancePayments: {
    id: ['id', 'payment id'],
    tenantRef: ['tid', 'tenant id', 'tenantid'],
    name: ['tenant name', 'name'],
    room: ['room'],
    amount: ['amount paid', 'paid', 'amount'],
    date: ['payment date (yyyy-mm-dd)', 'payment date', 'date'],
  },
};

// Candidate tab/sheet names to try for each data type, in priority order.
export const SHEET_NAME_CANDIDATES = {
  flats: ['Flats', 'Flat', 'FLATS'],
  tenants: ['Tenants', 'Tenant', 'TENANTS'],
  rentPayments: ['Rent Payments', 'RentPayments', 'Rent', 'RENT'],
  servicePayments: ['Service Payments', 'ServicePayments', 'Service Charge', 'Service'],
  advancePayments: ['Advance Payments', 'AdvancePayments', 'Advance Money', 'Advance'],
};

// Builds a lowercase/trimmed lookup map once per row so alias checks are
// cheap repeated lookups instead of repeated string normalization.
function normalizeRow(row) {
  const map = {};
  for (const k of Object.keys(row)) {
    map[S(k).toLowerCase()] = row[k];
  }
  return map;
}

function getField(normalizedRow, aliases) {
  for (const alias of aliases) {
    const v = normalizedRow[alias];
    if (v !== undefined && S(v) !== '') return v;
  }
  return '';
}

// `rawRows` is a map of { flats: [...], tenants: [...], rentPayments: [...],
// servicePayments: [...], advancePayments: [...] } — plain arrays of
// {header: value} row objects, however they were extracted (Excel sheet or
// Google Sheets CSV). `foundSheets` optionally records which tab/sheet name
// actually matched for each type, purely for a friendlier diagnostic message.
export function validateImportData(rawRows, foundSheets) {
  const errors = [];
  const warnings = [];
  const A = FIELD_ALIASES;

  if (foundSheets) {
    for (const key of Object.keys(SHEET_NAME_CANDIDATES)) {
      if (!foundSheets[key] && key !== 'flats' && key !== 'tenants') continue; // payment sheets are optional
      if (!foundSheets[key] && (key === 'flats' || key === 'tenants')) {
        warnings.push(`"${SHEET_NAME_CANDIDATES[key].join('" / "')}" নামের কোনো ট্যাব/শিট পাওয়া যায়নি — এই অংশ import হবে না।`);
      }
    }
  }

  const flats = [];
  const flatNames = new Set();
  const flatIds = new Set();
  (rawRows.flats || []).forEach((raw, i) => {
    const r = normalizeRow(raw);
    const name = S(getField(r, A.flats.name));
    const rowNo = i + 2;
    if (!name) return;
    const key = name.toLowerCase();
    if (flatNames.has(key)) {
      errors.push(`Flats, row ${rowNo}: "${name}" নামের Flat একাধিকবার আছে।`);
      return;
    }
    flatNames.add(key);
    const id = S(getField(r, A.flats.id));
    if (id) flatIds.add(id.toLowerCase());
    flats.push({
      id, name,
      address: S(getField(r, A.flats.address)),
      ownerName: S(getField(r, A.flats.ownerName)),
      flatRent: N(getField(r, A.flats.flatRent)),
      totalRooms: N(getField(r, A.flats.totalRooms)),
      totalSeats: N(getField(r, A.flats.totalSeats)),
    });
  });

  function resolveFlatRef(ref) {
    const v = S(ref).toLowerCase();
    if (!v) return null;
    if (flatIds.has(v)) return { by: 'id', value: v };
    if (flatNames.has(v)) return { by: 'name', value: v };
    return null;
  }

  const tenants = [];
  const tenantKeys = new Set();
  const tenantIds = new Set();
  (rawRows.tenants || []).forEach((raw, i) => {
    const r = normalizeRow(raw);
    const name = S(getField(r, A.tenants.name));
    const rowNo = i + 2;
    if (!name) return;
    const room = S(getField(r, A.tenants.room));
    const flatRefRaw = S(getField(r, A.tenants.flatRef));
    const resolved = resolveFlatRef(flatRefRaw);
    if (!resolved) {
      errors.push(`Tenants, row ${rowNo}: "${name}" — Flat রেফারেন্স "${flatRefRaw}" Flats শিটে খুঁজে পাওয়া যায়নি।`);
      return;
    }
    const key = `${name.toLowerCase()}|${room.toLowerCase()}`;
    if (tenantKeys.has(key)) {
      errors.push(`Tenants, row ${rowNo}: "${name}" (Room ${room}) একাধিকবার আছে।`);
      return;
    }
    tenantKeys.add(key);
    const id = S(getField(r, A.tenants.id));
    if (id) tenantIds.add(id.toLowerCase());
    const statusRaw = S(getField(r, A.tenants.status)) || 'Active';
    const status = ['Active', 'Left', 'Inactive'].includes(statusRaw) ? statusRaw : 'Active';
    if (statusRaw && !['Active', 'Left', 'Inactive'].includes(statusRaw)) {
      warnings.push(`Tenants, row ${rowNo}: Status "${statusRaw}" চেনা যায়নি, "Active" ধরা হয়েছে।`);
    }
    tenants.push({
      id, name, room,
      flatResolved: resolved,
      phone: S(getField(r, A.tenants.phone)),
      rent: N(getField(r, A.tenants.rent)),
      serviceCharge: N(getField(r, A.tenants.serviceCharge)),
      advanceDue: N(getField(r, A.tenants.advanceDue)),
      entry: toIsoDate(getField(r, A.tenants.entry)),
      status,
    });
  });

  function resolveTenantRef(tidRaw, nameRaw, roomRaw) {
    const tid = S(tidRaw).toLowerCase();
    if (tid && tenantIds.has(tid)) return { by: 'id', value: tid };
    const key = `${S(nameRaw).toLowerCase()}|${S(roomRaw).toLowerCase()}`;
    if (tenantKeys.has(key)) return { by: 'key', value: key };
    return null;
  }

  function validatePayments(sheetKey, rows, hasMonthYear) {
    const out = [];
    (rows || []).forEach((raw, i) => {
      const r = normalizeRow(raw);
      const alias = A[sheetKey];
      const name = S(getField(r, alias.name));
      const room = S(getField(r, alias.room));
      const tid = S(getField(r, alias.tenantRef));
      const rowNo = i + 2;
      if (!name && !tid) return;
      const resolved = resolveTenantRef(tid, name, room);
      if (!resolved) {
        errors.push(`${sheetKey}, row ${rowNo}: টেনেন্ট "${name || tid}" (Room ${room}) Tenants শিটে খুঁজে পাওয়া যায়নি।`);
        return;
      }
      const amount = N(getField(r, alias.amount));
      if (amount <= 0) {
        errors.push(`${sheetKey}, row ${rowNo}: Amount অবশ্যই ০-এর বেশি হতে হবে।`);
        return;
      }
      const date = toIsoDate(getField(r, alias.date));
      if (!date) {
        errors.push(`${sheetKey}, row ${rowNo}: Payment Date সঠিক ফরম্যাটে নেই।`);
        return;
      }
      const row = { tenantResolved: resolved, name, room, amount, date };
      if (hasMonthYear) {
        const month = S(getField(r, alias.month));
        const year = N(getField(r, alias.year));
        if (!MONTHS.includes(month)) {
          errors.push(`${sheetKey}, row ${rowNo}: Month "${month}" চেনা যায়নি — পূর্ণ ইংরেজি নাম দিন (July)।`);
          return;
        }
        if (!year || year < 2000 || year > 2100) {
          errors.push(`${sheetKey}, row ${rowNo}: Year "${getField(r, alias.year)}" সঠিক না।`);
          return;
        }
        row.month = month;
        row.year = year;
      }
      out.push(row);
    });
    return out;
  }

  const rentPayments = validatePayments('rentPayments', rawRows.rentPayments, true);
  const servicePayments = validatePayments('servicePayments', rawRows.servicePayments, true);
  const advancePayments = validatePayments('advancePayments', rawRows.advancePayments, false);

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
