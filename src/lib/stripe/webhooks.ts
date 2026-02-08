import Stripe from "stripe";

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const handlers: Record<string, WebhookHandler> = {
  "checkout.session.completed": async (event) => {
    const session = event.data.object as Stripe.Checkout.Session;
    // TODO: Update user subscription_tier and stripe_customer_id in DB
    console.log("Checkout completed:", session.id);
  },

  "customer.subscription.updated": async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    // TODO: Sync subscription status to DB (tier, status)
    console.log("Subscription updated:", subscription.id);
  },

  "customer.subscription.deleted": async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    // TODO: Downgrade user to free tier in DB
    console.log("Subscription deleted:", subscription.id);
  },

  "invoice.payment_succeeded": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    // TODO: Log successful payment, reset monthly quota if needed
    console.log("Payment succeeded:", invoice.id);
  },

  "invoice.payment_failed": async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    // TODO: Notify user of failed payment, consider grace period
    console.log("Payment failed:", invoice.id);
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
