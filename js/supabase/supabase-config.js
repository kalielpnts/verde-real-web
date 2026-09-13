// ============================================================
// supabase-config.js - Configuração do Supabase
// ============================================================
// Preencha com as credenciais do projeto NOVO criado na Etapa 1
// (Project Settings → API). Nunca coloque a service_role key aqui
// — só a anon key, que é pública por design.
// ============================================================

const SUPABASE_CONFIG = {
    url: 'https://pzqxvxhzokjmracbwinp.supabase.co',        // ex: https://xxxxxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cXh2eGh6b2tqbXJhY2J3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTg2MzUsImV4cCI6MjEwNDYzNDYzNX0.UgnmL5YNJ1l0mImbbgIlajt5CWxxBwcVXrXgl1A19tU'
};

function verificarCredenciais() {
    const url = SUPABASE_CONFIG.url;
    const anonKey = SUPABASE_CONFIG.anonKey;

    if (!url || url.includes('SUA_URL_AQUI')) {
        console.warn('⚠️ ATENÇÃO: URL do Supabase não configurada!');
        return false;
    }
    if (!anonKey || anonKey.includes('SUA_ANON_KEY_AQUI')) {
        console.warn('⚠️ ATENÇÃO: Anon Key do Supabase não configurada!');
        return false;
    }
    console.log('✅ Credenciais do Supabase configuradas!');
    return true;
}

let supabaseClient = null;

function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('❌ SDK do Supabase não carregado! Inclua <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
            return null;
        }
        if (!verificarCredenciais()) return null;

        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('🔄 Supabase inicializado com sucesso!');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        return null;
    }
}

const supabaseInstance = initSupabase();
window.supabase = supabaseInstance || window.supabase;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

console.log('📦 supabase-config.js carregado!');
console.log('🌱 Projeto: Verde Real');