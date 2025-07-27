-- Create cash out requests table
CREATE TABLE IF NOT EXISTS public.cashout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    venmo_username TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.user_profiles(id),
    admin_notes TEXT,
    transaction_id TEXT, -- Venmo transaction ID when completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON public.cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON public.cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_requested_at ON public.cashout_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own cashout requests
CREATE POLICY "Users can view own cashout requests" ON public.cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create cashout requests
CREATE POLICY "Users can create cashout requests" ON public.cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all cashout requests
CREATE POLICY "Admins can view all cashout requests" ON public.cashout_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update cashout requests
CREATE POLICY "Admins can update cashout requests" ON public.cashout_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.cashout_requests TO authenticated;
GRANT UPDATE ON public.cashout_requests TO authenticated;

-- Function to process cashout request
CREATE OR REPLACE FUNCTION process_cashout_request(
    request_id UUID,
    new_status TEXT,
    notes TEXT DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Update the cashout request
    UPDATE public.cashout_requests
    SET 
        status = new_status,
        processed_at = NOW(),
        processed_by = auth.uid(),
        admin_notes = notes,
        transaction_id = CASE WHEN new_status = 'completed' THEN transaction_id ELSE NULL END
    WHERE id = request_id;

    -- If approved/completed, reset user's earnings
    IF new_status IN ('approved', 'completed') THEN
        UPDATE public.user_profiles
        SET 
            total_earnings = 0,
            pending_earnings = 0
        WHERE id = (SELECT user_id FROM public.cashout_requests WHERE id = request_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin dashboard
CREATE OR REPLACE VIEW public.cashout_requests_admin AS
SELECT 
    cr.*,
    up.email as user_email,
    up.username,
    up.total_earnings as current_balance
FROM public.cashout_requests cr
JOIN public.user_profiles up ON cr.user_id = up.id
ORDER BY cr.requested_at DESC;

-- Grant access to the view
GRANT SELECT ON public.cashout_requests_admin TO authenticated;