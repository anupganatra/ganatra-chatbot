-- Create available_models table for storing available LLM models
CREATE TABLE IF NOT EXISTS available_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openrouter')),
    name TEXT NOT NULL,
    description TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on model_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_available_models_model_id ON available_models(model_id);

-- Create index on is_active for filtering active models
CREATE INDEX IF NOT EXISTS idx_available_models_is_active ON available_models(is_active);

-- Insert default Gemini model
INSERT INTO available_models (model_id, provider, name, description, is_free, is_active)
VALUES (
    'gemini-2.5-flash',
    'gemini',
    'Gemini 2.5 Flash',
    'Fast and efficient model for quick responses',
    true,
    true
)
ON CONFLICT (model_id) DO NOTHING;

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