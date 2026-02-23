// Konfigurasi Supabase
const SUPABASE_CONFIG = {
    url: 'https://qwlgdlgpcoajbdxyscsr.supabase.co',
    anonKey: 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1'
};

// Inisialisasi Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
