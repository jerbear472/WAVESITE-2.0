import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Initialize Stripe only if environment variable is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
let stripe: Stripe | null = null;

if (stripeSecretKey && stripeSecretKey !== '') {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-07-30.basil',
  });
}

export async function POST(request: NextRequest) {
  // Return early if Stripe is not configured
  if (!stripe) {
    console.error('Stripe checkout endpoint called but Stripe is not configured');
    return NextResponse.json(
      { error: 'Payment system is not configured. Please contact support.' },
      { status: 503 }
    );
  }
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { priceId, planType } = await request.json();
    
    // Define price IDs for different plans
    const PRICE_IDS = {
      creator_monthly: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID || 'price_creator_monthly',
      creator_yearly: process.env.STRIPE_CREATOR_YEARLY_PRICE_ID || 'price_creator_yearly',
      enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
    };

    // Create or retrieve Stripe customer
    let customerId = null;
    
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();
    
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe!.customers.create({
        email: session.user.email,
        metadata: {
          supabase_user_id: session.user.id,
        },
      });
      
      customerId = customer.id;
      
      // Save customer ID to database
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    // Create checkout session
    const checkoutSession = await stripe!.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[priceId as keyof typeof PRICE_IDS] || PRICE_IDS.creator_monthly,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          supabase_user_id: session.user.id,
          plan_type: planType || 'creator',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/creator/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/creator?canceled=true`,
      metadata: {
        supabase_user_id: session.user.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Handle subscription updates
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { action } = await request.json();
    
    // Get user's subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', session.user.id)
      .single();
    
    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    if (action === 'cancel') {
      // Cancel subscription at period end
      const subscription = await stripe!.subscriptions.update(
        profile.stripe_subscription_id,
        { cancel_at_period_end: true }
      );
      
      // Update database
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'canceling',
          subscription_cancel_at: new Date(subscription.cancel_at! * 1000).toISOString()
        })
        .eq('id', session.user.id);
      
      return NextResponse.json({ message: 'Subscription will be canceled at period end' });
    } else if (action === 'reactivate') {
      // Reactivate canceled subscription
      const subscription = await stripe!.subscriptions.update(
        profile.stripe_subscription_id,
        { cancel_at_period_end: false }
      );
      
      // Update database
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'active',
          subscription_cancel_at: null
        })
        .eq('id', session.user.id);
      
      return NextResponse.json({ message: 'Subscription reactivated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Subscription update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}