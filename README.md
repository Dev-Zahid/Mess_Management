# Mess Manager — SaaS (Phase 1)

মেস/হোস্টেল মালিকদের কাছে বেচার জন্য multi-tenant SaaS-এর ভিত্তি (foundation)। এই ধাপে যা কাজ করছে:

- ল্যান্ডিং পেজ (`/`)
- সাইনআপ (৭ দিন ফ্রি ট্রায়াল অটো শুরু হয়) (`/signup`)
- লগইন (ফোন + PIN) (`/login`)
- ড্যাশবোর্ড শেল + ট্রায়াল কাউন্টডাউন ব্যানার (`/dashboard`)
- বিলিং পেজ — bKash/Nagad ম্যানুয়াল পেমেন্ট সাবমিশন (`/billing`)
- Super Admin প্যানেল — সব কাস্টমার দেখা, পেমেন্ট approve/reject করা (`/admin`)
- Terms ও Privacy পেজ

**যা এখনো বাকি (পরের ধাপ):** Flats/Tenants/Rent Payments/Service Charge/Advance Money/Due Tracker/Expenses/Owner
Panel — এগুলো তোমার আগের Google Apps Script অ্যাপ থেকে পোর্ট করে `/dashboard` এর ভেতরে বসাতে হবে। কাঠামো
(database schema, multi-tenancy, auth) সব রেডি, বাকিটা page-by-page যোগ করা।

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
npm run db:push      # ডেটাবেসে টেবিল তৈরি করবে
npm run db:seed       # আপনার Super Admin লগইন তৈরি করবে
npm run dev            # http://localhost:3000
```

### ধাপ ৩ — Vercel-এ ডেপ্লয় করুন (ফ্রি)
1. এই কোড GitHub-এ পুশ করুন
2. https://vercel.com → "New Project" → আপনার রিপো সিলেক্ট করুন
3. Environment Variables-এ `.env` এর ৪টা ভ্যারিয়েবল যোগ করুন
4. Deploy চাপুন
5. প্রথমবার ডেপ্লয়ের পর একবার `npm run db:push` ও `npm run db:seed` লোকাল মেশিন থেকে (একই DATABASE_URL দিয়ে) চালান

### ধাপ ৪ — ডোমেইন যোগ করুন
Vercel প্রজেক্ট সেটিংসে আপনার কেনা ডোমেইন (যেমন messmanager.com.bd) যোগ করুন — Vercel বিনামূল্যে SSL দেয়।

---

## ২. bKash/Nagad নম্বর সেট করুন

`lib/plans.js` ফাইলে `PAYMENT_NUMBERS` অবজেক্টে আপনার আসল bKash/Nagad নম্বর বসান — এখন প্লেসহোল্ডার
(`01XXXXXXXXX`) আছে।

## ৩. Super Admin হিসেবে কীভাবে কাজ করবেন

1. `/login` এ আপনার Super Admin ফোন+PIN দিয়ে লগইন করুন (seed script-এ যা সেট করেছেন)
2. স্বয়ংক্রিয়ভাবে `/admin` এ নিয়ে যাবে
3. যখন কোনো owner পেমেন্ট সাবমিট করবে (bKash/Nagad TrxID সহ), সেটা এখানে "পেন্ডিং" তালিকায় দেখাবে
4. bKash/Nagad অ্যাপ/SMS-এ গিয়ে TrxID মিলিয়ে **Approve** চাপুন — তখন ঐ owner-এর সাবস্ক্রিপশন অটো extend হয়ে যাবে

## ৪. প্রাইসিং বদলাতে চাইলে

`lib/plans.js` ফাইলে `PLANS` অবজেক্টে price/duration বদলান — landing, billing, admin সব জায়গায় অটো আপডেট হবে।

## ৫. পরের ধাপে কী করতে হবে (Phase 2)

- `/dashboard` এর ভেতরে Flats/Tenants/Payments ইত্যাদি পেজ যোগ করা (আগের GAS অ্যাপের লজিক পোর্ট করে)
- প্রতিটা API route-এ `orgId` দিয়ে ডেটা filter করা (multi-tenant isolation) — schema এ সব model-এ `orgId` field আগে থেকেই আছে
- WhatsApp/SMS rent reminder (cron job)
- PDF রিসিট জেনারেশন
