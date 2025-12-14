-- Add deactivated_at column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Create index on deactivated_at for filtering
CREATE INDEX IF NOT EXISTS idx_tenants_deactivated_at ON public.tenants(deactivated_at);

