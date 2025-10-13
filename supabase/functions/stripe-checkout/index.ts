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

    const { plan, return_url } = await req.json()

    if (!plan || !return_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has any previous subscription (including cancelled ones)
    const { data: existingSubscriptions, error: subscriptionCheckError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (subscriptionCheckError) {
      console.error('Error checking existing subscription:', subscriptionCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has an active subscription
    const activeSubscription = existingSubscriptions?.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    )

    if (activeSubscription) {
      return new Response(
        JSON.stringify({ 
          error: 'User already has an active subscription',
          existingSubscription: {
            plan: activeSubscription.plan,
            status: activeSubscription.status,
            created_at: activeSubscription.created_at
          }
        }),
        { 
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has had a trial before
    const hasHadTrial = existingSubscriptions?.some(sub => 
      sub.status === 'trialing' || sub.status === 'cancelled'
    )

    // Define price IDs based on plan and trial eligibility
    let priceId: string
    let trialPeriodDays: number | undefined

    if (plan === 'monthly') {
      priceId = Deno.env.get('STRIPE_MONTHLY_PRICE_ID') || ''
      trialPeriodDays = undefined // No trial for monthly
    } else if (plan === 'yearly') {
      priceId = Deno.env.get('STRIPE_YEARLY_PRICE_ID') || ''
      // Only give trial to users who haven't had one before
      trialPeriodDays = hasHadTrial ? undefined : 3
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or retrieve customer
    let customer
    try {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create customer' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: {
        supabase_user_id: user.id,
        plan: plan,
      },
      // Enable embedded checkout
      ui_mode: 'embedded',
      return_url: return_url,
    }

    // Add trial period for yearly plan
    if (trialPeriodDays) {
      sessionParams.subscription_data = {
        trial_period_days: trialPeriodDays,
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        clientSecret: session.client_secret,
        url: session.url, // Include URL as fallback
        hasTrial: trialPeriodDays !== undefined,
        trialDays: trialPeriodDays,
        isRetrial: hasHadTrial
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
