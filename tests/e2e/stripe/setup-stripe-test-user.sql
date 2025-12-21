-- Create a test user for Stripe checkout testing (no subscription)
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. First, create the user in Authentication -> Users -> Add User:
--    Email: stripe-test@simplyalgo.dev
--    Password: StripeTestPassword123!

-- 2. Then run this SQL to create the user profile:

-- Get the user ID first (run this to see the ID)
SELECT id, email FROM auth.users WHERE email = 'stripe-test@simplyalgo.dev';

-- Create profile for the stripe test user
INSERT INTO user_profiles (user_id, email, name, created_at, updated_at)
SELECT 
    id,
    email,
    'Stripe Test User',
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'stripe-test@simplyalgo.dev'
ON CONFLICT (user_id) DO UPDATE SET
    name = 'Stripe Test User',
    updated_at = NOW();

-- Verify the user has NO subscription
SELECT up.email, us.status 
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id
WHERE up.email = 'stripe-test@simplyalgo.dev';

-- If there's a subscription, delete it (optional - only if needed)
-- DELETE FROM user_subscriptions 
-- WHERE user_id = (SELECT user_id FROM user_profiles WHERE email = 'stripe-test@simplyalgo.dev');
