// ============================================================
// feed.js - Controlador do Feed (COM SUPABASE)
// ============================================================

class FeedManager {
    constructor() {
        this.container = document.querySelector('#feed-container');
        this.user = null;
        this.posts = [];
        this.paginaAtual = 1;
        this.postsPorPagina = 5;
        this.filtros = {
            tipo: 'all',
            ordenacao: 'recent',
            busca: ''
        };
        this.init();
    }

    async preencherListaEmpresas() {
        const datalist = document.getElementById('listaEmpresas');
        if (!datalist || typeof feed === 'undefined') return;
        const empresas = await feed.listarEmpresas();
        datalist.innerHTML = empresas.map((e) => `<option value="${e.nome}"></option>`).join('');
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    async init() {
        console.log('📰 Inicializando FeedManager (com Supabase)...');

        // Aguardar a restauração da sessão terminar (AuthService.init()
        // é assíncrono) antes de checar se está logado — sem isso,
        // isLogado() pode responder "false" cedo demais mesmo com o
        // usuário logado de verdade.
        if (typeof auth !== 'undefined' && auth && auth.initPromise) {
            await auth.initPromise;
        }

        // Verificar autenticação
        if (typeof auth === 'undefined' || !auth.isLogado()) {
            this.mostrarMensagem('Faça login para ver o feed', 'login');
            return;
        }

        this.user = auth.getUsuarioLogado();

        // Verificar se o feed service está disponível
        if (typeof feed === 'undefined') {
            console.error('❌ FeedService não disponível!');
            this.mostrarMensagem('Erro ao carregar feed. Tente novamente.', 'error');
            return;
        }

        // Carregar posts do Supabase
        await this.carregarPosts();

        this.preencherListaEmpresas();

        // Renderizar feed
        this.renderizarFeed();

        // Configurar eventos
        this.configurarEventos();

        // Atualizar perfil e ranking
        this.atualizarPerfil();
        this.atualizarRanking();

        console.log('✅ FeedManager inicializado com Supabase!');
    }

    // ============================================================
    // CARREGAR POSTS DO SUPABASE
    // ============================================================
    async carregarPosts() {
        try {
            // Mostrar loading
            this.container.innerHTML = `
                <div class="mensagem-feed">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Carregando publicações...</h3>
                    <p>Aguarde um momento</p>
                </div>
            `;

            // Buscar posts do Supabase via feed service
            const posts = await feed.carregarPosts(50, 0, this.filtros);
            
            if (posts && posts.length > 0) {
                this.posts = posts;
                console.log(`📦 ${posts.length} posts carregados do Supabase!`);
            } else {
                this.posts = [];
                console.log('📦 Nenhum post encontrado no Supabase.');
            }

            // Atualizar ranking e perfil
            this.atualizarRanking();
            this.atualizarPerfil();

        } catch (error) {
            console.error('❌ Erro ao carregar posts:', error);
            this.posts = [];
            this.mostrarMensagem('Erro ao carregar publicações. Tente novamente.', 'error');
        }
    }

    // ============================================================
    // RENDERIZAR FEED
    // ============================================================
    renderizarFeed() {
        if (!this.container) return;

        // Aplicar filtros locais (já que o Supabase já aplicou os filtros)
        let postsFiltrados = this.posts;

        // Filtro por busca (complementar)
        if (this.filtros.busca) {
            const busca = this.filtros.busca.toLowerCase();
            postsFiltrados = postsFiltrados.filter(p =>
                p.titulo?.toLowerCase().includes(busca) ||
                p.descricao?.toLowerCase().includes(busca) ||
                (p.empresa_alvo && p.empresa_alvo.toLowerCase().includes(busca))
            );
        }

        if (postsFiltrados.length === 0) {
            this.container.innerHTML = `
                <div class="mensagem-feed">
                    <i class="fas fa-info-circle"></i>
                    <h3>Nenhuma publicação encontrada</h3>
                    <p>Seja o primeiro a publicar algo!</p>
                    <button onclick="document.getElementById('form-empresa')?.focus()" class="btn-acao btn--escuro" style="margin-top:1rem;">
                        <i class="fas fa-plus-circle"></i> Nova Publicação
                    </button>
                </div>
            `;
            return;
        }

        // Paginação
        const start = (this.paginaAtual - 1) * this.postsPorPagina;
        const paginados = postsFiltrados.slice(start, start + this.postsPorPagina);

        let html = '';
        paginados.forEach(post => {
            html += this.renderizarPost(post);
        });

        // Botão "Carregar mais"
        if (postsFiltrados.length > start + this.postsPorPagina) {
            html += `
                <div style="text-align: center; margin: 2rem 0;">
                    <button class="btn-acao btn--vazado" id="btnCarregarMais">
                        <i class="fas fa-chevron-down"></i> Carregar mais
                    </button>
                </div>
            `;
        }

        this.container.innerHTML = html;
        this.configurarEventosPost();
    }

    // ============================================================
    // RENDERIZAR UM POST
    // ============================================================
        renderizarPost(post) {
        const data = new Date(post.data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const isNovo = (Date.now() - new Date(post.data).getTime()) < 3600000;
        const ehMeuPost = this.user && post.usuario_id === this.user.id;

        const categorias = {
            'Desmatamento': { icone: 'fa-tree', cor: 'var(--dourado)' },
            'Poluição': { icone: 'fa-smog', cor: 'var(--verde-primario)' },
            'Queimada': { icone: 'fa-fire', cor: '#c62828' },
            'Descarte Irregular': { icone: 'fa-trash-alt', cor: 'var(--verde-secundario)' },
            'Água': { icone: 'fa-tint', cor: 'var(--verde-primario)' },
            'Fauna': { icone: 'fa-paw', cor: 'var(--dourado)' },
            'Outro': { icone: 'fa-info-circle', cor: 'var(--verde-detalhe2)' },
        };
        const catInfo = categorias[post.tipo] || categorias['Outro'];

        const avatarHTML = post.usuario_avatar
            ? `<img src="${post.usuario_avatar}" class="post-avatar" style="object-fit:cover;">`
            : `<div class="post-avatar">${(post.usuario_nome || '?').charAt(0).toUpperCase()}</div>`;

        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <div class="post-user" onclick="feedManager.abrirPerfil('${post.usuario_id}')">
                        ${avatarHTML}
                        <div class="post-user-info">
                            <div class="post-user-name">
                                ${post.usuario_nome}
                                ${post.temSelo ? '<i class="fas fa-check-circle verified-badge" style="color:var(--verde-primario);"></i>' : ''}
                                ${isNovo ? '<span class="badge" style="background:var(--dourado);color:#fff;font-size:0.6rem;padding:0.1rem 0.5rem;">NOVO</span>' : ''}
                            </div>
                            <div class="post-empresa-info">
                                <span>${data}</span>
                                ${post.empresa_alvo ? `<span><i class="fas fa-building"></i> ${post.empresa_alvo}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <span class="badge" style="border:1px solid ${catInfo.cor};color:${catInfo.cor};">
                            <i class="fas ${catInfo.icone}"></i> ${post.tipo}
                        </span>
                        ${ehMeuPost ? `
                            <button class="action-btn edit-btn" data-id="${post.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" data-id="${post.id}" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="post-content">
                    <h3>${post.titulo}</h3>
                    <p>${post.descricao}</p>
                </div>

                ${post.midia_url ? `<img src="${post.midia_url}" class="post-imagem" alt="Prova anexada">` : ''}

                <div class="likes-count">
                    <i class="fas fa-heart" style="color:var(--dourado);"></i> ${post.curtidas || 0} curtidas
                    ${post.comentarios_count ? `· ${post.comentarios_count} comentários` : ''}
                </div>

                <div class="post-actions">
                    <button class="action-btn like-btn ${post.curtido ? 'active-like' : ''}" data-id="${post.id}">
                        <i class="${post.curtido ? 'fas' : 'far'} fa-heart"></i> Curtir
                    </button>
                    <button class="action-btn comment-toggle" data-id="${post.id}">
                        <i class="far fa-comment"></i> Comentar
                    </button>
                    <button class="action-btn save-btn" data-id="${post.id}">
                        <i class="far fa-bookmark"></i> Salvar
                    </button>
                </div>

                <div class="comments-section" style="display:none;" id="comments-${post.id}">
                    <div id="comentarios-${post.id}">
                        <p style="color:#999;font-size:0.85rem;margin:0.5rem 0;">Carregando comentários...</p>
                    </div>
                    <div class="comment-form">
                        <input type="text" placeholder="Adicione um comentário..." id="comment-input-${post.id}">
                        <button class="add-comment" data-id="${post.id}">Enviar</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // CONFIGURAR EVENTOS
    // ============================================================
    configurarEventos() {
        // Filtros
        const filtroTipo = document.getElementById('filtroTipo');
        const ordenacao = document.getElementById('ordenacao');
        const buscaInput = document.getElementById('buscaInput');

        if (filtroTipo) {
            filtroTipo.addEventListener('change', () => this.aplicarFiltrosUI());
        }

        if (ordenacao) {
            ordenacao.addEventListener('change', () => this.aplicarFiltrosUI());
        }

        if (buscaInput) {
            buscaInput.addEventListener('input', () => this.aplicarFiltrosUI());
        }

        // Botão de publicar
        const publicarBtn = document.getElementById('publicarDenunciaBtn');
        if (publicarBtn) {
            publicarBtn.addEventListener('click', () => this.publicarPost());
        }

        // Perfil link
        const perfilLink = document.getElementById('perfilLink');
        if (perfilLink) {
            perfilLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('perfilCard')?.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (typeof auth !== 'undefined' && auth.logout) {
                    await auth.logout();
                }
                window.location.href = 'login.html';
            });
        }

        // Carregar mais
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btnCarregarMais') {
                this.paginaAtual++;
                this.renderizarFeed();
            }
        });
    }

    // ============================================================
    // CONFIGURAR EVENTOS DOS POSTS
    // ============================================================
    configurarEventosPost() {
        // Curtidas
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this.toggleLike(id);
            });
        });

        // Comentários (toggle)
        document.querySelectorAll('.comment-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const div = document.getElementById(`comments-${id}`);
                if (div) {
                    const isVisible = div.style.display === 'block';
                    div.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        this.carregarComentarios(id);
                    }
                }
            });
        });

        // Adicionar comentário
        document.querySelectorAll('.add-comment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const input = document.getElementById(`comment-input-${id}`);
                if (input && input.value.trim()) {
                    await this.adicionarComentario(id, input.value.trim());
                    input.value = '';
                }
            });
        });

        // Adicionar comentário com Enter
        document.querySelectorAll('.comment-form input').forEach(input => {
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const id = input.id.replace('comment-input-', '');
                    const btn = document.querySelector(`.add-comment[data-id="${id}"]`);
                    if (btn) btn.click();
                }
            });
        });

        // Editar post
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this.editarPost(id);
            });
        });

        // Excluir post
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this.excluirPost(id);
            });
        });
    }

    // ============================================================
    // AÇÕES DOS POSTS (COM SUPABASE)
    // ============================================================

    // Curtir
    async toggleLike(postId) {
        try {
            if (typeof feed === 'undefined') {
                alert('Erro: FeedService não disponível.');
                return;
            }

            const result = await feed.toggleLike(postId);
            
            // Atualizar visualmente
            const btn = document.querySelector(`.like-btn[data-id="${postId}"]`);
            if (btn) {
                btn.classList.toggle('active-like');
                const icon = btn.querySelector('i');
                icon.className = result.curtido ? 'fas fa-heart' : 'far fa-heart';
            }

            // Atualizar contagem
            const likesCount = document.querySelector(`.post-card[data-id="${postId}"] .likes-count`);
            if (likesCount) {
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    likesCount.innerHTML = `<i class="fas fa-heart" style="color:var(--dourado);"></i> ${post.curtidas || 0} curtidas${post.comentarios_count ? ` · ${post.comentarios_count} comentários` : ''}`;
                }
            }

            // Atualizar ranking
            this.atualizarRanking();

        } catch (error) {
            console.error('❌ Erro ao curtir:', error);
            alert(error.message || 'Erro ao curtir publicação.');
        }
    }

    // Adicionar comentário
    async adicionarComentario(postId, texto) {
        try {
            if (typeof feed === 'undefined') {
                alert('Erro: FeedService não disponível.');
                return;
            }

            await feed.adicionarComentario(postId, texto);
            
            // Recarregar comentários
            await this.carregarComentarios(postId);

            // Atualizar contagem
            const post = this.posts.find(p => p.id === postId);
            if (post) {
                post.comentarios_count = (post.comentarios_count || 0) + 1;
            }

            // Atualizar visualmente a contagem
            const likesCount = document.querySelector(`.post-card[data-id="${postId}"] .likes-count`);
            if (likesCount && post) {
                likesCount.innerHTML = `<i class="fas fa-heart" style="color:var(--dourado);"></i> ${post.curtidas || 0} curtidas · ${post.comentarios_count || 0} comentários`;
            }

        } catch (error) {
            console.error('❌ Erro ao comentar:', error);
            alert(error.message || 'Erro ao adicionar comentário.');
        }
    }

    // Carregar comentários
    async carregarComentarios(postId) {
        try {
            if (typeof feed === 'undefined') return;

            const comentarios = await feed.getComentarios(postId);
            const container = document.getElementById(`comentarios-${postId}`);
            
            if (container) {
                if (!comentarios || comentarios.length === 0) {
                    container.innerHTML = '<p style="color:#999;font-size:0.85rem;margin:0.5rem 0;">Nenhum comentário ainda.</p>';
                } else {
                    container.innerHTML = comentarios.map(c => `
                        <div class="comment">
                            <div class="comment-avatar">${c.usuario_avatar || '👤'}</div>
                            <div>
                                <strong>${c.usuario_nome}</strong>
                                <span>${c.texto}</span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar comentários:', error);
        }
    }

    // Editar post
    async editarPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        if (post.usuario_id !== this.user?.id) {
            alert('Você só pode editar seus próprios posts.');
            return;
        }

        const novoTitulo = prompt('Editar título:', post.titulo);
        if (novoTitulo !== null && novoTitulo.trim()) {
            post.titulo = novoTitulo.trim();
        }

        const novaDescricao = prompt('Editar descrição:', post.descricao);
        if (novaDescricao !== null && novaDescricao.trim()) {
            post.descricao = novaDescricao.trim();
        }

        try {
            if (typeof feed !== 'undefined') {
                await feed.atualizarPublicacao(postId, {
                    titulo: post.titulo,
                    descricao: post.descricao
                });
            }
            this.renderizarFeed();
        } catch (error) {
            console.error('❌ Erro ao editar:', error);
            alert(error.message || 'Erro ao editar publicação.');
        }
    }

    // Excluir post
    async excluirPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        if (post.usuario_id !== this.user?.id) {
            alert('Você só pode excluir seus próprios posts.');
            return;
        }

        if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;

        try {
            if (typeof feed !== 'undefined') {
                await feed.deletarPublicacao(postId);
            }
            
            this.posts = this.posts.filter(p => p.id !== postId);
            this.renderizarFeed();
            this.atualizarRanking();
            this.atualizarPerfil();
        } catch (error) {
            console.error('❌ Erro ao excluir:', error);
            alert(error.message || 'Erro ao excluir publicação.');
        }
    }

    // ============================================================
    // PUBLICAR POST
    // ============================================================
        async publicarPost() {
        const empresaInput = document.getElementById('form-empresa');
        const descInput = document.getElementById('form-desc');
        const tipoSelect = document.getElementById('tipoPublicacao');
        const imagemInput = document.getElementById('form-imagem');

        const titulo = empresaInput ? empresaInput.value.trim() : '';
        const descricao = descInput ? descInput.value.trim() : '';
        const tipo = tipoSelect ? tipoSelect.value : 'Outro';

        if (!descricao) {
            alert('Descreva a denúncia!');
            return;
        }
        if (!this.user) {
            alert('Faça login para publicar!');
            return;
        }

        const btn = document.getElementById('publicarDenunciaBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
        }

        try {
            if (typeof feed === 'undefined') {
                alert('Erro: FeedService não disponível.');
                return;
            }

            let midiaUrl = null;
            if (imagemInput && imagemInput.files && imagemInput.files[0]) {
                midiaUrl = await feed.enviarMidia(this.user.id, imagemInput.files[0]);
            }

            const novoPost = await feed.criarPublicacao(titulo, descricao, tipo, titulo || null, midiaUrl);

            if (novoPost) {
                if (empresaInput) empresaInput.value = '';
                if (descInput) descInput.value = '';
                if (imagemInput) imagemInput.value = '';

                await this.carregarPosts();
                this.renderizarFeed();
                this.atualizarRanking();
                this.atualizarPerfil();

                alert('✅ Publicação criada com sucesso!');
            }
        } catch (error) {
            console.error('❌ Erro ao publicar:', error);
            alert(error.message || 'Erro ao criar publicação.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar';
            }
        }
    }

    // ============================================================
    // FILTROS
    // ============================================================
    aplicarFiltrosUI() {
        const tipoSelect = document.getElementById('filtroTipo');
        const ordenacaoSelect = document.getElementById('ordenacao');
        const buscaInput = document.getElementById('buscaInput');

        this.filtros.tipo = tipoSelect ? tipoSelect.value : 'all';
        this.filtros.ordenacao = ordenacaoSelect ? ordenacaoSelect.value : 'recent';
        this.filtros.busca = buscaInput ? buscaInput.value.trim().toLowerCase() : '';

        this.paginaAtual = 1;
        this.carregarPosts();
    }

    // ============================================================
    // RANKING
    // ============================================================
    async atualizarRanking() {
        const container = document.getElementById('ranking-container');
        if (!container) return;

        try {
            if (typeof feed !== 'undefined') {
                const ranking = await feed.getRanking(5);
                
                if (!ranking || ranking.length === 0) {
                    container.innerHTML = '<p style="color:var(--verde-detalhe2);font-size:0.9rem;">Nenhuma empresa no ranking.</p>';
                } else {
                    container.innerHTML = ranking.map(item => `
                        <div class="ranking-item">
                            <span class="empresa-nome">${item.nome}</span>
                            <span class="score positive">${item.pontos} pts</span>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar ranking:', error);
            container.innerHTML = '<p style="color:var(--verde-detalhe2);font-size:0.9rem;">Erro ao carregar ranking.</p>';
        }
    }

    // ============================================================
    // PERFIL
    // ============================================================
    atualizarPerfil() {
        const container = document.getElementById('userStats');
        if (!container) return;

        if (!this.user) {
            container.innerHTML = '<p style="color:var(--verde-detalhe2);font-size:0.9rem;">Faça login para ver seu perfil.</p>';
            return;
        }

        const meusPosts = this.posts.filter(p => p.usuario_id === this.user.id);
        const totalLikes = meusPosts.reduce((acc, p) => acc + (p.curtidas || 0), 0);

        container.innerHTML = `
            <p><strong>${this.user.nome}</strong></p>
            <p><i class="fas fa-envelope"></i> ${this.user.email}</p>
            <p><i class="fas fa-bullhorn"></i> Publicações: ${meusPosts.length}</p>
            <p><i class="fas fa-heart" style="color:var(--dourado);"></i> Curtidas: ${totalLikes}</p>
            <p><i class="fas fa-tag"></i> Tipo: ${this.user.tipo === 'empresa_selo' ? '🏅 Empresa com Selo' : this.user.tipo === 'empresa' ? '🏢 Empresa' : '👤 Cliente'}</p>
        `;
    }

    // ============================================================
    // ABRIR PERFIL DO USUÁRIO
    // ============================================================
    abrirPerfil(usuarioId) {
        const usuario = this.posts.find(p => p.usuario_id === usuarioId);
        if (!usuario) {
            alert('Usuário não encontrado.');
            return;
        }

        const postsDoUsuario = this.posts.filter(p => p.usuario_id === usuarioId);
        const totalLikes = postsDoUsuario.reduce((acc, p) => acc + (p.curtidas || 0), 0);

        alert(`
            📋 Perfil do Usuário
            
            Nome: ${usuario.usuario_nome}
            Publicações: ${postsDoUsuario.length}
            Curtidas recebidas: ${totalLikes}
        `);
    }

    // ============================================================
    // MENSAGENS
    // ============================================================
    mostrarMensagem(texto, tipo = 'info') {
        if (!this.container) return;

        const icons = {
            info: 'fa-info-circle',
            login: 'fa-lock',
            loading: 'fa-spinner fa-spin',
            error: 'fa-exclamation-circle'
        };

        this.container.innerHTML = `
            <div class="mensagem-feed">
                <i class="fas ${icons[tipo] || icons.info}"></i>
                <h3>${tipo === 'login' ? 'Acesso Restrito' : 'Aviso'}</h3>
                <p>${texto}</p>
                ${tipo === 'login' ? `<a href="login.html" class="btn-acao btn--escuro" style="margin-top:1rem;display:inline-flex;">Fazer Login</a>` : ''}
            </div>
        `;
    }
}

// ============================================================
// INICIALIZAR
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('#feed-container')) {
        console.log('📰 Página de feed detectada, iniciando FeedManager...');
        window.feedManager = new FeedManager();
    }
});

