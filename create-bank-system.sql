-- Bank Balance System for WaveSight
-- This system manages a central bank balance that admins can fund
-- Users cashout requests withdraw from this balance

-- 1. Create bank_balance table to track central funds
CREATE TABLE IF NOT EXISTS public.bank_balance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    current_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (current_balance >= 0),
    total_deposited DECIMAL(12,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Initialize with one bank balance record
INSERT INTO public.bank_balance (current_balance, total_deposited, total_withdrawn, updated_by)
SELECT 0.00, 0.00, 0.00, auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.bank_balance);

-- 2. Create bank_transactions table to track all bank operations
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'cashout', 'refund')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Links to cashout_requests.id for cashouts
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Extra data like admin notes, transaction IDs, etc.
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON public.bank_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_created_at ON public.bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reference ON public.bank_transactions(reference_id);

-- 3. Function to add money to bank (admin only)
CREATE OR REPLACE FUNCTION admin_deposit_to_bank(
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT 'Admin deposit'
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance DECIMAL(12,2);
    v_new_balance DECIMAL(12,2);
    v_transaction_id UUID;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (
            email = 'jeremyuys@gmail.com' 
            OR role = 'admin' 
            OR is_admin = true
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Get current balance
    SELECT current_balance INTO v_current_balance
    FROM public.bank_balance
    LIMIT 1;

    -- If no bank balance record exists, create it
    IF v_current_balance IS NULL THEN
        INSERT INTO public.bank_balance (current_balance, total_deposited, total_withdrawn, updated_by)
        VALUES (0.00, 0.00, 0.00, auth.uid());
        v_current_balance := 0.00;
    END IF;

    v_new_balance := v_current_balance + p_amount;

    -- Record transaction
    INSERT INTO public.bank_transactions (
        transaction_type, amount, balance_before, balance_after,
        description, created_by, metadata
    ) VALUES (
        'deposit', p_amount, v_current_balance, v_new_balance,
        p_description, auth.uid(),
        jsonb_build_object('admin_deposit', true, 'timestamp', NOW())
    ) RETURNING id INTO v_transaction_id;

    -- Update bank balance
    UPDATE public.bank_balance
    SET 
        current_balance = v_new_balance,
        total_deposited = total_deposited + p_amount,
        last_updated = NOW(),
        updated_by = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_added', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to withdraw from bank for cashouts
CREATE OR REPLACE FUNCTION bank_withdraw_for_cashout(
    p_cashout_request_id UUID,
    p_amount DECIMAL(10,2)
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance DECIMAL(12,2);
    v_new_balance DECIMAL(12,2);
    v_transaction_id UUID;
    v_user_id UUID;
    v_venmo_username TEXT;
BEGIN
    -- Get current bank balance
    SELECT current_balance INTO v_current_balance
    FROM public.bank_balance
    LIMIT 1;

    -- Check if sufficient funds
    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient bank funds',
            'required', p_amount,
            'available', COALESCE(v_current_balance, 0)
        );
    END IF;

    -- Get cashout request details
    SELECT user_id, venmo_username INTO v_user_id, v_venmo_username
    FROM public.cashout_requests
    WHERE id = p_cashout_request_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cashout request not found'
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- Record transaction
    INSERT INTO public.bank_transactions (
        transaction_type, amount, balance_before, balance_after,
        description, reference_id, created_by, metadata
    ) VALUES (
        'cashout', p_amount, v_current_balance, v_new_balance,
        'Cashout payment to ' || v_venmo_username, p_cashout_request_id, auth.uid(),
        jsonb_build_object('user_id', v_user_id, 'venmo_username', v_venmo_username)
    ) RETURNING id INTO v_transaction_id;

    -- Update bank balance
    UPDATE public.bank_balance
    SET 
        current_balance = v_new_balance,
        total_withdrawn = total_withdrawn + p_amount,
        last_updated = NOW(),
        updated_by = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_withdrawn', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced cashout processing function that checks bank balance
CREATE OR REPLACE FUNCTION process_cashout_with_bank_check(
    p_request_id UUID,
    p_new_status TEXT,
    p_notes TEXT DEFAULT NULL,
    p_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cashout_amount DECIMAL(10,2);
    v_bank_balance DECIMAL(12,2);
    v_withdrawal_result JSONB;
    v_user_id UUID;
BEGIN
    -- Get cashout request details
    SELECT amount, user_id INTO v_cashout_amount, v_user_id
    FROM public.cashout_requests
    WHERE id = p_request_id;

    IF v_cashout_amount IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cashout request not found'
        );
    END IF;

    -- If approving or completing, check bank balance
    IF p_new_status IN ('approved', 'completed') THEN
        SELECT current_balance INTO v_bank_balance
        FROM public.bank_balance
        LIMIT 1;

        IF v_bank_balance < v_cashout_amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient bank funds',
                'required', v_cashout_amount,
                'available', COALESCE(v_bank_balance, 0)
            );
        END IF;

        -- If completing payment, withdraw from bank
        IF p_new_status = 'completed' THEN
            SELECT bank_withdraw_for_cashout(p_request_id, v_cashout_amount) INTO v_withdrawal_result;
            
            IF NOT (v_withdrawal_result->>'success')::boolean THEN
                RETURN v_withdrawal_result;
            END IF;
        END IF;
    END IF;

    -- Update the cashout request
    UPDATE public.cashout_requests
    SET 
        status = p_new_status,
        processed_at = NOW(),
        admin_notes = p_notes,
        transaction_id = CASE WHEN p_new_status = 'completed' THEN p_transaction_id ELSE transaction_id END
    WHERE id = p_request_id;

    -- Update user's earnings when completed
    IF p_new_status = 'completed' THEN
        -- Call the earnings refresh to recalculate user's available balance
        PERFORM refresh_user_earnings(v_user_id);
        
        -- Also update the user's total_cashed_out if column exists
        UPDATE public.profiles 
        SET total_cashed_out = COALESCE(total_cashed_out, 0) + v_cashout_amount
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', p_new_status,
        'amount', v_cashout_amount,
        'withdrawal_result', v_withdrawal_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get bank status (admin only)
CREATE OR REPLACE FUNCTION get_bank_status()
RETURNS JSONB AS $$
DECLARE
    v_balance_info RECORD;
    v_pending_cashouts DECIMAL(12,2);
    v_stats JSONB;
BEGIN
    -- Check admin access
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (
            email = 'jeremyuys@gmail.com' 
            OR role = 'admin' 
            OR is_admin = true
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Get bank balance info
    SELECT * INTO v_balance_info
    FROM public.bank_balance
    LIMIT 1;

    -- Calculate pending cashouts
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_cashouts
    FROM public.cashout_requests
    WHERE status IN ('pending', 'approved');

    -- Get recent transaction stats
    SELECT jsonb_build_object(
        'deposits_this_month', COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount END), 0),
        'cashouts_this_month', COALESCE(SUM(CASE WHEN transaction_type = 'cashout' THEN amount END), 0),
        'transaction_count', COUNT(*)
    ) INTO v_stats
    FROM public.bank_transactions
    WHERE created_at >= date_trunc('month', NOW());

    RETURN jsonb_build_object(
        'current_balance', COALESCE(v_balance_info.current_balance, 0),
        'total_deposited', COALESCE(v_balance_info.total_deposited, 0),
        'total_withdrawn', COALESCE(v_balance_info.total_withdrawn, 0),
        'pending_cashouts', v_pending_cashouts,
        'available_after_pending', COALESCE(v_balance_info.current_balance, 0) - v_pending_cashouts,
        'last_updated', v_balance_info.last_updated,
        'monthly_stats', v_stats
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. View for bank transactions (admin only)
CREATE OR REPLACE VIEW public.bank_transactions_admin AS
SELECT 
    bt.*,
    CASE 
        WHEN bt.reference_id IS NOT NULL THEN
            (SELECT jsonb_build_object(
                'user_email', up.email,
                'venmo_username', cr.venmo_username,
                'request_status', cr.status
            )
            FROM public.cashout_requests cr
            JOIN public.profiles up ON cr.user_id = up.id
            WHERE cr.id = bt.reference_id)
        ELSE NULL
    END as cashout_details
FROM public.bank_transactions bt
ORDER BY bt.created_at DESC;

-- Enable RLS
ALTER TABLE public.bank_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only)
CREATE POLICY "Admin can view bank balance" ON public.bank_balance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND (email = 'jeremyuys@gmail.com' OR role = 'admin' OR is_admin = true)
        )
    );

CREATE POLICY "Admin can view bank transactions" ON public.bank_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND (email = 'jeremyuys@gmail.com' OR role = 'admin' OR is_admin = true)
        )
    );

-- Grant permissions
GRANT SELECT ON public.bank_balance TO authenticated;
GRANT SELECT ON public.bank_transactions TO authenticated;
GRANT SELECT ON public.bank_transactions_admin TO authenticated;
GRANT EXECUTE ON FUNCTION admin_deposit_to_bank(DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bank_status() TO authenticated;
GRANT EXECUTE ON FUNCTION process_cashout_with_bank_check(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.bank_balance IS 'Central bank balance that funds all user cashouts';
COMMENT ON TABLE public.bank_transactions IS 'Audit log of all bank deposits and withdrawals';
COMMENT ON FUNCTION admin_deposit_to_bank(DECIMAL, TEXT) IS 'Allows admins to add money to the bank balance';
COMMENT ON FUNCTION process_cashout_with_bank_check(UUID, TEXT, TEXT, TEXT) IS 'Enhanced cashout processing that checks/withdraws from bank balance';
COMMENT ON FUNCTION get_bank_status() IS 'Returns comprehensive bank status including balance, pending cashouts, and stats';