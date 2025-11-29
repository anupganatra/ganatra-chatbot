-- Enable Row Level Security (RLS) for available_models and documents tables
-- This migration enables RLS and creates appropriate policies

-- ============================================================================
-- AVAILABLE_MODELS TABLE
-- ============================================================================

-- Enable RLS on available_models table
ALTER TABLE available_models ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read active models
-- This allows regular users to see available models in the chat interface
CREATE POLICY "Users can read active models"
ON available_models
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Admins can read all models (including inactive)
-- This allows admins to see all models in the admin panel
CREATE POLICY "Admins can read all models"
ON available_models
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can insert models
CREATE POLICY "Admins can insert models"
ON available_models
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can update models
CREATE POLICY "Admins can update models"
ON available_models
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can delete models
CREATE POLICY "Admins can delete models"
ON available_models
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read documents
-- Documents are admin-only functionality
CREATE POLICY "Admins can read documents"
ON documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can insert documents
CREATE POLICY "Admins can insert documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can update documents
CREATE POLICY "Admins can update documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Only admins can delete documents
CREATE POLICY "Admins can delete documents"
ON documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

