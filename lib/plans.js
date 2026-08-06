// Central place to define pricing — change prices here and every page
// (landing, billing, admin) stays in sync.
export const TRIAL_DAYS = 7;

export const PLANS = {
  monthly: {
    id: 'monthly',
    label: 'মাসিক',
    price: 499,
    durationDays: 30,
    tagline: 'যেকোনো সাইজের মেসের জন্য',
  },
  yearly: {
    id: 'yearly',
    label: 'বাৎসরিক',
    price: 4990,
    durationDays: 365,
    tagline: '২ মাস ফ্রি — সবচেয়ে সাশ্রয়ী',
  },
};

// Payment numbers you actually receive money on — update to your real
// bKash/Nagad "Send Money" or "Merchant" numbers before going live.
export const PAYMENT_NUMBERS = {
  bKash: '01XXXXXXXXX',
  Nagad: '01XXXXXXXXX',
};
