// ============================================================
// auth-supabase.js - Autenticação com Supabase Auth
// ============================================================
// Login, cadastro, logout e recuperação de senha, tudo delegado
// ao Supabase Auth (auth.users). O perfil público (nome, tipo,
// avatar...) vive em public.profiles e é criado automaticamente
// por um trigger no banco assim que o cadastro é concluído.
// ============================================================

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

class AuthService {
    constructor() {
        this.supabase = window.supabase;
        this.usuarioLogado = null;
        this.inicializado = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            if (!this.supabase) {
                console.error('❌ Supabase não disponível. Verifique supabase-config.js');
                return;
            }

            console.log('🔐 Inicializando AuthService...');

            const { data: { session } } = await this.supabase.auth.getSession();
            if (session?.user) {
                await this.carregarPerfil(session.user.id);
            } else {
                this.limparSessaoLocal();
            }

            this.supabase.auth.onAuthStateChange(async (event, novaSessao) => {
                if (event === 'SIGNED_OUT' || !novaSessao) {
                    this.limparSessaoLocal();
                } else if (novaSessao.user) {
                    await this.carregarPerfil(novaSessao.user.id);
                }
            });

            this.inicializado = true;
            console.log('✅ AuthService inicializado!');
        } catch (error) {
            console.error('❌ Erro ao inicializar AuthService:', error);
        }
    }

    async carregarPerfil(userId) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.warn('⚠️ Sessão ativa, mas perfil ainda não encontrado.');
            return null;
        }

        this.usuarioLogado = data;
        localStorage.setItem('verdeRealUsuario', JSON.stringify(data));
        return data;
    }

    limparSessaoLocal() {
        this.usuarioLogado = null;
        localStorage.removeItem('verdeRealUsuario');
        sessionStorage.removeItem('verdeRealUsuario');
    }

    // ============================================================
    // REGISTRO
    // ============================================================
    async registrar(usuario) {
        if (!usuario.nome || !usuario.email || !usuario.senha) {
            throw new Error('Preencha todos os campos obrigatórios.');
        }
        if (usuario.senha.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        if (!validarEmail(usuario.email)) {
            throw new Error('Email inválido.');
        }

        const { data, error } = await this.supabase.auth.signUp({
            email: usuario.email.toLowerCase().trim(),
            password: usuario.senha,
            options: {
                data: {
                    nome: usuario.nome.trim(),
                    tipo: usuario.tipo || 'cliente',
                    telefone: usuario.telefone || null,
                    empresa_nome: usuario.empresaNome || null,
                },
            },
        });

        if (error) {
            if (error.message.toLowerCase().includes('already registered') ||
                error.message.toLowerCase().includes('already exists')) {
                throw new Error('Este email já está cadastrado.');
            }
            throw new Error('Erro ao criar conta: ' + error.message);
        }

        return { precisaConfirmarEmail: !data.session, email: usuario.email };
    }

    // ============================================================
    // LOGIN
    // ============================================================
    async login(email, senha, manterConectado = true) {
        if (!email || !senha) throw new Error('Preencha todos os campos.');
        if (!validarEmail(email)) throw new Error('Email inválido.');

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password: senha,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Email ou senha incorretos.');
            }
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
            }
            throw new Error('Erro ao fazer login: ' + error.message);
        }

        const perfil = await this.carregarPerfil(data.user.id);
        if (!perfil) throw new Error('Não foi possível carregar seu perfil. Tente novamente.');

        if (perfil.status === 'bloqueado') {
            await this.supabase.auth.signOut();
            throw new Error('Conta bloqueada. Entre em contato com o suporte.');
        }
        if (perfil.status === 'inativo') {
            await this.supabase.auth.signOut();
            throw new Error('Conta inativa. Ative sua conta através do email.');
        }

        if (!manterConectado) {
            sessionStorage.setItem('verdeRealUsuario', JSON.stringify(perfil));
            localStorage.removeItem('verdeRealUsuario');
        }

        console.log('✅ Login realizado:', perfil.email);
        return perfil;
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) console.warn('Erro ao deslogar do Supabase:', error);
        this.limparSessaoLocal();
        console.log('✅ Logout realizado com sucesso!');
    }

    // ============================================================
    // RECUPERAÇÃO DE SENHA
    // ============================================================
    async recuperarSenha(email) {
        if (!email || !validarEmail(email)) throw new Error('Email inválido.');

        // Não revelamos se o email existe (evita enumeração de contas)
        await this.supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
            redirectTo: `${window.location.origin}/html/login.html?recuperar=true`,
        });

        return {
            success: true,
            message: 'Se este email estiver cadastrado, você vai receber um link de recuperação.',
        };
    }

    // ============================================================
    // REDEFINIR SENHA
    // ============================================================
    // O link do email já autentica o navegador numa sessão temporária
    // de recuperação (o Supabase faz isso sozinho via URL) — só falta
    // trocar a senha nessa sessão.
    async redefinirSenha(_tokenIgnorado, novaSenha) {
        if (!novaSenha || novaSenha.length < 6) {
            throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const { error } = await this.supabase.auth.updateUser({ password: novaSenha });

        if (error) {
            if (error.message.includes('expired')) {
                throw new Error('Link expirado. Solicite uma nova recuperação.');
            }
            throw new Error('Erro ao redefinir senha: ' + error.message);
        }
    }

    // ============================================================
    // SESSÃO
    // ============================================================
    isLogado() {
        return !!this.usuarioLogado;
    }

    getUsuarioLogado() {
        return this.usuarioLogado;
    }

    async getAccessToken() {
        const { data: { session } } = await this.supabase.auth.getSession();
        return session?.access_token || null;
    }
}

window.auth = new AuthService();