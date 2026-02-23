// js/config.js

// Konfigurasi Supabase
const SUPABASE_URL = 'https://qwlgdlgpcoajbdxyscsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1';

// Inisialisasi Supabase client dengan benar
const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export supabase client
window.supabase = supabase;
