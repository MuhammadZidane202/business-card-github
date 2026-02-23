// Konfigurasi Supabase
const SUPABASE_CONFIG = {
    url: 'https://qwlgdlgpcoajbdxyscsr.supabase.co',
    anonKey: 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1'
};

// Inisialisasi Supabase client
const supabase = supabaseCreateClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
