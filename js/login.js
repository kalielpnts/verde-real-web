// ============================================================
// login.js - Controlador da Página de Login
// ============================================================
// Este arquivo gerencia a lógica da página de login, incluindo:
// - Login de usuário
// - Criação de conta
// - Recuperação de senha
// - Navegação entre abas
// - Validação de senha
// - Mensagens de feedback
// ============================================================

class LoginManager {
    constructor() {
        console.log('🔐 Inicializando LoginManager...');

        // Verificar se já está logado
        const user = this.getUsuarioLogado();
        if (user) {
            this.redirecionarPorTipo(user);
            return;
        }

        // Inicializar
        this.init();
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    init() {
        // Formulários
        this.formLogin = document.getElementById('loginContaForm');
        this.formCriar = document.getElementById('criarContaForm');
        this.formRecuperar = document.getElementById('recuperarContaForm');

        // Botões
        this.btnLogin = document.getElementById('btnLogin');
        this.btnCriarConta = document.getElementById('btnCriarConta');
        this.btnRecuperarSenha = document.getElementById('btnRecuperarSenha');
        this.btnVoltarLogin = document.getElementById('btnvoltarParaLogin');

        // Links de navegação
        this.linkEsqueciSenha = document.getElementById('esqueciMinhaSenha');
        this.linkNaoTenhoConta = document.getElementById('naoTenhoConta');

        // Inputs
        this.loginEmail = document.getElementById('loginEmail');
        this.loginSenha = document.getElementById('loginSenha');
        this.registrarNome = document.getElementById('registrarNome');
        this.registrarEmail = document.getElementById('registrarEmail');
        this.tipoPerfil = document.getElementById('tipoPerfil');
        this.criarSenha = document.getElementById('criarSenha');
        this.confirmarSenha = document.getElementById('confirmarSenha');
        this.termos = document.getElementById('termos');
        this.recuperarEmail = document.getElementById('recuperarEmail');

        // Configurar eventos
        this.configurarEventos();

        // Verificar parâmetros na URL
        this.verificarParamsURL();

        console.log('✅ LoginManager inicializado!');
    }

    // ============================================================
    // USUÁRIO (localStorage)
    // ============================================================
    getUsuarioLogado() {
        try {
            const userData = localStorage.getItem('verdeRealUsuario');
            if (userData) {
                return JSON.parse(userData);
            }
        } catch (e) {
            console.error('Erro ao recuperar usuário:', e);
        }
        return null;
    }

    salvarUsuario(usuario) {
        try {
            localStorage.setItem('verdeRealUsuario', JSON.stringify(usuario));
        } catch (e) {
            console.error('Erro ao salvar usuário:', e);
        }
    }

    // ============================================================
    // REDIRECIONAMENTO
    // ============================================================
    redirecionarPorTipo(usuario) {
        if (!usuario) return;

        if (usuario.tipo === 'empresa' || usuario.tipo === 'empresa_selo') {
            window.location.href = 'feed-empresa.html';
        } else {
            window.location.href = 'feed-cliente.html';
        }
    }

    // ============================================================
    // CONFIGURAR EVENTOS
    // ============================================================
    configurarEventos() {
        // Abas de navegação
        document.querySelectorAll('.form__nav').forEach(btn => {
            btn.addEventListener('click', () => {
                this.trocarAba(btn.dataset.tab);
            });
        });

        // Links de navegação
        if (this.linkEsqueciSenha) {
            this.linkEsqueciSenha.addEventListener('click', (e) => {
                e.preventDefault();
                this.trocarAba('recuperar');
            });
        }

        if (this.linkNaoTenhoConta) {
            this.linkNaoTenhoConta.addEventListener('click', (e) => {
                e.preventDefault();
                this.trocarAba('criar');
            });
        }

        if (this.btnVoltarLogin) {
            this.btnVoltarLogin.addEventListener('click', () => {
                this.trocarAba('login');
            });
        }

        // Login
        if (this.formLogin) {
            this.formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Criar conta
        if (this.formCriar) {
            this.formCriar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistro();
            });
        }

        // Recuperar senha
        if (this.formRecuperar) {
            this.formRecuperar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRecuperacao();
            });
        }

        // Validação de senha em tempo real
        if (this.criarSenha) {
            this.criarSenha.addEventListener('input', () => {
                this.validarSenha(this.criarSenha.value);
            });
        }

        // Enter para enviar (campos de login)
        if (this.loginEmail) {
            this.loginEmail.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.loginSenha) this.loginSenha.focus();
                }
            });
        }

        if (this.loginSenha) {
            this.loginSenha.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.formLogin) this.formLogin.dispatchEvent(new Event('submit'));
                }
            });
        }

        // Tema escuro (persistente)
        this.configurarTema();
    }

    // ============================================================
    // TROCAR ABA
    // ============================================================
    trocarAba(aba) {
        // Atualizar botões
        document.querySelectorAll('.form__nav').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === aba);
        });

        // Atualizar formulários
        document.querySelectorAll('.form').forEach(form => {
            form.classList.remove('active');
        });

        const targetId = this.getFormId(aba);
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.add('active');
        }

        // Limpar mensagens
        this.removerMensagem();
    }

    getFormId(aba) {
        const ids = {
            'login': 'loginContaForm',
            'criar': 'criarContaForm',
            'recuperar': 'recuperarContaForm'
        };
        return ids[aba] || 'loginContaForm';
    }

    // ============================================================
    // VERIFICAR PARÂMETROS DA URL
    // ============================================================
    verificarParamsURL() {
        const params = new URLSearchParams(window.location.search);
        const aba = params.get('aba');
        const msg = params.get('msg');
        const email = params.get('email');

        if (aba) {
            this.trocarAba(aba);
        }

        if (msg) {
            this.mostrarMensagem(decodeURIComponent(msg), 'success');
        }

        if (email && this.loginEmail) {
            this.loginEmail.value = email;
        }
    }

    // ============================================================
    // HANDLE LOGIN (Supabase)
    // ============================================================
    async handleLogin() {
        const email = this.loginEmail ? this.loginEmail.value.trim() : '';
        const senha = this.loginSenha ? this.loginSenha.value.trim() : '';
        const manterConectado = document.getElementById('manterConectado')?.checked ?? true;

        // Validações
        if (!email || !senha) {
            this.mostrarMensagem('⚠️ Preencha todos os campos.', 'error');
            return;
        }

        if (!this.validarEmail(email)) {
            this.mostrarMensagem('⚠️ Email inválido.', 'error');
            return;
        }

        if (!window.auth) {
            this.mostrarMensagem('❌ Serviço de autenticação indisponível. Recarregue a página.', 'error');
            return;
        }

        // Mostrar loading
        this.setButtonLoading(this.btnLogin, 'Entrando...');

        try {
            const usuario = await window.auth.login(email, senha, manterConectado);

            this.mostrarMensagem(`✅ Bem-vindo(a), ${usuario.nome}!`, 'success');

            // Redirecionar
            setTimeout(() => {
                this.redirecionarPorTipo(usuario);
            }, 500);
        } catch (error) {
            this.mostrarMensagem('❌ ' + error.message, 'error');
            this.setButtonLoading(this.btnLogin, 'Entrar');
        }
    }

    // ============================================================
    // HANDLE REGISTRO (Supabase)
    // ============================================================
    async handleRegistro() {
        const nome = this.registrarNome ? this.registrarNome.value.trim() : '';
        const email = this.registrarEmail ? this.registrarEmail.value.trim() : '';
        const tipo = this.tipoPerfil ? this.tipoPerfil.value : 'cliente';
        const senha = this.criarSenha ? this.criarSenha.value : '';
        const confirmar = this.confirmarSenha ? this.confirmarSenha.value : '';
        const termos = this.termos ? this.termos.checked : false;

        // Validações
        if (!nome || !email || !senha || !confirmar) {
            this.mostrarMensagem('⚠️ Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        if (senha !== confirmar) {
            this.mostrarMensagem('⚠️ As senhas não coincidem.', 'error');
            return;
        }

        if (senha.length < 6) {
            this.mostrarMensagem('⚠️ A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        if (!this.validarEmail(email)) {
            this.mostrarMensagem('⚠️ Email inválido.', 'error');
            return;
        }

        if (!termos) {
            this.mostrarMensagem('⚠️ Você precisa aceitar os termos de uso.', 'error');
            return;
        }

        if (!window.auth) {
            this.mostrarMensagem('❌ Serviço de autenticação indisponível. Recarregue a página.', 'error');
            return;
        }

        // Mostrar loading
        this.setButtonLoading(this.btnCriarConta, 'Criando...');

        try {
            await window.auth.registrar({
                nome,
                email,
                senha,
                tipo,
                avatar: tipo === 'empresa' ? '🏢' : '👤'
            });

            this.mostrarMensagem('✅ Conta criada com sucesso! Faça login.', 'success');

            // Limpar formulário
            if (this.registrarNome) this.registrarNome.value = '';
            if (this.registrarEmail) this.registrarEmail.value = '';
            if (this.criarSenha) this.criarSenha.value = '';
            if (this.confirmarSenha) this.confirmarSenha.value = '';
            if (this.termos) this.termos.checked = false;
            if (this.tipoPerfil) this.tipoPerfil.value = 'cliente';

            // Ir para login
            setTimeout(() => {
                this.trocarAba('login');
                if (this.loginEmail) this.loginEmail.value = email;
                this.setButtonLoading(this.btnCriarConta, 'Criar conta');
            }, 1000);

        } catch (error) {
            this.mostrarMensagem('❌ ' + error.message, 'error');
            this.setButtonLoading(this.btnCriarConta, 'Criar conta');
        }
    }

    // ============================================================
    // HANDLE RECUPERAÇÃO (Supabase)
    // ============================================================
    async handleRecuperacao() {
        const email = this.recuperarEmail ? this.recuperarEmail.value.trim() : '';

        if (!email) {
            this.mostrarMensagem('⚠️ Digite seu email.', 'error');
            return;
        }

        if (!this.validarEmail(email)) {
            this.mostrarMensagem('⚠️ Email inválido.', 'error');
            return;
        }

        if (!window.auth) {
            this.mostrarMensagem('❌ Serviço de autenticação indisponível. Recarregue a página.', 'error');
            return;
        }

        // Mostrar loading
        this.setButtonLoading(this.btnRecuperarSenha, 'Enviando...');

        try {
            const resultado = await window.auth.recuperarSenha(email);

            this.mostrarMensagem('📧 ' + resultado.message, 'success');

            if (this.recuperarEmail) this.recuperarEmail.value = '';
            this.setButtonLoading(this.btnRecuperarSenha, 'Enviar link de recuperação');
        } catch (error) {
            this.mostrarMensagem('❌ ' + error.message, 'error');
            this.setButtonLoading(this.btnRecuperarSenha, 'Enviar link de recuperação');
        }
    }

    // ============================================================
    // VALIDAÇÃO DE EMAIL
    // ============================================================
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // ============================================================
    // VALIDAÇÃO DE SENHA (força)
    // ============================================================
    validarSenha(senha) {
        const barras = document.querySelectorAll('.barra-senha');

        let forca = 0;
        if (senha.length >= 6) forca++;
        if (senha.length >= 10) forca++;
        if (/[A-Z]/.test(senha)) forca++;
        if (/[0-9]/.test(senha)) forca++;
        if (/[^A-Za-z0-9]/.test(senha)) forca++;

        const nivel = Math.min(Math.floor(forca / 2) + 1, 3);
        const classes = ['fraca', 'media', 'forte'];

        barras.forEach((barra, index) => {
            barra.className = 'barra-senha';
            if (index < nivel) {
                barra.classList.add(classes[nivel - 1]);
            }
        });
    }

    // ============================================================
    // LOADING DO BOTÃO
    // ============================================================
    setButtonLoading(btn, texto) {
        if (!btn) return;

        if (texto.includes('...')) {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${texto}`;
            btn.disabled = true;
        } else {
            const originalText = btn.textContent.trim();
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ============================================================
    // MENSAGENS (toast)
    // ============================================================
    mostrarMensagem(texto, tipo = 'info') {
        this.removerMensagem();

        const div = document.createElement('div');
        div.className = `login-mensagem ${tipo}`;
        div.textContent = texto;

        const container = document.querySelector('.login-forms') || document.querySelector('.forms');
        if (container) {
            container.prepend(div);
        }

        // Auto-remover após 5 segundos (exceto loading)
        if (tipo !== 'loading') {
            setTimeout(() => {
                div.style.opacity = '0';
                div.style.transition = 'opacity 0.3s';
                setTimeout(() => div.remove(), 300);
            }, 5000);
        }
    }

    removerMensagem() {
        const old = document.querySelector('.login-mensagem');
        if (old) old.remove();
    }

    // ============================================================
    // TEMA ESCURO
    // ============================================================
    configurarTema() {
        const btnTema = document.getElementById('btnTema');
        if (!btnTema) return;

        // Restaurar preferência
        const isDark = localStorage.getItem('tema-escuro') === 'true';
        if (isDark) {
            document.body.classList.add('tema-escuro');
            const icon = btnTema.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }

        btnTema.addEventListener('click', () => {
            document.body.classList.toggle('tema-escuro');
            const icon = btnTema.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }

            const isDarkNow = document.body.classList.contains('tema-escuro');
            localStorage.setItem('tema-escuro', isDarkNow);
        });
    }

        // ============================================================
    // VERIFICAR TOKEN DE RECUPERAÇÃO NA URL
    // ============================================================
    async verificarTokenRecuperacao() {
        // O Supabase entrega o token de recuperação no hash da URL
        // (#access_token=...&type=recovery), não como query param.
        if (!window.location.hash.includes('type=recovery')) return;

        setTimeout(async () => {
            const { data: { user } } = await window.supabase.auth.getUser();
            this.mostrarModalRedefinicao(null, user?.email || 'sua conta');
            window.history.replaceState({}, '', window.location.pathname);
        }, 400);
    }

    // ============================================================
    // MODAL DE REDEFINIÇÃO DE SENHA
    // ============================================================
    mostrarModalRedefinicao(token, email) {
        const modal = document.createElement('div');
        modal.className = 'modal-redefinicao';
        modal.innerHTML = `
            <div class="modal-box">
                <h2><i class="fas fa-key"></i> Redefinir Senha</h2>
                <p>Digite sua nova senha para o usuário <strong>${email}</strong></p>
                <form id="formRedefinicao">
                    <div class="form-grupo">
                        <label>Nova Senha</label>
                        <input type="password" id="novaSenha" placeholder="Mínimo 6 caracteres" required minlength="6">
                    </div>
                    <div class="form-grupo">
                        <label>Confirmar Nova Senha</label>
                        <input type="password" id="confirmarNovaSenha" placeholder="Digite novamente" required>
                    </div>
                    <button type="submit" class="btn-redefinir">
                        <i class="fas fa-check"></i> Redefinir Senha
                    </button>
                    <button type="button" class="btn-cancelar">Cancelar</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        modal.querySelector('.btn-cancelar').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Submeter
        modal.querySelector('#formRedefinicao').addEventListener('submit', async (e) => {
            e.preventDefault();

            const novaSenha = document.getElementById('novaSenha').value;
            const confirmarSenha = document.getElementById('confirmarNovaSenha').value;

            if (novaSenha !== confirmarSenha) {
                this.mostrarMensagem('⚠️ As senhas não coincidem.', 'error');
                return;
            }

            if (novaSenha.length < 6) {
                this.mostrarMensagem('⚠️ A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }

            if (!window.auth) {
                this.mostrarMensagem('❌ Serviço de autenticação indisponível. Recarregue a página.', 'error');
                return;
            }

            // Redefinir senha
            try {
                await window.auth.redefinirSenha(token, novaSenha);
                this.mostrarMensagem('✅ Senha redefinida com sucesso! Faça login.', 'success');
                modal.remove();
                this.trocarAba('login');
            } catch (error) {
                this.mostrarMensagem('❌ ' + error.message, 'error');
            }
        });
    }
}

// ============================================================
// INICIALIZAR
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de login
    if (document.querySelector('.login-container') || document.querySelector('.login')) {
        console.log('🔐 Página de login detectada!');
        const loginManager = new LoginManager();

        // Verificar token de recuperação após inicializar
        setTimeout(() => {
            loginManager.verificarTokenRecuperacao();
        }, 300);
    }
});

