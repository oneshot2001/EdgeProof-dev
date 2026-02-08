import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_placeholder")) {
    console.warn(
      "Stripe secret key not configured — payment features disabled"
    );
    return null;
  }

  stripeInstance = new Stripe(key, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });

  return stripeInstance;
}
