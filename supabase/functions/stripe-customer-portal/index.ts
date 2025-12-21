/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { return_url } = await req.json()

    if (!return_url) {
      return new Response(
        JSON.stringify({ error: 'Missing return_url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's subscription to find their Stripe customer ID
    // Allow access for active, trialing, and past_due subscriptions
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .single()

    if (subscriptionError || !subscription) {
      console.log('Subscription error:', subscriptionError)
      console.log('User ID:', user.id)
      return new Response(
        JSON.stringify({ 
          error: 'No active subscription found',
          details: subscriptionError?.message || 'No subscription found for user'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create customer portal session
    let session
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: return_url,
      })
    } catch (stripeError: any) {
      console.error('Stripe portal error:', stripeError)
      if (stripeError.message?.includes('No configuration provided') || 
          stripeError.message?.includes('test mode default configuration has not been created')) {
        return new Response(
          JSON.stringify({ 
            error: 'Customer portal not configured',
            message: 'Please configure the Stripe Customer Portal in your dashboard first.'
          }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      throw stripeError
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
