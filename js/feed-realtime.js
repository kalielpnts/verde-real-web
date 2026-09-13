// ============================================================
// feed-realtime.js - Atualizações em tempo real do feed
// Escuta INSERT/DELETE nas tabelas posts, curtidas e comentarios
// (mesmo padrão de canal usado no app e em notificacoes-supabase.js)
// e atualiza a tela sem precisar de F5.
// ============================================================

(function () {
    let canalPosts = null;
    let canalCurtidas = null;
    let canalComentarios = null;
    let novosPostsPendentes = 0;

    function criarBannerNovosPosts() {
        const existente = document.getElementById('bannerNovosPosts');
        if (existente) return existente;

        const container = document.querySelector('#feed-container');
        if (!container || !container.parentNode) return null;

        const banner = document.createElement('button');
        banner.id = 'bannerNovosPosts';
        banner.type = 'button';
        banner.className = 'btn-acao btn--escuro';
        banner.style.cssText = 'display:none;width:100%;margin-bottom:1.2rem;align-items:center;justify-content:center;gap:0.5rem;';

        banner.addEventListener('click', async function () {
            novosPostsPendentes = 0;
            banner.style.display = 'none';
            await window.feedManager.carregarPosts();
            window.feedManager.renderizarFeed();
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        container.parentNode.insertBefore(banner, container);
        return banner;
    }

    function mostrarBanner() {
        const banner = criarBannerNovosPosts();
        if (!banner) return;
        const plural = novosPostsPendentes > 1;
        banner.innerHTML = `<i class="fas fa-arrow-up"></i> ${novosPostsPendentes} nova${plural ? 's' : ''} publicaç${plural ? 'ões' : 'ão'} · clique para ver`;
        banner.style.display = 'flex';
    }

    function atualizarContagemNaTela(postId) {
        const post = window.feedManager.posts.find((p) => String(p.id) === String(postId));
        const likesCount = document.querySelector(`.post-card[data-id="${postId}"] .likes-count`);
        if (post && likesCount) {
            likesCount.innerHTML = `<i class="fas fa-heart" style="color:var(--dourado);"></i> ${post.curtidas || 0} curtidas${post.comentarios_count ? ` · ${post.comentarios_count} comentários` : ''}`;
        }
    }

    function iniciarCanais() {
        if (canalPosts) return; // já iniciado nesta página

        canalPosts = window.supabase
            .channel(`feed-posts:${Date.now()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                const usuario = window.auth && window.auth.getUsuarioLogado ? window.auth.getUsuarioLogado() : null;
                if (usuario && payload.new.autor_id === usuario.id) return; // publicação própria, já tratada localmente
                if (window.feedManager.posts.some((p) => String(p.id) === String(payload.new.id))) return;
                novosPostsPendentes += 1;
                mostrarBanner();
            })
            .subscribe();

        canalCurtidas = window.supabase
            .channel(`feed-curtidas:${Date.now()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'curtidas' }, (payload) => {
                const post = window.feedManager.posts.find((p) => String(p.id) === String(payload.new.post_id));
                if (post) {
                    post.curtidas = (post.curtidas || 0) + 1;
                    atualizarContagemNaTela(post.id);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'curtidas' }, (payload) => {
                const post = window.feedManager.posts.find((p) => String(p.id) === String(payload.old.post_id));
                if (post) {
                    post.curtidas = Math.max(0, (post.curtidas || 0) - 1);
                    atualizarContagemNaTela(post.id);
                }
            })
            .subscribe();

        canalComentarios = window.supabase
            .channel(`feed-comentarios:${Date.now()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comentarios' }, (payload) => {
                const post = window.feedManager.posts.find((p) => String(p.id) === String(payload.new.post_id));
                if (!post) return;
                post.comentarios_count = (post.comentarios_count || 0) + 1;
                atualizarContagemNaTela(post.id);

                const painel = document.getElementById(`comments-${post.id}`);
                if (painel && painel.style.display !== 'none') {
                    window.feedManager.carregarComentarios(post.id);
                }
            })
            .subscribe();

        console.log('✅ feed-realtime.js: canais ativos (posts, curtidas, comentários)!');
    }

    document.addEventListener('DOMContentLoaded', function () {
        function tentarIniciar() {
            const pronto =
                document.querySelector('#feed-container') &&
                window.feedManager &&
                window.feed &&
                window.supabase;
            if (pronto) {
                iniciarCanais();
            } else if (document.querySelector('#feed-container')) {
                setTimeout(tentarIniciar, 500);
            }
        }
        setTimeout(tentarIniciar, 900);
    });
})();

console.log('📦 feed-realtime.js carregado!');