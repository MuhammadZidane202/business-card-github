// js/supabase.js

// Inisialisasi Supabase
const SUPABASE_URL = 'https://qwlgdlgpcoajbdxyscsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1';

// Buat supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export ke global
window.supabase = supabase;
