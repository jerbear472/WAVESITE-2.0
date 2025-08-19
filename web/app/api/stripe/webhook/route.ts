import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update user subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_tier: subscription.metadata?.plan_type || 'creator',
            stripe_subscription_id: subscription.id,
            // These fields may not exist in the profiles table, commenting out for now
            // subscription_current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            // subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            // subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
          })
          .eq('stripe_customer_id', subscription.customer as string);

        console.log(`Subscription ${subscription.status}: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update user subscription status to canceled
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            // subscription_cancel_at_period_end: false,
          })
          .eq('stripe_customer_id', subscription.customer as string);

        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any; // Type assertion to bypass strict typing
        
        // Check if invoice has a subscription
        const subscriptionId = invoice.subscription;
          
        if (subscriptionId) {
          // Update payment status
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              last_payment_date: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Payment succeeded for subscription: ${subscriptionId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any; // Type assertion to bypass strict typing
        
        // Check if invoice has a subscription
        const subscriptionId = invoice.subscription;
          
        if (subscriptionId) {
          // Update payment status
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Payment failed for subscription: ${subscriptionId}`);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          // Handle successful subscription signup
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await supabase
            .from('profiles')
            .update({
              subscription_status: subscription.status,
              subscription_tier: subscription.metadata.plan_type || 'creator',
              stripe_subscription_id: subscription.id,
              subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_customer_id', session.customer);

          console.log(`Checkout completed for subscription: ${subscription.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}