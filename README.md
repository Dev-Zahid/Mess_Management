z# Mess Manager — SaaS (Phase 1 + Phase 2)

মেস/হোস্টেল মালিকদের কাছে বেচার জন্য multi-tenant SaaS। এই ধাপে যা কাজ করছে:

**Phase 1 (আগের ধাপ):**
- ল্যান্ডিং পেজ, সাইনআপ (৭ দিন ফ্রি ট্রায়াল), লগইন
- বিলিং পেজ — bKash/Nagad ম্যানুয়াল পেমেন্ট সাবমিশন
- Super Admin প্যানেল — কাস্টমার ও পেমেন্ট approve/reject
- Terms/Privacy পেজ

**Phase 2 (এই ধাপে নতুন যোগ হলো):**
- **Flats** — ফ্ল্যাট যোগ/মুছুন, সিট সংখ্যা, ভাড়া
- **Tenants** — টেনেন্ট যোগ, ফ্ল্যাটে অ্যাসাইন, Active/Inactive/Left স্ট্যাটাস
- **Rent Payments** — মাস অনুযায়ী পেমেন্ট রেকর্ড, **carry-forward calculation** (আগের GAS
  অ্যাপের `calcCarryFwd` লজিক হুবহু পোর্ট করা হয়েছে — কেউ বেশি পেমেন্ট করলে পরের মাসে credit হিসেবে যোগ হয়)
- **Service Charge** — মাসওয়ারি সার্ভিস চার্জ পেমেন্ট ট্র্যাকিং
- **Advance Money** — টার্গেট বনাম কালেক্টেড ট্র্যাকিং
- **Due Tracker** — সব টেনেন্টের রেন্ট + সার্ভিস চার্জ বকেয়া এক জায়গায়
- **Expenses** — খরচ যোগ/মুছুন, উৎস অনুযায়ী ট্যাগ
- **Owner Panel** — এখনো "শীঘ্রই আসছে" (owner payments/advances/investments — এই তিনটা concept আগের
  Code.gs-এ ছিল কিন্তু এখনো নতুন schema-তে মডেল করা হয়নি, সততার সাথে এটা placeholder রাখা হয়েছে)

**মাল্টি-টেনেন্সি:** প্রতিটা API route session থেকে `orgId` নিয়ে সব query filter করে — একজন owner
কখনো আরেকজনের ডেটা দেখতে/এডিট করতে পারবে না। প্রতিটা `[id].js` route মিউটেশনের আগে
`findFirst({ id, orgId })` দিয়ে ownership যাচাই করে।

---

## ১. ডেপ্লয় করার ধাপ

### ধাপ ১ — Supabase-এ ডেটাবেস বানান (ফ্রি)
1. https://supabase.com → নতুন প্রজেক্ট তৈরি করুন
2. Project Settings → Database → Connection string (URI, "Session mode") কপি করুন
3. এটাই আপনার `DATABASE_URL`

### ধাপ ২ — লোকালি সেটআপ করুন (টেস্ট করার জন্য)
```bash
cp .env.example .env
# .env ফাইলে DATABASE_URL, JWT_SECRET, SUPERADMIN_PHONE, SUPERADMIN_PIN বসান
npm install
npm run db:push      # ডেটাবেসে নতুন টেবিলগুলো (Flat, Tenant, RentPayment...) তৈরি/আপডেট করবে
npm run db:seed       # আপনার Super Admin লগইন তৈরি করবে (যদি আগে না করে থাকেন)
npm run dev            # http://localhost:3000
```
আগে থেকে ডেপ্লয় করা থাকলে শুধু `npm run db:push` চালালেই নতুন টেবিলগুলো যোগ হয়ে যাবে — পুরনো ডেটা
(Organization, User, PaymentSubmission) অক্ষত থাকবে।

### ধাপ ৩ — Vercel-এ পুশ করুন
```bash
git add .
git commit -m "Phase 2: Flats, Tenants, Payments, Due Tracker, Expenses"
git push
```
Vercel অটো রিডেপ্লয় করবে। ডেপ্লয়ের পর একবার (লোকাল মেশিন থেকে, একই `DATABASE_URL` দিয়ে) `npm run db:push` চালাতে ভুলবেন না।

---

## ২. bKash/Nagad নম্বর সেট করুন

`lib/plans.js` ফাইলে `PAYMENT_NUMBERS` অবজেক্টে আপনার আসল bKash/Nagad নম্বর বসান।

## ৩. পরের ধাপে কী বাকি (Phase 3)

- Owner Panel সম্পূর্ণ করা (owner payments/advances/investments schema + pages)
- Flat/Tenant এডিট করার UI (এখন শুধু যোগ/মুছা যায়)
- WhatsApp/SMS rent reminder (cron job)
- PDF রিসিট জেনারেশন
- CSV/Excel এক্সপোর্ট
- Occupancy trend চার্ট ও রিপোর্ট পেজ (আগের GAS ড্যাশবোর্ডে যা ছিল)

