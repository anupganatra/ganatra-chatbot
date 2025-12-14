-- Migration to sync existing roles from user_tenants.role to user_metadata.role
-- This ensures all users have their role stored in user_metadata for instant access

-- Function to sync roles from user_tenants to user_metadata
-- This function will be called for each user that has an active tenant relationship
DO $$
DECLARE
    user_record RECORD;
    user_role TEXT;
    current_metadata JSONB;
BEGIN
    -- Loop through all active user-tenant relationships
    FOR user_record IN 
        SELECT DISTINCT ut.user_id, ut.role
        FROM public.user_tenants ut
        WHERE ut.is_active = true
        ORDER BY ut.user_id
    LOOP
        -- Get the role from user_tenants (prioritize 'admin' if user has multiple tenants)
        -- If user has admin role in any tenant, set role to 'admin', otherwise 'user'
        SELECT 
            CASE 
                WHEN COUNT(*) FILTER (WHERE ut.role = 'admin') > 0 THEN 'admin'
                ELSE 'user'
            END
        INTO user_role
        FROM public.user_tenants ut
        WHERE ut.user_id = user_record.user_id
          AND ut.is_active = true;
        
        -- Get current user metadata
        SELECT raw_user_meta_data
        INTO current_metadata
        FROM auth.users
        WHERE id = user_record.user_id;
        
        -- If user exists and metadata doesn't already have role set (or needs update)
        IF current_metadata IS NOT NULL THEN
            -- Update user_metadata with role, preserving other metadata fields
            UPDATE auth.users
            SET raw_user_meta_data = COALESCE(current_metadata, '{}'::jsonb) || jsonb_build_object('role', user_role)
            WHERE id = user_record.user_id;
            
            RAISE NOTICE 'Updated user % with role %', user_record.user_id, user_role;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Role sync completed';
END $$;

-- Note: Super admins should already have role='super_admin' in user_metadata
-- This migration only syncs regular users (admin/user) from user_tenants

