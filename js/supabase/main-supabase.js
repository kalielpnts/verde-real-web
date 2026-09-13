// ============================================================
// main-supabase.js - Funções Globais com Supabase
// ============================================================
// Este arquivo contém funções globais integradas ao Supabase:
// - Preloader
// - Toast (mensagens)
// - Verificação de autenticação no header
// - Atualização automática do header
// - Inicialização do site
// ============================================================

// ============================================================
// 1. PRELOADER
// ============================================================

/**
 * Oculta o preloader da página
 * Deve ser chamado no evento onload do body
 */
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('preloader--escondido');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
}

/**
 * Mostra o preloader novamente (útil para navegações)
 */
function showPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.display = 'flex';
        preloader.classList.remove('preloader--escondido');
    }
}

// ============================================================
// 2. TOAST (MENSAGENS FLUTUANTES)
// ============================================================

/**
 * Exibe uma mensagem toast na tela
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duração em milissegundos (padrão: 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
    // Remover toast anterior
    const oldToast = document.querySelector('.toast-message');
    if (oldToast) oldToast.remove();

    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    
    // Ícones por tipo
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const colors = {
        success: '#2e7d32',
        error: '#c62828',
        warning: '#e65100',
        info: '#1565c0'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}" style="color: ${colors[type] || colors.info};"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" aria-label="Fechar mensagem">&times;</button>
    `;

    document.body.appendChild(toast);

    // Auto-remover após duração
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Atalhos para tipos de toast
 */
function toastSuccess(message, duration) {
    showToast(message, 'success', duration);
}

function toastError(message, duration) {
    showToast(message, 'error', duration);
}

function toastWarning(message, duration) {
    showToast(message, 'warning', duration);
}

function toastInfo(message, duration) {
    showToast(message, 'info', duration);
}

// ============================================================
// 3. HEADER - AUTENTICAÇÃO
// ============================================================

/**
 * Atualiza o header com base no status de autenticação
 * @param {Object} auth - Instância do AuthService
 */
function atualizarHeader(auth) {
    try {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Verificar se o usuário está logado
        if (auth && auth.isLogado()) {
            const user = auth.getUsuarioLogado();
            
            // Remover botão de login existente
            const loginBtn = navLinks.querySelector('.btn-login:not(#logoutBtn)');
            if (loginBtn) loginBtn.remove();

            // Remover logout existente
            const logoutBtn = navLinks.querySelector('#logoutBtn');
            if (logoutBtn) logoutBtn.remove();

            // Criar botão de perfil
            const perfilBtn = document.createElement('a');
            perfilBtn.href = user.tipo === 'empresa' || user.tipo === 'empresa_selo' 
                ? 'feed-empresa.html' 
                : 'feed-cliente.html';
            perfilBtn.className = 'btn-login';
            perfilBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${user.nome}`;
            navLinks.appendChild(perfilBtn);

            // Criar botão de logout
            const logout = document.createElement('a');
            logout.id = 'logoutBtn';
            logout.href = '#';
            logout.className = 'btn-login';
            logout.style.background = 'var(--verde-detalhe2)';
            logout.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> Sair';
            logout.addEventListener('click', async function(e) {
                e.preventDefault();
                if (auth && auth.logout) {
                    await auth.logout();
                }
                window.location.href = 'login.html';
            });
            navLinks.appendChild(logout);

            // Atualizar botão "Entrar" em outras partes (ex: hero)
            document.querySelectorAll('.btn-login:not(.nav-links .btn-login)').forEach(btn => {
                if (btn.textContent.includes('Entrar')) {
                    btn.textContent = user.nome;
                    btn.href = user.tipo === 'empresa' || user.tipo === 'empresa_selo' 
                        ? 'feed-empresa.html' 
                        : 'feed-cliente.html';
                }
            });

        } else {
            // Usuário não logado
            const loginBtn = navLinks.querySelector('.btn-login:not(#logoutBtn)');
            if (!loginBtn) {
                // Remover logout se existir
                const logout = navLinks.querySelector('#logoutBtn');
                if (logout) logout.remove();

                // Adicionar botão de login
                const login = document.createElement('a');
                login.href = 'login.html';
                login.className = 'btn-login';
                login.innerHTML = '<i class="fa-solid fa-user"></i> Entrar';
                navLinks.appendChild(login);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar header:', error);
    }
}

// ============================================================
// 4. INICIALIZAÇÃO DO SITE
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 main-supabase.js carregado!');

    // ============================================================
    // 4.1. VERIFICAR SE O SUPABASE ESTÁ DISPONÍVEL
    // ============================================================
    if (typeof supabase === 'undefined') {
        console.warn('⚠️ Supabase não disponível. Verifique supabase-config.js');
        return;
    }

    // ============================================================
    // 4.2. CONFIGURAR HEADER
    // ============================================================
    // Aguardar o auth ser carregado
    function configurarHeaderComAuth() {
        if (typeof auth !== 'undefined' && auth) {
            atualizarHeader(auth);
            console.log('✅ Header configurado com autenticação!');
        } else {
            console.log('⏳ Aguardando AuthService...');
            setTimeout(configurarHeaderComAuth, 500);
        }
    }

    // Iniciar configuração do header
    setTimeout(configurarHeaderComAuth, 300);

    // ============================================================
    // 4.3. MÁSCARAS AUTOMÁTICAS
    // ============================================================
    document.querySelectorAll('[data-mask]').forEach(input => {
        const mask = input.dataset.mask;
        const masks = {
            cpf: window.mascaraCPF,
            cnpj: window.mascaraCNPJ,
            phone: window.mascaraTelefone,
            telefone: window.mascaraTelefone,
            cep: window.mascaraCEP,
            placa: window.mascaraPlaca
        };

        if (masks[mask]) {
            input.addEventListener('input', function() {
                const value = this.value;
                const masked = masks[mask](value);
                if (masked !== value) {
                    this.value = masked;
                }
            });
        }
    });

    // ============================================================
    // 4.4. VERIFICAR REDIRECIONAMENTOS
    // ============================================================
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const isFeedPage = currentPath.includes('feed-');

    // Verificar se é página de login e já está logado
    if (isLoginPage) {
        setTimeout(() => {
            if (typeof auth !== 'undefined' && auth.isLogado()) {
                const user = auth.getUsuarioLogado();
                const target = user.tipo === 'empresa' || user.tipo === 'empresa_selo' 
                    ? 'feed-empresa.html' 
                    : 'feed-cliente.html';
                // Só redireciona se não tiver parâmetro de recuperação
                if (!window.location.search.includes('recuperar')) {
                    window.location.href = target;
                }
            }
        }, 500);
    }

    // Verificar se é página de feed e não está logado
    if (isFeedPage) {
        setTimeout(() => {
            if (typeof auth === 'undefined' || !auth.isLogado()) {
                window.location.href = 'login.html';
            }
        }, 500);
    }

    // ============================================================
    // 4.5. ESCUTAR MUDANÇAS DE AUTENTICAÇÃO (múltiplas abas)
    // ============================================================
    window.addEventListener('storage', function(e) {
        if (e.key === 'verdeRealUsuario') {
            // Atualizar header
            if (typeof auth !== 'undefined') {
                atualizarHeader(auth);
            }
        }
    });

    // ============================================================
    // 4.6. LOADING DE CONTEÚDO DINÂMICO
    // ============================================================
    // Adicionar classe para animações de entrada
    document.querySelectorAll('.fade-in-on-load').forEach(el => {
        el.classList.add('fade-in');
    });

    console.log('✅ main-supabase.js pronto!');
});

// ============================================================
// 5. FUNÇÕES AUXILIARES PARA SUPABASE
// ============================================================

/**
 * Verifica a conexão com o Supabase
 * @returns {Promise<boolean>} true se conectado
 */
async function verificarConexaoSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase não disponível');
            return false;
        }

        // Schema atual usa `profiles` (a tabela `usuarios` foi descontinuada
        // quando o site migrou para o mesmo schema do app).
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Erro ao conectar com Supabase:', error);
            return false;
        }

        console.log('✅ Conexão com Supabase OK!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao verificar conexão:', error);
        return false;
    }
}

/**
 * Obtém estatísticas do site
 * @returns {Promise<Object>} Estatísticas
 */
async function getEstatisticasSite() {
    try {
        if (typeof supabase === 'undefined') {
            return { usuarios: 0, empresas: 0, denuncias: 0, selos: 0 };
        }

        // Schema atual: `profiles` (perfis) + `posts` (denúncias/publicações),
        // igual ao que feed-supabase.js já usa em getEstatisticas(). As
        // tabelas antigas `usuarios`/`publicacoes` não existem mais.

        const { count: totalPerfis } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: totalEmpresas } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('tipo', ['empresa', 'empresa_selo']);

        const { count: totalDenuncias } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });

        const { count: totalSelos } = await supabase
            .from('selos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ativo');

        return {
            usuarios: totalPerfis || 0,
            empresas: totalEmpresas || 0,
            denuncias: totalDenuncias || 0,
            selos: totalSelos || 0
        };
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        return { usuarios: 0, empresas: 0, denuncias: 0, selos: 0 };
    }
}

// ============================================================
// 6. EXPORTAÇÃO PARA USO GLOBAL
// ============================================================

// Funções disponíveis globalmente
window.hidePreloader = hidePreloader;
window.showPreloader = showPreloader;
window.showToast = showToast;
window.toastSuccess = toastSuccess;
window.toastError = toastError;
window.toastWarning = toastWarning;
window.toastInfo = toastInfo;
window.atualizarHeader = atualizarHeader;
window.verificarConexaoSupabase = verificarConexaoSupabase;
window.getEstatisticasSite = getEstatisticasSite;

console.log('✅ Funções globais disponíveis!');
console.log('📦 main-supabase.js carregado!');

