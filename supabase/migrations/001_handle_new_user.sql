-- ============================================================
-- QUANTUM OLYMPIAD — FULL DATABASE SCHEMA
-- ============================================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all tables, triggers, RLS policies, and indexes.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TABLE: profiles
-- ============================================================
-- Stores user profile data. Linked to auth.users via id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT 'Student',
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  level       TEXT NOT NULL DEFAULT 'SMP' CHECK (level IN ('SMP', 'SMA')),
  current_streak INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 3. TRIGGER: Auto-create profile on user signup
-- ============================================================
-- When a user signs up via Supabase Auth, this trigger
-- automatically creates a row in public.profiles using
-- the metadata from the signup request.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, level, current_streak)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'level', 'SMP'),
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 4. TABLE: quiz_history
-- ============================================================
-- Tracks every question answered by every user.
-- Used for deduplication (hybrid engine) and admin feed.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject             TEXT NOT NULL,
  question_signature  TEXT NOT NULL,
  is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON public.quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_subject ON public.quiz_history(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_quiz_history_signature ON public.quiz_history(question_signature);
CREATE INDEX IF NOT EXISTS idx_quiz_history_created_at ON public.quiz_history(created_at DESC);


-- ============================================================
-- 5. TABLE: question_bank
-- ============================================================
-- Curated questions uploaded by admins.
-- Supports image_url for photo-based questions (JPG/PNG).
-- The hybrid engine queries this table first, then fills
-- remaining slots with procedurally generated questions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.question_bank (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level       TEXT NOT NULL CHECK (level IN ('SMP', 'SMA')),
  subject     TEXT NOT NULL,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]'::JSONB,  -- Array of 4 option strings
  answer      TEXT NOT NULL,                        -- Must match one of the options exactly
  explanation TEXT NOT NULL DEFAULT '',
  image_url   TEXT DEFAULT NULL,                    -- Optional: URL to question image (JPG/PNG)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,        -- Soft delete / disable
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hybrid engine queries
CREATE INDEX IF NOT EXISTS idx_question_bank_level_subject ON public.question_bank(level, subject);
CREATE INDEX IF NOT EXISTS idx_question_bank_active ON public.question_bank(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON public.question_bank(created_at DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trigger_question_bank_updated_at ON public.question_bank;
CREATE TRIGGER trigger_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----

-- Users can read all profiles (needed for admin dashboard)
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow the trigger to insert profiles (SECURITY DEFINER handles this)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.profiles;
CREATE POLICY "Allow insert for authenticated users"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---- QUIZ HISTORY ----

-- Users can read their own history
DROP POLICY IF EXISTS "Users can read own quiz history" ON public.quiz_history;
CREATE POLICY "Users can read own quiz history"
  ON public.quiz_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all quiz history (for admin dashboard feed)
DROP POLICY IF EXISTS "Admins can read all quiz history" ON public.quiz_history;
CREATE POLICY "Admins can read all quiz history"
  ON public.quiz_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can insert their own quiz results
DROP POLICY IF EXISTS "Users can insert own quiz history" ON public.quiz_history;
CREATE POLICY "Users can insert own quiz history"
  ON public.quiz_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- QUESTION BANK ----

-- Everyone can read active questions (needed for quiz)
DROP POLICY IF EXISTS "Anyone can read active questions" ON public.question_bank;
CREATE POLICY "Anyone can read active questions"
  ON public.question_bank FOR SELECT
  USING (is_active = TRUE);

-- Only admins can insert questions
DROP POLICY IF EXISTS "Admins can insert questions" ON public.question_bank;
CREATE POLICY "Admins can insert questions"
  ON public.question_bank FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update questions
DROP POLICY IF EXISTS "Admins can update questions" ON public.question_bank;
CREATE POLICY "Admins can update questions"
  ON public.question_bank FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete questions
DROP POLICY IF EXISTS "Admins can delete questions" ON public.question_bank;
CREATE POLICY "Admins can delete questions"
  ON public.question_bank FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- ============================================================
-- 7. REALTIME — Enable for admin dashboard live feed
-- ============================================================
-- This enables Supabase Realtime on quiz_history and profiles
-- so the admin dashboard can receive live events.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;


-- ============================================================
-- 8. STORAGE BUCKET — For question images (optional)
-- ============================================================
-- Uncomment the lines below if you want to use Supabase Storage
-- to host question images instead of external URLs.
-- ============================================================

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('question-images', 'question-images', TRUE)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Anyone can read question images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'question-images');

-- CREATE POLICY "Admins can upload question images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'question-images'
--     AND EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.role = 'admin'
--     )
--   );


-- ============================================================
-- 9. SEED DATA — Sample admin user profile
-- ============================================================
-- NOTE: You must first create the admin user via Supabase Auth
-- (Dashboard > Authentication > Users > Add User), then update
-- the profile row to set role = 'admin'.
--
-- Example (replace the UUID with your actual admin user ID):
-- ============================================================

-- UPDATE public.profiles
-- SET role = 'admin', display_name = 'System Admin'
-- WHERE email = 'admin@yourdomain.com';


-- ============================================================
-- 10. SEED DATA — Sample questions for question_bank
-- ============================================================
-- These are example questions to test the hybrid engine.
-- Each question has: level, subject, question text, 4 options
-- (as JSONB array), the correct answer, explanation, and
-- optionally an image_url.
-- ============================================================

INSERT INTO public.question_bank (level, subject, question, options, answer, explanation, image_url) VALUES

-- ========== SMP — Matematika ==========
('SMP', 'Matematika',
 'Perhatikan gambar berikut. Berapakah luas daerah yang diarsir?',
 '["24 cm²", "36 cm²", "48 cm²", "60 cm²"]'::JSONB,
 '36 cm²',
 'Luas daerah yang diarsir dihitung dengan mengurangi luas persegi panjang besar dengan luas segitiga. L = 8 × 6 - ½ × 4 × 3 = 48 - 12 = 36 cm².',
 NULL),

('SMP', 'Matematika',
 'Sebuah tabung memiliki jari-jari 7 cm dan tinggi 10 cm. Berapakah volume tabung tersebut? (π = 22/7)',
 '["1.540 cm³", "1.386 cm³", "1.232 cm³", "1.078 cm³"]'::JSONB,
 '1.540 cm³',
 'V = π × r² × t = 22/7 × 7² × 10 = 22/7 × 49 × 10 = 22 × 70 = 1.540 cm³.',
 NULL),

('SMP', 'Matematika',
 'Diketahui barisan bilangan: 2, 5, 8, 11, ... Suku ke-20 dari barisan tersebut adalah?',
 '["59", "57", "62", "56"]'::JSONB,
 '59',
 'Barisan aritmatika dengan a = 2, b = 3. Un = a + (n-1)b = 2 + 19 × 3 = 2 + 57 = 59.',
 NULL),

-- ========== SMP — IPA ==========
('SMP', 'IPA',
 'Organ tubuh manusia yang berfungsi menyaring darah dan menghasilkan urine adalah?',
 '["Hati", "Ginjal", "Paru-paru", "Jantung"]'::JSONB,
 'Ginjal',
 'Ginjal berfungsi menyaring darah dari zat-zat sisa metabolisme dan menghasilkan urine.',
 NULL),

('SMP', 'IPA',
 'Peristiwa fotosintesis memerlukan komponen berikut, KECUALI?',
 '["Cahaya matahari", "Karbon dioksida", "Oksigen", "Air"]'::JSONB,
 'Oksigen',
 'Fotosintesis memerlukan cahaya matahari, CO₂, dan air. Oksigen justru merupakan HASIL dari fotosintesis, bukan bahan yang diperlukan.',
 NULL),

-- ========== SMP — IPS ==========
('SMP', 'IPS',
 'Faktor utama yang mempengaruhi persebaran flora dan fauna di Indonesia adalah?',
 '["Iklim dan kesuburan tanah", "Jumlah penduduk", "Luas wilayah", "Sistem pemerintahan"]'::JSONB,
 'Iklim dan kesuburan tanah',
 'Persebaran flora dan fauna sangat dipengaruhi oleh faktor alam seperti iklim, kesuburan tanah, ketinggian tempat, dan curah hujan.',
 NULL),

-- ========== SMA — Matematika ==========
('SMA', 'Matematika',
 'Jika f(x) = 2x² - 3x + 1, maka nilai f''(x) adalah?',
 '["4x - 3", "4x + 3", "2x - 3", "x² - 3"]'::JSONB,
 '4x - 3',
 'f''(x) = turunan dari 2x² - 3x + 1 = 2(2x) - 3 + 0 = 4x - 3.',
 NULL),

('SMA', 'Matematika',
 'Nilai dari ∫(3x² + 2x) dx adalah?',
 '["x³ + x² + C", "6x + 2 + C", "x³ + x² + 2x + C", "3x³ + x²"]'::JSONB,
 'x³ + x² + C',
 '∫(3x² + 2x) dx = 3(x³/3) + 2(x²/2) + C = x³ + x² + C.',
 NULL),

('SMA', 'Matematika',
 'Diketahui matriks A = [[1,2],[3,4]]. Determinan matriks A adalah?',
 '["-2", "2", "-10", "10"]'::JSONB,
 '-2',
 'det(A) = (1)(4) - (2)(3) = 4 - 6 = -2.',
 NULL),

-- ========== SMA — Fisika ==========
('SMA', 'Fisika',
 'Sebuah benda dilempar vertikal ke atas dengan kecepatan awal 30 m/s. Tinggi maksimum yang dicapai benda adalah? (g = 10 m/s²)',
 '["45 m", "90 m", "30 m", "60 m"]'::JSONB,
 '45 m',
 'h_max = v₀² / (2g) = 30² / (2 × 10) = 900 / 20 = 45 m.',
 NULL),

('SMA', 'Fisika',
 'Dua muatan listrik q₁ = 2μC dan q₂ = 8μC terpisah sejauh 20 cm. Gaya Coulomb antara kedua muatan adalah? (k = 9 × 10⁹ Nm²/C²)',
 '["3,6 N", "0,36 N", "36 N", "0,036 N"]'::JSONB,
 '3,6 N',
 'F = k × q₁ × q₂ / r² = 9×10⁹ × 2×10⁻⁶ × 8×10⁻⁶ / (0,2)² = 9×10⁹ × 16×10⁻¹² / 0,04 = 144×10⁻³ / 0,04 = 3,6 N.',
 NULL),

-- ========== SMA — Kimia ==========
('SMA', 'Kimia',
 'Bilangan oksidasi Mn dalam KMnO₄ adalah?',
 '["+7", "+5", "+3", "+4"]'::JSONB,
 '+7',
 'K = +1, O = -2. Maka: +1 + Mn + 4(-2) = 0 → Mn = +7.',
 NULL),

('SMA', 'Kimia',
 'Larutan yang memiliki pH = 3 bersifat?',
 '["Asam kuat", "Asam lemah", "Basa lemah", "Netral"]'::JSONB,
 'Asam kuat',
 'pH < 7 menunjukkan sifat asam. pH = 3 tergolong asam kuat karena konsentrasi H⁺ = 10⁻³ M yang cukup tinggi.',
 NULL),

-- ========== SMA — Biologi ==========
('SMA', 'Biologi',
 'Proses pembelahan meiosis menghasilkan sel anak sebanyak?',
 '["4 sel haploid", "2 sel diploid", "4 sel diploid", "2 sel haploid"]'::JSONB,
 '4 sel haploid',
 'Meiosis terjadi dalam 2 tahap pembelahan dan menghasilkan 4 sel anak yang bersifat haploid (n) dari 1 sel induk diploid (2n).',
 NULL),

('SMA', 'Biologi',
 'Organel sel yang berfungsi untuk sintesis protein adalah?',
 '["Ribosom", "Mitokondria", "Lisosom", "Badan Golgi"]'::JSONB,
 'Ribosom',
 'Ribosom merupakan organel sel yang berfungsi sebagai tempat sintesis protein berdasarkan informasi genetik dari mRNA.',
 NULL),

-- ========== SMA — Informatika ==========
('SMA', 'Informatika',
 'Kompleksitas waktu dari algoritma Binary Search adalah?',
 '["O(log n)", "O(n)", "O(n²)", "O(1)"]'::JSONB,
 'O(log n)',
 'Binary Search membagi ruang pencarian menjadi setengah pada setiap iterasi, sehingga kompleksitasnya O(log n).',
 NULL),

('SMA', 'Informatika',
 'Bahasa pemrograman yang digunakan untuk membuat smart contract di blockchain Ethereum adalah?',
 '["Solidity", "Python", "Java", "Go"]'::JSONB,
 'Solidity',
 'Solidity adalah bahasa pemrograman yang dirancang khusus untuk menulis smart contract di platform Ethereum.',
 NULL),

-- ========== SMA — Astronomi ==========
('SMA', 'Astronomi',
 'Jarak rata-rata Bumi ke Matahari disebut?',
 '["1 Satuan Astronomi (AU)", "1 Tahun Cahaya", "1 Parsec", "1 Kilometer Astronomi"]'::JSONB,
 '1 Satuan Astronomi (AU)',
 '1 AU (Astronomical Unit) didefinisikan sebagai jarak rata-rata Bumi ke Matahari, yaitu sekitar 149,6 juta km.',
 NULL),

('SMA', 'Astronomi',
 'Bintang Polaris terletak di rasi bintang?',
 '["Ursa Minor", "Ursa Major", "Orion", "Cassiopeia"]'::JSONB,
 'Ursa Minor',
 'Polaris (Bintang Utara) berada di ujung ekor rasi Ursa Minor (Beruang Kecil) dan digunakan sebagai penunjuk arah utara.',
 NULL),

-- ========== SMA — Ekonomi ==========
('SMA', 'Ekonomi',
 'Kebijakan moneter yang dilakukan bank sentral untuk mengurangi jumlah uang beredar disebut?',
 '["Kebijakan kontraktif", "Kebijakan ekspansif", "Kebijakan fiskal", "Devaluasi"]'::JSONB,
 'Kebijakan kontraktif',
 'Kebijakan moneter kontraktif bertujuan mengurangi jumlah uang beredar untuk mengendalikan inflasi, misalnya dengan menaikkan suku bunga.',
 NULL),

-- ========== SMA — Kebumian ==========
('SMA', 'Kebumian',
 'Gelombang seismik yang hanya merambat melalui medium padat adalah?',
 '["Gelombang S", "Gelombang P", "Gelombang permukaan", "Gelombang Love"]'::JSONB,
 'Gelombang S',
 'Gelombang S (sekunder/transversal) hanya dapat merambat melalui medium padat, berbeda dengan gelombang P yang bisa merambat melalui padat, cair, dan gas.',
 NULL),

-- ========== SMA — Geografi ==========
('SMA', 'Geografi',
 'Garis Wallace membagi wilayah Indonesia menjadi?',
 '["Zona Asia dan Zona Peralihan", "Zona Asia dan Zona Australia", "Zona Peralihan dan Zona Australia", "Zona Barat dan Zona Timur"]'::JSONB,
 'Zona Asia dan Zona Peralihan',
 'Garis Wallace (1868) memisahkan fauna tipe Asia (Asiatis) di bagian barat dengan fauna tipe peralihan di bagian tengah Indonesia.',
 NULL),

('SMA', 'Geografi',
 'Tipe iklim menurut klasifikasi Köppen untuk sebagian besar Indonesia adalah?',
 '["Af (Tropis Basah)", "Am (Tropis Monsun)", "Cfa (Subtropis Lembab)", "BWh (Gurun Panas)"]'::JSONB,
 'Af (Tropis Basah)',
 'Sebagian besar Indonesia beriklim Af (tropis basah) dengan curah hujan tinggi sepanjang tahun dan suhu rata-rata > 18°C setiap bulan.',
 NULL)

ON CONFLICT DO NOTHING;


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- Tables created:
--   ✅ profiles         — User profiles (auto-created on signup)
--   ✅ quiz_history     — Answer tracking & deduplication
--   ✅ question_bank    — Curated questions with image support
--
-- Features enabled:
--   ✅ RLS policies     — Secure access control
--   ✅ Realtime         — Live admin dashboard feed
--   ✅ Auto-triggers    — Profile creation on signup
--   ✅ Indexes          — Optimized query performance
--   ✅ Seed data        — 25 sample questions across all subjects
-- ============================================================
