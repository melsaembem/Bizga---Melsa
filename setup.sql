-- SQL Schema for Katalog Duren Sawit (Bizga)
-- Run this in your Supabase SQL Editor

-- Storage setup for Images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Read Images" ON storage.objects;
CREATE POLICY "Public Read Images" ON storage.objects FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Anyone Upload Images" ON storage.objects;
CREATE POLICY "Anyone Upload Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated Update Images" ON storage.objects;
CREATE POLICY "Authenticated Update Images" ON storage.objects FOR UPDATE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete Images" ON storage.objects;
CREATE POLICY "Authenticated Delete Images" ON storage.objects FOR DELETE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    address TEXT,
    rt TEXT,
    rw TEXT,
    whatsapp TEXT NOT NULL,
    price TEXT,
    photo_url TEXT,
    jam_buka TEXT,
    jam_tutup TEXT,
    alamat TEXT,
    full_address TEXT,
    link_maps TEXT,
    owner_id UUID REFERENCES auth.users(id),
    rating NUMERIC(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Promos Table
CREATE TABLE IF NOT EXISTS public.promos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    photo_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles Table (Optional but recommended)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone_number TEXT,
    photo_url TEXT,
    user_type TEXT CHECK (user_type IN ('buyer', 'seller')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Settings Policies
DROP POLICY IF EXISTS "Public Read Settings" ON public.settings;
CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin All Settings" ON public.settings;
CREATE POLICY "Admin All Settings" ON public.settings FOR ALL USING (auth.role() = 'authenticated');
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS patokan TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registrant_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registrant_phone TEXT;

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Businesses Policies
DROP POLICY IF EXISTS "Public Read Access" ON public.businesses;
CREATE POLICY "Public Read Access" ON public.businesses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can update their own business" ON public.businesses;
CREATE POLICY "Owners can update their own business" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id OR auth.role() = 'authenticated' OR owner_id IS NULL);
DROP POLICY IF EXISTS "Owners can delete their own business" ON public.businesses;
CREATE POLICY "Owners can delete their own business" ON public.businesses FOR DELETE USING (auth.uid() = owner_id OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can create a business" ON public.businesses;
CREATE POLICY "Anyone can create a business" ON public.businesses FOR INSERT WITH CHECK (true);

-- Reviews Policies
DROP POLICY IF EXISTS "Public Read Reviews" ON public.reviews;
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert a review" ON public.reviews;
CREATE POLICY "Anyone can insert a review" ON public.reviews FOR INSERT WITH CHECK (true); -- Allowing guest reviews as per UI or Authenticated only?
-- If restricted to authenticated: CREATE POLICY "Authenticated users can review" ON public.reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Promos Policies
DROP POLICY IF EXISTS "Public Read Promos" ON public.promos;
CREATE POLICY "Public Read Promos" ON public.promos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can manage promos" ON public.promos;
CREATE POLICY "Owners can manage promos" ON public.promos FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = public.promos.business_id AND owner_id = auth.uid()
    )
);

-- User Profiles Policies
DROP POLICY IF EXISTS "Public Read Profiles" ON public.user_profiles;
CREATE POLICY "Public Read Profiles" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_promos_business_id ON public.promos(business_id);
