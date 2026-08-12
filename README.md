# Mess Manager — SaaS (single sign-on, Super Admin control center)

## এই ধাপে যা করা হয়েছে

### ১. পুরনো ৫ পয়েন্ট
- **Double PIN সম্পূর্ণ সরানো** — এখন phone+PIN দিয়ে `/login`-এ একবার লগইন করলেই হয়। Owner, Management,
  SuperAdmin — সবাই একই `User` টেবিলের row, সবাই একইভাবে লগইন করে। `app-shell.html`-এর ভেতরের পুরনো
  PIN-screen, `startAuth()`, `attemptLogin()`, `doLogin()` সব সরিয়ে `bootstrapApp()` দিয়ে replace করা
  হয়েছে — এটা সরাসরি সেশন কুকি দিয়ে `getAllData()` কল করে, কোনো PIN টাইপ করা লাগে না।
- **Team/PINs — phone-based access** — Owner এখন নতুন Management member যোগ করলে নাম+ফোন+PIN দেয়, আর
  সেই member নিজের ফোন+PIN দিয়ে সরাসরি `/login`-এ গিয়ে ঢুকতে পারে, শেয়ার্ড ডিভাইসে PIN বসানোর দরকার নেই।
- **Trial/Billing banner** — `app-shell.html`-এর উপরে এখন trial countdown বা renewal reminder ব্যানার
  দেখায় (`public/billing-banner.js`, `/api/org-status`)।
- **Due Tracker-এ "All" মাস অপশন** যোগ হয়েছে (বাকিগুলোতে আগে থেকেই ছিল)।
- **Owner Panel এখন chronological (Jan→Dec)** sort করে, আগে ছিল reverse-date।

### ২. Super Admin — Tier 1, 2, 3 সব একসাথে
- **Tier 1:** কাস্টমার সার্চ/ফিল্টার, subscription extend/suspend/reactivate/plan-change, admin notes,
  MRR/revenue analytics (এই মাস vs গত মাস vs all-time), trial-ending-soon list, প্রতি কাস্টমারের পেমেন্ট
  হিস্ট্রি, CSV export (customers + payments)
- **Tier 2:** "View as Customer" impersonation (audit-logged), পূর্ণ audit log viewer, admin notes
- **Tier 3:** Coupon system, ম্যানুয়ালি নতুন কাস্টমার add করা, সব কাস্টমারের অ্যাপে announcement banner

নতুন পেজ: `/admin` (redesigned dashboard), `/admin/customers/[id]`, `/admin/coupons`,
`/admin/announcements`, `/admin/audit-log`, `/admin/add-customer`

## ⚠️ গুরুত্বপূর্ণ মাইগ্রেশন নোট — Phase 1 আগে deploy করা থাকলে পড়ুন

আগের `TeamMember` মডেল (PIN-only) এখন deprecated — লগইন/permission সব `User` মডেলে merge হয়েছে (এখন
`User`-এ `flats`+`perms` ফিল্ড আছে)। যদি আগে কোনো org-এ Team/PINs দিয়ে কোনো Management member যোগ করা
হয়ে থাকে (পুরনো PIN-only সিস্টেমে), সেগুলো নতুন সিস্টেমে **carry over হবে না** — কারণ পুরনো সিস্টেমে
phone number-ই ছিল না, নতুন লগইনের জন্য phone আবশ্যক। `npm run db:push` চালানোর পর, যদি প্রয়োজন হয়,
Owner-কে বলবেন Team/PINs পেজ থেকে সেই member-দের আবার phone number দিয়ে নতুন করে add করে নিতে।

## ডেপ্লয় করার ধাপ

```bash
cp .env.example .env
npm install
npm run db:push      # নতুন schema push করবে (User-এ flats/perms, AuditLog, Coupon, Announcement যোগ হবে)
npm run db:seed        # Super Admin লগইন (যদি আগে না করা থাকে)
npm run dev              # http://localhost:3000
```

**index.html/stylesheet.html বদলালে:** `source/index.html` বা `source/stylesheet.html` এডিট করে
`node scripts/build-app-shell.js` চালান — এটা `public/app-shell.html` রিজেনারেট করবে।

## যা এখনো বাকি (সৎভাবে জানানো)

- **Fully mobile responsive অডিট** — এই সেশনে গভীরভাবে করা হয়নি (সময়ের অভাবে বাকি সব বড় কাজের পর সবচেয়ে
  শেষে রাখা হয়েছিল, স্কোপ শেষ করতে পারিনি)। বেসিক media query (768px/420px) আগে থেকেই আছে, কিন্তু Owner
  Panel-এর ৮-কলাম টেবিল, room/seat builder grid ইত্যাদি নতুন করে audit করা দরকার।
- Coupon system-টা তৈরি করা হয়েছে (backend+admin UI) কিন্তু signup/billing ফ্লোতে এখনো "coupon code
  apply করুন" ইনপুট যোগ করা হয়নি — কাস্টমার এখনো নিজে coupon ব্যবহার করতে পারবে না, শুধু Super Admin
  create/activate/deactivate করতে পারবে।

⚠️ যথারীতি sandbox network restriction থাকায় real database দিয়ে live টেস্ট করা যায়নি — শুধু syntax
validation, import resolution, আর RPC-call ⇄ handler cross-check করা হয়েছে (সব পাস করেছে)। Deploy করার
পর bug পেলে জানাবেন।

---

## এই সেশনে (v5) যা ফিক্স করা হয়েছে

### বাগ ফিক্স
1. **Phone নম্বর trim না করার বাগ** — Signup, Login, Super Admin-এর "Manual Add Customer" তিনটাতেই phone
   validate হতো trim করে কিন্তু save হতো untrim অবস্থায় — স্পেস দিয়ে টাইপ করলে পরে লগইন ব্যর্থ হতো। ফিক্স।
2. **Signup-এ phone format validation ছিল না** — এখন সব জায়গায় সমানভাবে `01XXXXXXXXX` চেক হয়।
3. **Subscription expire হলে অ্যাপ আটকে যেত** — RPC 401/402 পেলে shim এখন সঠিক পেজে (`/login`/`/billing`)
   redirect করে, আগে শুধু loading screen-এ আটকে থাকত।
4. **Super Admin "Reactivate" বাটনে লজিক গ্যাপ** — এখন trial ও subscription দুটোই চেক করে সঠিক status বসায়।
5. **🔴 সবচেয়ে গুরুত্বপূর্ণ: Due Tracker-এর নিজের "All" অপশনই ভাঙা ছিল** — `isTenantActiveInMonth()`-এ
   `MONTHS.indexOf('')===-1` এর কারণে "All" সিলেক্ট করলে Rent Due ট্যাব সম্পূর্ণ খালি দেখাত। এখন "All"
   সিলেক্ট করলে entry date থেকে বর্তমান মাস পর্যন্ত প্রতি মাসের due যোগ করে cumulative total দেখায়।

### Billing বাটন মেনুতে সরানো
- Top-page banner সরিয়ে sidebar-এর "Account" সেকশনে "Billing" মেনু আইটেম যোগ করা হয়েছে, trial/renewal
  countdown ছোট badge আকারে (`public/billing-banner.js` rewrite)।
- Announcement banner এখনো top-এ থাকে (এটা broadcast notice, তাই page-top-ই ঠিক জায়গা)।

### Mobile responsive
- মূল app (`app-shell.html`) আগে থেকেই ভালো কভারেজ ছিল — বড় সমস্যা পাওয়া যায়নি।
- Super Admin পেজগুলোতে (`/admin/*`) কোনো mobile CSS ছিলই না — এখন সব wide table horizontal-scroll পায়,
  multi-column grid mobile-এ 1-column হয়ে যায়, filter/toolbar row wrap করে।

### যাচাই
- ৪২টা ফাইল syntax-check (০ error), সব import resolve করে, app-shell.html-এর প্রতিটা RPC কল handler-এর
  সাথে ক্রসচেক করা (dynamic `[fn](...)` কলসহ) — সব মিলেছে। Prisma schema brace-balanced।

⚠️ যথারীতি sandbox network restriction থাকায় real database দিয়ে live end-to-end টেস্ট করা যায়নি।

---

## এই সেশনে (v6) যা ফিক্স/যোগ করা হয়েছে

### বাগ ফিক্স
1. **🔴 Advance Money (tenant deposit) Owner Panel-এ calculate হতো না** — `renderOwners()` কোনোদিন
   `DB.advPays` (tenant-দের থেকে collected security deposit) reference-ই করত না। এখন Service Charge-এর
   প্যাটার্নে একটা নতুন "Advance Money (Tenant Deposits)" সেকশন যোগ করা হয়েছে — Total Collected / Refunded
   / Held (Liability) তিনটা কার্ড। এটা ইচ্ছাকৃতভাবে Net Balance-এ যোগ করা হয়নি, কারণ security deposit
   profit না — এটা tenant-কে ফেরত দেওয়ার দায় (liability), তাই আলাদাভাবে স্পষ্ট করে দেখানো হয়েছে।
2. **🔴 Announcement banner-এর position ভাঙা ছিল** — `body{display:flex}` (sidebar+content পাশাপাশি)
   হওয়ায় banner-টা `document.body`-র প্রথম child হিসেবে বসালে সেটা সাইডবারের পাশে একটা সরু flex-column
   হয়ে যেত, পুরো width-এর banner হতো না — তাই mess owner এটা দেখতেই পেত না। এখন সঠিক জায়গায় (topbar-এর
   নিচে, `.main`-এর ভেতরে একটা dedicated slot-এ) বসানো হয়।
3. **Admin panel/landing/auth পেজে emoji আইকন ব্যবহারের ঝুঁকি** — এই পেজগুলোতে Tabler icon font কখনো
   লোডই হতো না, আর emoji রেন্ডারিং OS/browser-নির্ভর (কিছু সিস্টেমে emoji ফন্ট না থাকলে broken/tofu box
   দেখায়) — এটাই সম্ভবত Announcements পেজে দেখা "image error"। এখন `pages/_document.js` যোগ করে Tabler
   icon font গ্লোবালি লোড করা হয়েছে, আর সব emoji-কে (🎟️📢📜⬇👁🚧✓✕🏠💰📊👥🧾📱) `<i class="ti ti-...">`
   দিয়ে replace করা হয়েছে — main app-এর সাথে visual consistency-ও বেড়েছে।

### Mobile responsive — সম্পন্ন
- Super Admin পেজগুলোতে wide table horizontal-scroll wrapper, multi-column grid mobile-এ collapse,
  filter/toolbar row wrap — সব যোগ হয়েছে।

### ⚠️ Team/PINs — "Management add করলে login করতে পারছে না" নিয়ে

আমি পুরো flow (Add User → Database → Login) কোড ধরে ধরে খুঁটিয়ে দেখেছি — বর্তমান কোডে যুক্তিগতভাবে কোনো
bug খুঁজে পাইনি। **সবচেয়ে সম্ভাব্য কারণ:** এই আপডেটে `User` টেবিলে নতুন দুটো column (`flats`, `perms`)
যোগ হয়েছে (আগে এগুলো আলাদা `TeamMember` টেবিলে ছিল)। যদি deploy করার পর

```bash
npm run db:push
```

**আবার না চালানো হয়ে থাকে**, তাহলে database-এ এই নতুন column গুলো নেই, আর Management add করার চেষ্টা করলে
database-লেভেলে error হবে (ফলে ওই ব্যক্তির account-ই তৈরি হয়নি, তাই login করতে পারবে না)।

**এখনই এটা ট্রাই করুন:**
```bash
npm run db:push
```
এরপর আবার Team/PINs থেকে নতুন করে একজন add করে দেখুন।

**যদি এরপরও কাজ না করে**, দয়া করে আমাকে এই তথ্যগুলো দিন যাতে সঠিক জায়গা ধরতে পারি:
- Management **add** করার সময় কি কোনো error toast দেখায়, নাকি "successfully added" মেসেজ আসে?
- **Login** করার সময় ঠিক কী হয় — "ভুল নম্বর বা PIN" এরর দেখায়, নাকি অন্য কোনো পেজে আটকে যায়, নাকি কিছুই হয় না?
- Management যে ফোন নম্বর দিয়ে login করছে, সেটা কি ঠিক ঐ একই নম্বর যেটা owner Add করার সময় টাইপ করেছিল (স্পেস/ড্যাশ ছাড়া, ঠিক ১১ ডিজিট)?

**Team/PINs এখন যেভাবে কাজ করে (স্পষ্ট করে বলছি):**
1. Owner "Team/PINs" পেজে গিয়ে "+ Add User" চাপে
2. নাম, ফোন নম্বর (Management-এর নিজের, owner-এর না), ৪-৬ ডিজিট PIN, role (Admin/Management), আর role
   Management হলে কোন কোন Flat-এ অ্যাক্সেস থাকবে — এগুলো দিয়ে Save করে
3. Management ব্যক্তি এখন নিজের ফোনে/কম্পিউটারে গিয়ে সরাসরি ওয়েবসাইটের `/login` পেজে যায়
4. নিজের ফোন নম্বর + Owner-এর দেওয়া PIN দিয়ে লগইন করে — এটা ঠিক Owner যেভাবে লগইন করে, একই পদ্ধতি
5. লগইন করলে তারা নিজের permission (কোন flat, কোন feature দেখতে/এডিট করতে পারবে) অনুযায়ী সীমিত অ্যাক্সেস পায়

আগে (পুরনো Google Sheets ভার্সনে) এটা shared-device PIN স্ক্রিন ছিল — এখন সেটা সম্পূর্ণ সরিয়ে প্রত্যেকের
নিজস্ব ফোন+PIN লগইন করা হয়েছে, ঠিক আপনি যেমন request করেছিলেন।

---

## GitHub-এ কোড push করার নিয়ম

প্রথমবার:
```bash
cd mess-manager-saas   # প্রজেক্ট ফোল্ডারে ঢুকুন
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

এরপর যেকোনো নতুন পরিবর্তনের পর:
```bash
git add .
git commit -m "changes description লিখুন এখানে"
git push
```

**⚠️ গুরুত্বপূর্ণ:** `.env` ফাইল **কখনো push করবেন না** — এতে আপনার database password ও secret key থাকে।
`.gitignore` ফাইলে এটা আগে থেকেই বাদ দেওয়া আছে, তাই সাধারণত এটা এমনিতেই push হবে না, কিন্তু নিশ্চিত হতে
`git status` চালিয়ে দেখে নিন `.env` লিস্টে না থাকে।

GitHub-এ push করার পর Vercel-এ প্রজেক্ট কানেক্ট করা থাকলে **অটোমেটিক্যালি নতুন ভার্সন deploy হয়ে যাবে** —
আলাদা করে কিছু করা লাগবে না।
