-- Create user_tenants table for mapping users to tenants
CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, tenant_id)
);

-- Create index on user_id for user lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants(user_id);

-- Create index on tenant_id for tenant lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_user_tenants_is_active ON public.user_tenants(is_active);

-- Create composite index for active user-tenant lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_tenant_active ON public.user_tenants(user_id, tenant_id, is_active);

-- Enable RLS on user_tenants table
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant associations
CREATE POLICY "Users can view own tenant associations"
ON public.user_tenants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Super admins can view all user-tenant associations
CREATE POLICY "Super admins can view all user-tenant associations"
ON public.user_tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can view users in their tenant
CREATE POLICY "Tenant admins can view users in their tenant"
ON public.user_tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.role = 'admin'
    AND ut.is_active = true
  )
);

-- Policy: Super admins can insert user-tenant associations
CREATE POLICY "Super admins can insert user-tenant associations"
ON public.user_tenants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Tenant admins can add users to their tenant
CREATE POLICY "Tenant admins can add users to their tenant"
ON public.user_tenants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.role = 'admin'
    AND ut.is_active = true
  )
);

-- Policy: Super admins can update user-tenant associations
CREATE POLICY "Super admins can update user-tenant associations"
ON public.user_tenants
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

-- Policy: Tenant admins can update users in their tenant
CREATE POLICY "Tenant admins can update users in their tenant"
ON public.user_tenants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.role = 'admin'
    AND ut.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.role = 'admin'
    AND ut.is_active = true
  )
);

