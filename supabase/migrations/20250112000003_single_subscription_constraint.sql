-- Add constraint to ensure only one active subscription per user
-- This prevents users from having multiple active subscriptions

-- First, let's add a unique partial index for active subscriptions
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS user_subscriptions_one_active_per_user 
ON user_subscriptions (user_id) 
WHERE status IN ('active', 'trialing');

-- Add a check constraint to ensure valid status values
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'past_due', 'cancelled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'));

-- Add a function to check for existing active subscriptions
CREATE OR REPLACE FUNCTION check_existing_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to prevent multiple active subscriptions
CREATE OR REPLACE FUNCTION prevent_multiple_active_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated subscription is active or trialing
  IF NEW.status IN ('active', 'trialing') THEN
    -- Check if there's already an active subscription for this user
    IF EXISTS (
      SELECT 1 
      FROM user_subscriptions 
      WHERE user_id = NEW.user_id 
      AND status IN ('active', 'trialing')
      AND id != NEW.id  -- Exclude the current record being updated
    ) THEN
      RAISE EXCEPTION 'User already has an active subscription. Only one active subscription per user is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_multiple_active_subscriptions_trigger ON user_subscriptions;
CREATE TRIGGER prevent_multiple_active_subscriptions_trigger
  BEFORE INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_multiple_active_subscriptions();

-- Add RLS policy to ensure users can only see their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add a function to cancel existing subscriptions when a new one is created
CREATE OR REPLACE FUNCTION cancel_existing_subscriptions_on_new_active(p_user_id UUID, p_new_subscription_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Cancel any existing active subscriptions for this user
  UPDATE user_subscriptions 
  SET status = 'cancelled', updated_at = NOW()
  WHERE user_id = p_user_id 
  AND status IN ('active', 'trialing')
  AND id != p_new_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

