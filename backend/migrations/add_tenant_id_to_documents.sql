-- Add tenant_id column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index on tenant_id for filtering
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);

-- Create composite index for tenant and status filtering
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON public.documents(tenant_id, status);

-- Drop existing RLS policies on documents table
DROP POLICY IF EXISTS "Admins can read documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

-- Policy: Super admins can view all documents
CREATE POLICY "Super admins can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Users can view documents from their tenant
CREATE POLICY "Users can view documents from their tenant"
ON public.documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.tenant_id = documents.tenant_id
    AND user_tenants.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = documents.tenant_id
    AND tenants.is_active = true
  )
);

-- Policy: Super admins can insert documents
CREATE POLICY "Super admins can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Users can insert documents to their tenant
CREATE POLICY "Users can insert documents to their tenant"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.tenant_id = documents.tenant_id
    AND user_tenants.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = documents.tenant_id
    AND tenants.is_active = true
  )
);

-- Policy: Super admins can update all documents
CREATE POLICY "Super admins can update all documents"
ON public.documents
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

-- Policy: Users can update documents from their tenant
CREATE POLICY "Users can update documents from their tenant"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.tenant_id = documents.tenant_id
    AND user_tenants.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = documents.tenant_id
    AND tenants.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.tenant_id = documents.tenant_id
    AND user_tenants.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = documents.tenant_id
    AND tenants.is_active = true
  )
);

-- Policy: Super admins can delete all documents
CREATE POLICY "Super admins can delete all documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'super_admin'
  )
);

-- Policy: Users can delete documents from their tenant
CREATE POLICY "Users can delete documents from their tenant"
ON public.documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.tenant_id = documents.tenant_id
    AND user_tenants.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = documents.tenant_id
    AND tenants.is_active = true
  )
);

