import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          currency: string
          features: any
          stripe_product_id: string | null
          stripe_price_id: string | null
          interval_type: string
          is_active: boolean
          created_at: string
        }
      }
      processed_stripe_events: { // Added interface for the new table
        Row: {
          event_id: string
        }
        Insert: {
          event_id: string
        }
      }
    }
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      throw new Error('Missing signature or webhook secret')
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    console.log('Processing webhook event:', event.type)

    // Check if the event has already been processed
    const { data: processedEvent, error: fetchError } = await supabaseClient
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking processed events:', fetchError);
      throw fetchError; // Re-throw to indicate a problem
    }

    if (processedEvent) {
      console.log('Event already processed:', event.id);
      return new Response(JSON.stringify({ received: true, message: 'Event already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }


    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription') {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const customer = await stripe.customers.retrieve(session.customer as string)

          // Extract user ID from metadata
          const userId = session.metadata?.user_id
          if (!userId) {
            console.error('No user_id in session metadata')
            break
          }

          // Get plan details from price ID
          const priceId = subscription.items.data[0].price.id
          const { data: plan } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('stripe_price_id', priceId)
            .single()

          if (!plan) {
            console.error('Plan not found for price ID:', priceId)
            break
          }

          // Create subscription record
          const { error } = await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_id: plan.id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })

          if (error) {
            console.error('Error creating subscription:', error)
          } else {
            console.log('Subscription created successfully for user:', userId)

            // Insert processed event ID
            const { error: insertError } = await supabaseClient
              .from('processed_stripe_events')
              .insert({ event_id: event.id });

            if (insertError) {
              console.error('Error inserting processed event ID:', insertError);
              // You might want to handle this error more robustly, e.g., with retries
            } else {
              console.log('Processed event ID inserted:', event.id);
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription record
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log('Subscription updated successfully:', subscription.id)

          // Insert processed event ID
          const { error: insertError } = await supabaseClient
            .from('processed_stripe_events')
            .insert({ event_id: event.id });

          if (insertError) {
            console.error('Error inserting processed event ID:', insertError);
            // You might want to handle this error more robustly, e.g., with retries
          } else {
            console.log('Processed event ID inserted:', event.id);
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Mark subscription as canceled
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error canceling subscription:', error)
        } else {
          console.log('Subscription canceled successfully:', subscription.id)

          // Insert processed event ID
          const { error: insertError } = await supabaseClient
            .from('processed_stripe_events')
            .insert({ event_id: event.id });

          if (insertError) {
            console.error('Error inserting processed event ID:', insertError);
            // You might want to handle this error more robustly, e.g., with retries
          } else {
            console.log('Processed event ID inserted:', event.id);
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          // Mark subscription as past due
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('Error updating subscription to past_due:', error)
          } else {
            console.log('Subscription marked as past_due:', invoice.subscription)

            // Insert processed event ID
            const { error: insertError } = await supabaseClient
              .from('processed_stripe_events')
              .insert({ event_id: event.id });

            if (insertError) {
              console.error('Error inserting processed event ID:', insertError);
              // You might want to handle this error more robustly, e.g., with retries
            } else {
              console.log('Processed event ID inserted:', event.id);
            }
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          // Mark subscription as active
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('Error updating subscription to active:', error)
          } else {
            console.log('Subscription marked as active:', invoice.subscription)

            // Insert processed event ID
            const { error: insertError } = await supabaseClient
              .from('processed_stripe_events')
              .insert({ event_id: event.id });

            if (insertError) {
              console.error('Error inserting processed event ID:', insertError);
              // You might want to handle this error more robustly, e.g., with retries
            } else {
              console.log('Processed event ID inserted:', event.id);
            }
          }
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
