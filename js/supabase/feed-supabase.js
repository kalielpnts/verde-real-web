// ============================================================
// feed-supabase.js - Feed com Supabase (schema real: posts/curtidas/comentarios)
// ============================================================

class FeedService {
    constructor() {
        this.supabase = window.supabase;
        this.auth = window.auth;
        this.posts = [];
        this.inicializado = false;
        this.init();
    }

    async init() {
        if (!this.supabase) {
            console.error('❌ Supabase não disponível');
            return;
        }
        this.inicializado = true;
        console.log('✅ FeedService inicializado!');
    }

    // ============================================================
    // MAPEAMENTO: schema real (posts) -> formato que o feed.js espera
    // ============================================================
    mapearPost(linha, idsCurtidos) {
        return {
            id: linha.id,
            titulo: linha.empresa ? linha.empresa.nome : linha.categoria,
            descricao: linha.conteudo,
            tipo: linha.categoria,
            empresa_alvo: linha.empresa ? linha.empresa.nome : null,
            empresa_id: linha.empresa_id,
            status_denuncia: linha.status,
            midia_url: linha.midia_url,
            data: linha.criado_em,
            usuario_id: linha.autor_id,
            usuario_nome: linha.autor ? linha.autor.nome : 'Usuário',
            usuario_avatar: linha.autor ? linha.autor.avatar_url : null,
            curtidas: linha.curtidas && linha.curtidas[0] ? linha.curtidas[0].count : 0,
            comentarios_count: linha.comentarios && linha.comentarios[0] ? linha.comentarios[0].count : 0,
            curtido: idsCurtidos.has(linha.id),
            temSelo: false,
        };
    }

    async carregarPosts(limite = 50, offset = 0, filtros = {}) {
        try {
            let query = this.supabase
                .from('posts')
                .select(`
                    *,
                    autor:profiles!posts_autor_id_fkey(*),
                    empresa:profiles!posts_empresa_id_fkey(*),
                    curtidas(count),
                    comentarios(count)
                `)
                .order('criado_em', { ascending: false })
                .range(offset, offset + limite - 1);

            if (filtros.tipo && filtros.tipo !== 'all') {
                query = query.eq('categoria', filtros.tipo);
            }
            if (filtros.busca) {
                query = query.ilike('conteudo', `%${filtros.busca}%`);
            }

            const { data, error } = await query;
            if (error) throw new Error('Erro ao carregar posts: ' + error.message);

            let idsCurtidos = new Set();
            if (this.auth && this.auth.isLogado() && data && data.length > 0) {
                const usuario = this.auth.getUsuarioLogado();
                const { data: curtidas } = await this.supabase
                    .from('curtidas')
                    .select('post_id')
                    .eq('user_id', usuario.id);
                idsCurtidos = new Set((curtidas || []).map((c) => c.post_id));
            }

            const enriched = (data || []).map((linha) => this.mapearPost(linha, idsCurtidos));
            this.posts = enriched;
            return enriched;
        } catch (error) {
            console.error('❌ Erro ao carregar posts:', error);
            return [];
        }
    }

    async getPostById(id) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .select(`*, autor:profiles!posts_autor_id_fkey(*), empresa:profiles!posts_empresa_id_fkey(*)`)
                .eq('id', id)
                .single();
            if (error) throw new Error('Erro ao buscar post: ' + error.message);
            return this.mapearPost(data, new Set());
        } catch (error) {
            console.error('❌ Erro ao buscar post:', error);
            return null;
        }
    }

    // ============================================================
    // CRIAR / EDITAR / EXCLUIR
    // ============================================================
    async criarPublicacao(titulo, descricao, tipo = 'Outro', empresaAlvo = null, midiaUrl = null) {
        if (!this.auth || !this.auth.isLogado()) {
            throw new Error('Você precisa estar logado para publicar.');
        }
        if (!descricao) {
            throw new Error('Preencha todos os campos obrigatórios.');
        }

        const usuario = this.auth.getUsuarioLogado();

        // Tentativa de achar a empresa pelo nome digitado (busca livre por enquanto)
        let empresaId = null;
        if (empresaAlvo) {
            const { data: empresas } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('tipo', 'empresa')
                .ilike('nome', `%${empresaAlvo.trim()}%`)
                .limit(1);
            if (empresas && empresas.length > 0) empresaId = empresas[0].id;
        }

        try {
            const { data, error } = await this.supabase
                .from('posts')
                .insert({
                    autor_id: usuario.id,
                    conteudo: descricao.trim(),
                    categoria: tipo || 'Outro',
                    empresa_id: empresaId,
                    midia_url: midiaUrl,
                    tipo_midia: midiaUrl ? 'imagem' : null,
                })
                .select(`*, autor:profiles!posts_autor_id_fkey(*), empresa:profiles!posts_empresa_id_fkey(*)`)
                .single();

            if (error) throw new Error('Erro ao criar publicação: ' + error.message);

            const post = this.mapearPost(data, new Set());
            this.posts.unshift(post);
            console.log('✅ Publicação criada!');
            return post;
        } catch (error) {
            console.error('❌ Erro ao criar publicação:', error);
            throw error;
        }
    }

    async atualizarPublicacao(id, dados) {
        if (!this.auth || !this.auth.isLogado()) throw new Error('Você precisa estar logado.');

        try {
            const patch = {};
            if (dados.descricao !== undefined) patch.conteudo = dados.descricao;

            const { data, error } = await this.supabase
                .from('posts')
                .update(patch)
                .eq('id', id)
                .select(`*, autor:profiles!posts_autor_id_fkey(*), empresa:profiles!posts_empresa_id_fkey(*)`)
                .single();

            if (error) throw new Error('Erro ao atualizar publicação: ' + error.message);

            const post = this.mapearPost(data, new Set());
            const index = this.posts.findIndex((p) => p.id === id);
            if (index !== -1) this.posts[index] = post;

            console.log('✅ Publicação atualizada!');
            return post;
        } catch (error) {
            console.error('❌ Erro ao atualizar publicação:', error);
            throw error;
        }
    }

    async deletarPublicacao(id) {
        if (!this.auth || !this.auth.isLogado()) throw new Error('Você precisa estar logado.');

        try {
            const { error } = await this.supabase.from('posts').delete().eq('id', id);
            if (error) throw new Error('Erro ao deletar publicação: ' + error.message);

            this.posts = this.posts.filter((p) => p.id !== id);
            console.log('✅ Publicação deletada!');
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao deletar publicação:', error);
            throw error;
        }
    }

    // ============================================================
    // CURTIDAS
    // ============================================================
    async toggleLike(postId) {
        if (!this.auth || !this.auth.isLogado()) throw new Error('Faça login para curtir.');
        const usuario = this.auth.getUsuarioLogado();

        try {
            const { data: existing, error: checkError } = await this.supabase
                .from('curtidas')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', usuario.id)
                .maybeSingle();

            if (checkError) throw new Error('Erro ao verificar curtida: ' + checkError.message);

            const post = this.posts.find((p) => p.id === postId);

            if (existing) {
                const { error } = await this.supabase.from('curtidas').delete().eq('id', existing.id);
                if (error) throw new Error('Erro ao remover curtida: ' + error.message);
                if (post) {
                    post.curtido = false;
                    post.curtidas = Math.max(0, (post.curtidas || 0) - 1);
                }
                return { curtido: false, total: post ? post.curtidas : 0 };
            }

            const { error } = await this.supabase.from('curtidas').insert({ post_id: postId, user_id: usuario.id });
            if (error) throw new Error('Erro ao curtir: ' + error.message);
            if (post) {
                post.curtido = true;
                post.curtidas = (post.curtidas || 0) + 1;
            }
            return { curtido: true, total: post ? post.curtidas : 0 };
        } catch (error) {
            console.error('❌ Erro ao curtir:', error);
            throw error;
        }
    }

    async verificarCurtida(postId, usuarioId = null) {
        if (!this.auth || !this.auth.isLogado()) return false;
        const uid = usuarioId || this.auth.getUsuarioLogado().id;
        try {
            const { data } = await this.supabase
                .from('curtidas')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', uid)
                .maybeSingle();
            return !!data;
        } catch (error) {
            console.error('Erro ao verificar curtida:', error);
            return false;
        }
    }

    // ============================================================
    // COMENTÁRIOS
    // ============================================================
    async adicionarComentario(postId, texto) {
        if (!this.auth || !this.auth.isLogado()) throw new Error('Faça login para comentar.');
        if (!texto || texto.trim().length === 0) throw new Error('Digite um comentário.');

        const usuario = this.auth.getUsuarioLogado();

        try {
            const { data, error } = await this.supabase
                .from('comentarios')
                .insert({ post_id: postId, autor_id: usuario.id, conteudo: texto.trim() })
                .select()
                .single();

            if (error) throw new Error('Erro ao adicionar comentário: ' + error.message);

            const post = this.posts.find((p) => p.id === postId);
            if (post) post.comentarios_count = (post.comentarios_count || 0) + 1;

            console.log('✅ Comentário adicionado!');
            return {
                id: data.id,
                texto: data.conteudo,
                usuario_nome: usuario.nome,
                usuario_avatar: usuario.avatar_url,
                data: data.criado_em,
            };
        } catch (error) {
            console.error('❌ Erro ao adicionar comentário:', error);
            throw error;
        }
    }

    async getComentarios(postId, limite = 50) {
        try {
            const { data, error } = await this.supabase
                .from('comentarios')
                .select('*, autor:profiles!comentarios_autor_id_fkey(*)')
                .eq('post_id', postId)
                .order('criado_em', { ascending: true })
                .limit(limite);

            if (error) throw new Error('Erro ao buscar comentários: ' + error.message);

            return (data || []).map((c) => ({
                id: c.id,
                texto: c.conteudo,
                usuario_nome: c.autor ? c.autor.nome : 'Usuário',
                usuario_avatar: c.autor ? c.autor.avatar_url : null,
                data: c.criado_em,
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar comentários:', error);
            return [];
        }
    }

    async deletarComentario(id) {
        if (!this.auth || !this.auth.isLogado()) throw new Error('Você precisa estar logado.');
        try {
            const { error } = await this.supabase.from('comentarios').delete().eq('id', id);
            if (error) throw new Error('Erro ao deletar comentário: ' + error.message);
            console.log('✅ Comentário deletado!');
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao deletar comentário:', error);
            throw error;
        }
    }

    // ============================================================
    // RANKING (mesma "view" que o app usa — ranking de guardiões)
    // ============================================================
    async getRanking(limite = 5) {
        try {
            const { data, error } = await this.supabase.from('ranking').select('*').limit(limite);
            if (error) throw new Error('Erro ao buscar ranking: ' + error.message);
            return (data || []).map((r) => ({ nome: r.nome, pontos: r.total_denuncias }));
        } catch (error) {
            console.error('❌ Erro ao calcular ranking:', error);
            return [];
        }
    }

    async listarEmpresas() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id, nome')
                .eq('tipo', 'empresa')
                .order('nome');
            if (error) throw new Error(error.message);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao listar empresas:', error);
            return [];
        }
    }

    async enviarMidia(usuarioId, file) {
        try {
            const extensao = file.name.split('.').pop() || 'jpg';
            const caminho = `${usuarioId}/${Date.now()}.${extensao}`;
            const { error } = await this.supabase.storage.from('midias').upload(caminho, file, {
                contentType: file.type,
                upsert: false,
            });
            if (error) throw new Error(error.message);
            const { data } = this.supabase.storage.from('midias').getPublicUrl(caminho);
            return data.publicUrl;
        } catch (error) {
            console.error('❌ Erro ao enviar mídia:', error);
            throw error;
        }
    }

    // ============================================================
    // ESTATÍSTICAS (usadas na home)
    // ============================================================
    async getEstatisticas() {
        try {
            const { count: totalDenuncias } = await this.supabase
                .from('posts')
                .select('*', { count: 'exact', head: true });

            const { count: totalSelos } = await this.supabase
                .from('selos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo');

            const { count: totalUsuarios } = await this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const { count: totalCurtidas } = await this.supabase
                .from('curtidas')
                .select('*', { count: 'exact', head: true });

            return {
                totalPublicacoes: totalDenuncias || 0,
                totalDenuncias: totalDenuncias || 0,
                totalSelos: totalSelos || 0,
                totalUsuarios: totalUsuarios || 0,
                totalCurtidas: totalCurtidas || 0,
            };
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return { totalPublicacoes: 0, totalDenuncias: 0, totalSelos: 0, totalUsuarios: 0, totalCurtidas: 0 };
        }
    }

    // ============================================================
    // AUXILIARES
    // ============================================================
    async getPublicacoesByUsuario(usuarioId, limite = 20) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .select(`*, autor:profiles!posts_autor_id_fkey(*), empresa:profiles!posts_empresa_id_fkey(*)`)
                .eq('autor_id', usuarioId)
                .order('criado_em', { ascending: false })
                .limit(limite);
            if (error) throw new Error('Erro ao buscar publicações do usuário: ' + error.message);
            return (data || []).map((linha) => this.mapearPost(linha, new Set()));
        } catch (error) {
            console.error('❌ Erro ao buscar publicações do usuário:', error);
            return [];
        }
    }

    async buscarPublicacoes(termo, limite = 20) {
        if (!termo || termo.length < 2) return [];
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .select(`*, autor:profiles!posts_autor_id_fkey(*), empresa:profiles!posts_empresa_id_fkey(*)`)
                .ilike('conteudo', `%${termo}%`)
                .order('criado_em', { ascending: false })
                .limit(limite);
            if (error) throw new Error('Erro ao buscar publicações: ' + error.message);
            return (data || []).map((linha) => this.mapearPost(linha, new Set()));
        } catch (error) {
            console.error('❌ Erro ao buscar publicações:', error);
            return [];
        }
    }

    getPosts() {
        return this.posts;
    }

    async recarregarPosts(filtros = {}) {
        return await this.carregarPosts(50, 0, filtros);
    }
}

// ============================================================
// INICIALIZAR
// ============================================================
let feedService = null;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof supabase !== 'undefined' && typeof auth !== 'undefined') {
        feedService = new FeedService();
        window.feed = feedService;
        console.log('✅ FeedService disponível globalmente!');
    } else {
        setTimeout(() => {
            if (typeof supabase !== 'undefined' && typeof auth !== 'undefined' && !feedService) {
                feedService = new FeedService();
                window.feed = feedService;
                console.log('✅ FeedService disponível globalmente!');
            }
        }, 1000);
    }
});

console.log('📦 feed-supabase.js carregado!');