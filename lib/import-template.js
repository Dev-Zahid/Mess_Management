import * as XLSX from 'xlsx';

// Builds a downloadable .xlsx workbook with one sheet per data type, each
// pre-filled with a header row, a sample row (so people understand the
// format), and light instructions. Tenants/payments are linked by NAME —
// not by internal ID — because a mess owner filling this in by hand has
// no idea what an internal ID is, but they definitely know tenant names.
export function buildImportTemplate() {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ['Mess Manager — ডেটা ইমপোর্ট টেমপ্লেট'],
    [''],
    ['কীভাবে ব্যবহার করবেন:'],
    ['১. প্রতিটা ট্যাব (নিচে ট্যাবের নাম দেখুন) আলাদা তথ্যের জন্য — Flats, Tenants, Rent Payments ইত্যাদি।'],
    ['২. প্রথম সারি (header) বদলাবেন না। দ্বিতীয় সারিতে একটা উদাহরণ দেওয়া আছে — সেটা মুছে নিজের তথ্য বসান।'],
    ['৩. Tenants ট্যাবে যে "Flat Name" দেবেন, সেটা অবশ্যই Flats ট্যাবের কোনো নামের সাথে হুবহু মিলতে হবে।'],
    ['৪. Payment ট্যাবগুলোতে "Tenant Name" ও "Room" — এই দুটো দিয়েই সঠিক টেনেন্ট খুঁজে বের করা হয়, তাই'],
    ['   Tenants ট্যাবে যে নাম ও রুম দিয়েছেন, ঠিক সেটাই এখানে লিখুন।'],
    ['৫. Month লিখতে হবে ইংরেজিতে পুরো নাম দিয়ে: January, February, March ... December।'],
    ['৬. সব শেষ হলে এই ফাইলটা "Import Data" পেজে আপলোড করুন — প্রথমে একটা Preview দেখাবে, ভুল থাকলে ঠিক করে'],
    ['   আবার আপলোড করুন, সব ঠিক থাকলে Confirm করলেই ডেটা যোগ হয়ে যাবে।'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'শুরু করার আগে পড়ুন');

  const flatsData = [
    ['Flat Name', 'Address', 'Owner Name', 'Rent Per Seat', 'Total Rooms', 'Total Seats'],
    ['Advocate House', 'Road 5, Dhanmondi', 'Mr. Karim', 3500, 4, 10],
  ];
  const wsFlats = XLSX.utils.aoa_to_sheet(flatsData);
  wsFlats['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsFlats, 'Flats');

  const tenantsData = [
    ['Flat Name', 'Tenant Name', 'Room', 'Phone', 'Monthly Rent', 'Service Charge', 'Advance Amount', 'Entry Date (YYYY-MM-DD)', 'Status (Active/Left)'],
    ['Advocate House', 'Zahid Hasan', 'R1', '01712345678', 3500, 300, 3500, '2025-02-01', 'Active'],
  ];
  const wsTenants = XLSX.utils.aoa_to_sheet(tenantsData);
  wsTenants['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 15 }, { wch: 13 }, { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsTenants, 'Tenants');

  const rentData = [
    ['Tenant Name', 'Room', 'Month', 'Year', 'Amount Paid', 'Payment Date (YYYY-MM-DD)'],
    ['Zahid Hasan', 'R1', 'July', 2026, 3500, '2026-07-05'],
  ];
  const wsRent = XLSX.utils.aoa_to_sheet(rentData);
  wsRent['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 13 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsRent, 'Rent Payments');

  const svcData = [
    ['Tenant Name', 'Room', 'Month', 'Year', 'Amount Paid', 'Payment Date (YYYY-MM-DD)'],
    ['Zahid Hasan', 'R1', 'July', 2026, 300, '2026-07-05'],
  ];
  const wsSvc = XLSX.utils.aoa_to_sheet(svcData);
  wsSvc['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 13 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSvc, 'Service Payments');

  const advData = [
    ['Tenant Name', 'Room', 'Amount Paid', 'Payment Date (YYYY-MM-DD)'],
    ['Zahid Hasan', 'R1', 3500, '2025-02-01'],
  ];
  const wsAdv = XLSX.utils.aoa_to_sheet(advData);
  wsAdv['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 13 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsAdv, 'Advance Payments');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
