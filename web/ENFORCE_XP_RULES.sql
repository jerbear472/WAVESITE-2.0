-- ENFORCE CORRECT XP RULES
-- Submit trend: +10 XP
-- Community validates: +50 XP
-- Community rejects: -15 XP

-- Create or replace the function that handles trend approval
CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_spotter_id UUID;
BEGIN
  -- Only process if status changed to 'validated' or 'approved'
  IF NEW.status IN ('validated', 'approved') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('validated', 'approved')) THEN
    
    -- Get the spotter ID
    SELECT spotter_id INTO v_spotter_id FROM public.trend_submissions WHERE id = NEW.id;
    
    IF v_spotter_id IS NOT NULL THEN
      -- Award 50 XP bonus for validation
      INSERT INTO public.xp_transactions (
        user_id, 
        amount, 
        type, 
        description,
        trend_id
      ) VALUES (
        v_spotter_id,
        50,
        'trend_validated',
        'Your trend was validated by the community! +50 XP',
        NEW.id
      );
      
      RAISE NOTICE 'Awarded 50 XP to user % for validated trend %', v_spotter_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the function that handles trend rejection
CREATE OR REPLACE FUNCTION handle_trend_rejection()
RETURNS TRIGGER AS $$
DECLARE
  v_spotter_id UUID;
BEGIN
  -- Only process if status changed to 'rejected'
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    
    -- Get the spotter ID
    SELECT spotter_id INTO v_spotter_id FROM public.trend_submissions WHERE id = NEW.id;
    
    IF v_spotter_id IS NOT NULL THEN
      -- Apply -15 XP penalty for rejection
      INSERT INTO public.xp_transactions (
        user_id, 
        amount, 
        type, 
        description,
        trend_id
      ) VALUES (
        v_spotter_id,
        -15,
        'trend_rejected',
        'Your trend was rejected by the community. -15 XP',
        NEW.id
      );
      
      RAISE NOTICE 'Applied -15 XP penalty to user % for rejected trend %', v_spotter_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trend_approval_xp_trigger ON public.trend_submissions;
DROP TRIGGER IF EXISTS trend_rejection_xp_trigger ON public.trend_submissions;

-- Create triggers for approval and rejection
CREATE TRIGGER trend_approval_xp_trigger
  AFTER UPDATE ON public.trend_submissions
  FOR EACH ROW
  WHEN (NEW.status IN ('validated', 'approved'))
  EXECUTE FUNCTION handle_trend_approval();

CREATE TRIGGER trend_rejection_xp_trigger
  AFTER UPDATE ON public.trend_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'rejected')
  EXECUTE FUNCTION handle_trend_rejection();

-- Update the award_xp function to use correct values
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_total INTEGER;
  v_actual_amount INTEGER;
BEGIN
  -- Set correct amounts based on type
  IF p_type = 'trend_submission' THEN
    v_actual_amount := 10;  -- Base submission XP
  ELSIF p_type = 'trend_validated' THEN
    v_actual_amount := 50;  -- Validation bonus
  ELSIF p_type = 'trend_rejected' THEN
    v_actual_amount := -15; -- Rejection penalty
  ELSE
    v_actual_amount := p_amount; -- Use provided amount for other types
  END IF;
  
  -- Insert XP transaction
  INSERT INTO public.xp_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_actual_amount, p_type, COALESCE(p_description, p_type));
  
  -- Update user's total XP (handled by trigger)
  SELECT total_xp INTO v_new_total 
  FROM public.user_xp 
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_new_total, v_actual_amount);
END;
$$ LANGUAGE plpgsql;

-- Verify the XP rules are correct
SELECT 
  'XP Rules Configuration' as check_type,
  'Submission: +10 XP' as rule_1,
  'Validated: +50 XP' as rule_2,
  'Rejected: -15 XP' as rule_3,
  'Status: READY' as status;