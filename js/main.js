// ============================================================
// main.js - Funções Globais do Site
// ============================================================
// Este arquivo contém funções globais essenciais para o site:
// - Preloader (carregamento)
// - Toast (mensagens flutuantes)
// - Inicialização do header (login/logout)
// - Configuração de máscaras automáticas
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
// 3. INICIALIZAÇÃO DO SITE
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 main.js carregado!');

    // ============================================================
    // 3.1. MÁSCARAS AUTOMÁTICAS
    // ============================================================
    // Aplica máscaras em inputs com data-mask (usa funções do utils.js)
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
    // 3.2. HEADER - USUÁRIO LOGADO
    // ============================================================
    try {
        const userData = localStorage.getItem('verdeRealUsuario');
        if (userData) {
            const user = JSON.parse(userData);
            
            // Atualizar botão de login no header
            const loginBtn = document.querySelector('.btn-login, #btnLoginHeader');
            if (loginBtn && !loginBtn.closest('.nav-links a[href="login.html"]')) {
                loginBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${user.nome}`;
                loginBtn.href = user.tipo === 'empresa' || user.tipo === 'empresa_selo' 
                    ? 'feed-empresa.html' 
                    : 'feed-cliente.html';
            }

            // Adicionar botão de logout se não existir
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && !navLinks.querySelector('#logoutBtn')) {
                const logoutBtn = document.createElement('a');
                logoutBtn.id = 'logoutBtn';
                logoutBtn.href = '#';
                logoutBtn.className = 'btn-login';
                logoutBtn.style.background = 'var(--verde-detalhe2)';
                logoutBtn.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> Sair';
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    localStorage.removeItem('verdeRealUsuario');
                    window.location.href = 'login.html';
                });
                navLinks.appendChild(logoutBtn);
            }
        }
    } catch (e) {
        // Silencioso
    }

    // ============================================================
    // 3.3. VERIFICAR SE ESTÁ NA PÁGINA DE LOGIN (redirecionar se logado)
    // ============================================================
    const isLoginPage = window.location.pathname.includes('login.html');
    if (isLoginPage) {
        try {
            const userData = localStorage.getItem('verdeRealUsuario');
            if (userData) {
                const user = JSON.parse(userData);
                const target = user.tipo === 'empresa' || user.tipo === 'empresa_selo' 
                    ? 'feed-empresa.html' 
                    : 'feed-cliente.html';
                // Só redireciona se não tiver parâmetro de recuperação na URL
                if (!window.location.search.includes('recuperar')) {
                    window.location.href = target;
                }
            }
        } catch (e) {
            // Silencioso
        }
    }

    // ============================================================
    // 3.4. VERIFICAR SE ESTÁ NO FEED (redirecionar se não logado)
    // ============================================================
    const isFeedPage = window.location.pathname.includes('feed-');
    if (isFeedPage) {
        try {
            const userData = localStorage.getItem('verdeRealUsuario');
            if (!userData) {
                window.location.href = 'login.html';
            }
        } catch (e) {
            window.location.href = 'login.html';
        }
    }

    console.log('✅ main.js pronto!');
});

// ============================================================
// 4. EXPORTAÇÃO PARA USO GLOBAL
// ============================================================

// Funções disponíveis globalmente
window.hidePreloader = hidePreloader;
window.showPreloader = showPreloader;
window.showToast = showToast;
window.toastSuccess = toastSuccess;
window.toastError = toastError;
window.toastWarning = toastWarning;
window.toastInfo = toastInfo;

console.log('✅ Funções globais disponíveis!');

