if (!process.env.STRIPE_PRICE_ID_PRO_MONTHLY || !process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
  throw new Error('Missing Stripe price ID environment variables (STRIPE_PRICE_ID_PRO_MONTHLY, STRIPE_PRICE_ID_PRO_ANNUAL)');
}

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
};

export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    priceId: STRIPE_PRICE_IDS.MONTHLY,
    price: 15,
    interval: 'month' as const,
    name: 'CrewUp Pro Monthly',
  },
  ANNUAL: {
    priceId: STRIPE_PRICE_IDS.ANNUAL,
    price: 150,
    interval: 'year' as const,
    name: 'CrewUp Pro Annual',
  },
};
