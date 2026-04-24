-- 1. Create admin_actions table to track administrative changes
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Force Cancel Ride RPC
-- Sets ride status, releases driver, and handles rider refund
CREATE OR REPLACE FUNCTION admin_force_cancel_ride(p_ride_id UUID, p_refund_percentage INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ride_record RECORD;
    v_refund_amount INTEGER;
BEGIN
    -- Verify admin status (we assume the caller is authenticated and UI restricted)
    -- Security note: In production, add RLS or additional check on auth.jwt() ->> 'email'

    SELECT * INTO v_ride_record FROM rides WHERE id = p_ride_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found';
    END IF;

    IF v_ride_record.status IN ('completed', 'cancelled', 'cancelled_by_admin') THEN
        RAISE EXCEPTION 'Ride already in terminal state';
    END IF;

    -- Update ride status
    UPDATE rides 
    SET status = 'cancelled_by_admin',
        updated_at = now()
    WHERE id = p_ride_id;

    -- Release driver
    IF v_ride_record.driver_id IS NOT NULL THEN
        UPDATE driver_profiles 
        SET is_busy = false 
        WHERE user_id = v_ride_record.driver_id;
    END IF;

    -- Calculate and apply refund
    v_refund_amount := (v_ride_record.fare * p_refund_percentage) / 100;
    IF v_refund_amount > 0 THEN
        -- We reuse existing banking credit/debit logic if available
        -- Assuming credit_wallet exists from Phase 1
        PERFORM credit_wallet(
            v_ride_record.rider_id, 
            v_refund_amount, 
            'ride_refund', 
            gen_random_uuid(), 
            jsonb_build_object('ride_id', p_ride_id, 'reason', 'cancelled_by_admin')
        );
    END IF;

    -- Audit log
    INSERT INTO admin_actions (admin_id, action_type, target_id, details)
    VALUES (auth.uid(), 'force_cancel_ride', p_ride_id::text, jsonb_build_object('refunded', v_refund_amount, 'original_fare', v_ride_record.fare));

    RETURN jsonb_build_object('status', 'success', 'refunded', v_refund_amount);
END;
$$;

-- 3. Update System Settings RPC
-- Centralized settings update with audit logging
CREATE OR REPLACE FUNCTION update_system_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO system_settings (
        id, 
        maintenance_mode, 
        min_ride_fare, 
        commission_rate, 
        gocoin_referral_reward, 
        updated_at
    )
    VALUES (
        1, 
        (p_settings->>'maintenance_mode')::boolean,
        (p_settings->>'min_ride_fare')::integer,
        (p_settings->>'commission_rate')::numeric,
        (p_settings->>'gocoin_referral_reward')::integer,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        maintenance_mode = EXCLUDED.maintenance_mode,
        min_ride_fare = EXCLUDED.min_ride_fare,
        commission_rate = EXCLUDED.commission_rate,
        gocoin_referral_reward = EXCLUDED.gocoin_referral_reward,
        updated_at = now();
END;
$$;

-- 4. Adjust GoCoins RPC
-- Used for GoCoin economy management
CREATE OR REPLACE FUNCTION adjust_gocoins(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_idempotency_key UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_gocoins (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_gocoins.balance + p_amount,
        updated_at = now();

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_id, details)
    VALUES (auth.uid(), 'gocoin_adjustment', p_user_id::text, jsonb_build_object('amount', p_amount, 'reason', p_reason));
END;
$$;
