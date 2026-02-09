import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { STRIPE_PRICES } from "./products";
import { type SubscriptionTier } from "@/lib/constants";

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

function tierFromPriceId(priceId: string): SubscriptionTier {
  for (const mapping of Object.values(STRIPE_PRICES)) {
    if (mapping.priceId === priceId) return mapping.tier;
  }
  return "free";
}

const handlers: Record<string, WebhookHandler> = {
  "checkout.session.completed": async (event) => {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const tier = session.metadata?.tier as SubscriptionTier | undefined;

    if (!userId) {
      console.error("checkout.session.completed: missing user_id in metadata");
      return;
    }

    const supabase = await createServiceClient();

    await supabase
      .from("users")
      .update({
        subscription_tier: tier || "professional",
        stripe_customer_id: session.customer as string,
      })
      .eq("id", userId);
  },

  "customer.subscription.updated": async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const supabase = await createServiceClient();

    // Look up user by Stripe customer ID
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!user) {
      console.error("subscription.updated: no user found for customer", customerId);
      return;
    }

    // Get the tier from the subscription's price
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = priceId ? tierFromPriceId(priceId) : "free";

    await supabase
      .from("users")
      .update({ subscription_tier: tier })
      .eq("id", user.id);
  },

  "customer.subscription.deleted": async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const supabase = await createServiceClient();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!user) {
      console.error("subscription.deleted: no user found for customer", customerId);
      return;
    }

    // Downgrade to free tier
    await supabase
      .from("users")
      .update({ subscription_tier: "free" })
      .eq("id", user.id);
  },

  "invoice.payment_succeeded": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    console.log("Payment succeeded:", invoice.id);
    // Monthly quota reset happens naturally via monthly_reset_at check
  },

  "invoice.payment_failed": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    console.error("Payment failed for customer:", customerId, "invoice:", invoice.id);
    // Grace period: don't immediately downgrade — Stripe retries automatically
    // Consider sending notification via email service here
  },
};

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  const handler = handlers[event.type];
  if (handler) {
    await handler(event);
  } else {
    console.log("Unhandled Stripe event type:", event.type);
  }
}
