-- Update RLS policies to use tenant admin role instead of user_metadata.role = 'admin'
-- This migration updates policies to check for tenant admin role or super_admin

-- ============================================================================
-- AVAILABLE_MODELS TABLE
-- ============================================================================

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all models" ON available_models;
DROP POLICY IF EXISTS "Admins can insert models" ON available_models;
DROP POLICY IF EXISTS "Admins can update models" ON available_models;
DROP POLICY IF EXISTS "Admins can delete models" ON available_models;

-- Policy: Super admins can read all models
CREATE POLICY "Super admins can read all models"
ON available_models
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can read all models
CREATE POLICY "Tenant admins can read all models"
ON available_models
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.role = 'admin'
    AND user_tenants.is_active = true
  )
);

-- Policy: Super admins can insert models
CREATE POLICY "Super admins can insert models"
ON available_models
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can insert models
CREATE POLICY "Tenant admins can insert models"
ON available_models
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.role = 'admin'
    AND user_tenants.is_active = true
  )
);

-- Policy: Super admins can update models
CREATE POLICY "Super admins can update models"
ON available_models
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can update models
CREATE POLICY "Tenant admins can update models"
ON available_models
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.role = 'admin'
    AND user_tenants.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.role = 'admin'
    AND user_tenants.is_active = true
  )
);

-- Policy: Super admins can delete models
CREATE POLICY "Super admins can delete models"
ON available_models
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can delete models
CREATE POLICY "Tenant admins can delete models"
ON available_models
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.role = 'admin'
    AND user_tenants.is_active = true
  )
);

-- ============================================================================
-- DOCUMENTS TABLE (if old policies still exist)
-- ============================================================================

-- Note: Documents table policies were already updated in add_tenant_id_to_documents.sql
-- But we need to ensure they also allow tenant admins, not just check tenant_id

-- The existing policies in add_tenant_id_to_documents.sql already handle tenant filtering
-- They check user_tenants table, so they should work. But let's verify and update if needed.

