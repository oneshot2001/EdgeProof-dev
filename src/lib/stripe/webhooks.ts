import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "./client";
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

    const updatePayload: Record<string, unknown> = {
      subscription_tier: tier || "professional",
      stripe_customer_id: session.customer as string,
    };

    // Retrieve the subscription ID from the session so we can track it
    if (session.subscription) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          // Store subscription ID in the user record for future reference
          updatePayload.stripe_subscription_id = subscription.id;
        } catch (err) {
          console.error("Failed to retrieve subscription from session:", err);
        }
      }
    }

    // Reset monthly counter on new subscription
    updatePayload.monthly_verifications = 0;
    updatePayload.monthly_reset_at = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      1
    ).toISOString();

    await supabase.from("users").update(updatePayload).eq("id", userId);
  },

  "customer.subscription.updated": async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const supabase = await createServiceClient();

    // Look up user by Stripe customer ID
    const { data: user } = await supabase
      .from("users")
      .select("id, subscription_tier")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!user) {
      console.error(
        "subscription.updated: no user found for customer",
        customerId
      );
      return;
    }

    // Get the tier from the subscription's price
    const priceId = subscription.items.data[0]?.price?.id;
    const newTier = priceId ? tierFromPriceId(priceId) : "free";

    const updatePayload: Record<string, unknown> = {
      subscription_tier: newTier,
    };

    // If the subscription is being canceled at period end, keep current tier until then
    if (subscription.cancel_at_period_end) {
      // Don't change tier yet -- it stays active until period ends
      // The subscription.deleted event will handle the actual downgrade
      console.log(
        `Subscription ${subscription.id} scheduled for cancellation at period end`
      );
      return;
    }

    // If upgrading/downgrading between paid tiers, reset counter
    if (newTier !== user.subscription_tier) {
      updatePayload.monthly_verifications = 0;
      updatePayload.monthly_reset_at = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString();
    }

    await supabase.from("users").update(updatePayload).eq("id", user.id);
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
      console.error(
        "subscription.deleted: no user found for customer",
        customerId
      );
      return;
    }

    // Downgrade to free tier and reset counter
    await supabase
      .from("users")
      .update({
        subscription_tier: "free",
        monthly_verifications: 0,
        monthly_reset_at: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
      })
      .eq("id", user.id);
  },

  "invoice.payment_succeeded": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    // On successful renewal payment, ensure the user tier is synced
    if (invoice.billing_reason === "subscription_cycle" && customerId) {
      const supabase = await createServiceClient();

      const { data: user } = await supabase
        .from("users")
        .select("id, subscription_tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user) {
        // Reset monthly verification counter on billing cycle renewal
        await supabase
          .from("users")
          .update({
            monthly_verifications: 0,
            monthly_reset_at: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1
            ).toISOString(),
          })
          .eq("id", user.id);
      }
    }

    console.log("Payment succeeded:", invoice.id);
  },

  "invoice.payment_failed": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    console.error(
      "Payment failed for customer:",
      customerId,
      "invoice:",
      invoice.id,
      "attempt:",
      invoice.attempt_count
    );

    // After 3 failed payment attempts, downgrade the user
    // Stripe's default retry schedule is ~3 attempts over ~3 weeks
    if (invoice.attempt_count && invoice.attempt_count >= 3) {
      const supabase = await createServiceClient();

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user) {
        console.error(
          `Downgrading user ${user.id} after ${invoice.attempt_count} failed payment attempts`
        );
        await supabase
          .from("users")
          .update({ subscription_tier: "free" })
          .eq("id", user.id);
      }
    }
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
