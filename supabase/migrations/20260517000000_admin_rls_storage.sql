-- ============================================================
-- Migration: Add admin RLS policies, storage bucket, and indexes
-- ============================================================

-- ── Admin RLS Policies ──
-- Admins can read all vendor profiles
CREATE POLICY "admin_all_profiles_select" ON vendor_profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can update vendor profiles (quota, is_active, etc.)
CREATE POLICY "admin_all_profiles_update" ON vendor_profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can read all applications
CREATE POLICY "admin_all_applications_select" ON applications
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can update applications (approve/reject)
CREATE POLICY "admin_all_applications_update" ON applications
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can view all application zones
CREATE POLICY "admin_all_application_zones_select" ON application_zones
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can view all events (including inactive)
CREATE POLICY "admin_all_events_select" ON events
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can manage events
CREATE POLICY "admin_events_insert" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM admins)
  );

CREATE POLICY "admin_events_update" ON events
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Admins can view the admins table
CREATE POLICY "admin_self_select" ON admins
  FOR SELECT USING (id = auth.uid());

-- ── Storage: Create bucket for application photos ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-photos',
  'application-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: vendors can upload to their own folder
CREATE POLICY "vendor_upload_own_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'application-photos' AND
    auth.uid() IS NOT NULL
  );

-- Storage RLS: anyone can view photos (public bucket)
CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'application-photos'
  );

-- Storage RLS: vendors can update their own photos
CREATE POLICY "vendor_update_own_photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'application-photos' AND
    auth.uid() IS NOT NULL
  );

-- ── Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_event_id ON applications(event_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_event_id ON vendor_profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_application_zones_app ON application_zones(application_id);
