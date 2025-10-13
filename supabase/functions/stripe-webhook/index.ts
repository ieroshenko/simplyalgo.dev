import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No stripe signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let event: Stripe.Event

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id)

        // Update user subscription status in database
        if (session.metadata?.supabase_user_id) {
          // First, cancel any existing active subscriptions for this user
          const { error: cancelError } = await supabaseClient
            .rpc('cancel_existing_subscriptions_on_new_active', {
              p_user_id: session.metadata.supabase_user_id,
              p_new_subscription_id: session.subscription as string
            })

          if (cancelError) {
            console.error('Error canceling existing subscriptions:', cancelError)
          } else {
            console.log('Existing subscriptions canceled successfully')
          }

          // Get subscription details from Stripe to determine status
          let subscriptionStatus = 'active'
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
              subscriptionStatus = subscription.status === 'trialing' ? 'trialing' : 'active'
            } catch (err) {
              console.error('Error retrieving subscription:', err)
            }
          }
          
          const { error } = await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: session.metadata.supabase_user_id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              plan: session.metadata.plan,
              status: subscriptionStatus,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          if (error) {
            console.error('Error updating subscription:', error)
          } else {
            console.log('Subscription updated successfully')
          }
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription created:', subscription.id)

        // Update subscription status
        // const { error } = await supabaseClient
        //   .from('user_subscriptions')
        //   .update({
        //     status: subscription.status,
        //     updated_at: new Date().toISOString(),
        //   })
        //   .eq('stripe_subscription_id', subscription.id)

        // if (error) {
        //   console.error('Error updating subscription status:', error)
        // }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id, ' status:', subscription.status)

        // Update subscription status
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription deleted:', subscription.id)

        // Update subscription status to cancelled
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment succeeded:', invoice.id)

        // Update subscription status to active
        
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.parent.subscription_details.subscription as string)
        
        console.log('Subscription updated:', invoice.parent.subscription_details.subscription, ' status:', 'active')
        if (error) {
          console.error('Error updating subscription status:', error)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', invoice.id)

        // Update subscription status to past_due
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.parent.subscription_details.subscription as string)

        if (error) {
          console.error('Error updating subscription status:', error)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
