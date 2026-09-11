import Papa from 'papaparse';
import { SHEET_NAME_CANDIDATES } from './import-shared';

export function extractSheetId(url) {
  const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

async function fetchTabCsv(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (text.trim().startsWith('<')) return null;
  return text;
}

async function fetchBestMatchingTab(sheetId, candidates) {
  for (const name of candidates) {
    const csv = await fetchTabCsv(sheetId, name);
    if (csv !== null) {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      return { rows: parsed.data, foundAs: name };
    }
  }
  return { rows: [], foundAs: null };
}

export async function fetchGoogleSheetRawRows(sheetUrl) {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('এটা সঠিক Google Sheet লিংক মনে হচ্ছে না। ব্রাউজারের অ্যাড্রেস বার থেকে পুরো URL কপি করুন।');
  }

  const rawRows = {};
  const foundSheets = {};
  for (const key of Object.keys(SHEET_NAME_CANDIDATES)) {
    const { rows, foundAs } = await fetchBestMatchingTab(sheetId, SHEET_NAME_CANDIDATES[key]);
    rawRows[key] = rows;
    foundSheets[key] = foundAs;
  }

  if (!foundSheets.flats && !foundSheets.tenants) {
    throw new Error(
      'কোনো ট্যাব খুঁজে পাওয়া যায়নি। দুটো জিনিস চেক করুন: ১) শিটটা "Anyone with the link" — Viewer হিসেবে শেয়ার করা আছে কিনা (File → Share), ২) ট্যাবের নাম "Flats" ও "Tenants" (বা কাছাকাছি) আছে কিনা।'
    );
  }

  return { rawRows, foundSheets };
}
