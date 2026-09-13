// ============================================================
// notificacoes.js - Sino de notificações no header
// Injeta o sino + badge + painel dentro do .nav-links quando o
// usuário está logado. Depende de: window.auth (auth-supabase.js)
// e window.notificacoesService (notificacoes-supabase.js).
// ============================================================

(function () {
    let painelAberto = false;
    let pararEscuta = null;
    let notificacoesCache = [];

    const ICONE_POR_TIPO = {
        curtida: 'fa-heart',
        comentario: 'fa-comment',
        status_denuncia: 'fa-flag',
        selo_empresa: 'fa-award',
    };

    function formatarTempo(criadoEm) {
        const diffMs = Date.now() - new Date(criadoEm).getTime();
        const minutos = Math.floor(diffMs / 60000);
        if (minutos < 1) return 'agora';
        if (minutos < 60) return `${minutos}min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `${horas}h`;
        const dias = Math.floor(horas / 24);
        return `${dias}d`;
    }

    function togglePainel(forcar) {
        const painel = document.getElementById('sinoPainel');
        if (!painel) return;
        painelAberto = typeof forcar === 'boolean' ? forcar : !painelAberto;
        painel.classList.toggle('sino-painel--aberto', painelAberto);
    }

    function atualizarBadge() {
        const badge = document.getElementById('sinoBadge');
        if (!badge) return;
        const naoLidas = notificacoesCache.filter((n) => !n.lida).length;
        if (naoLidas > 0) {
            badge.style.display = 'flex';
            badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
        } else {
            badge.style.display = 'none';
        }
    }

    function atualizarBotaoLerTudo() {
        const botao = document.getElementById('sinoMarcarTodas');
        if (!botao) return;
        botao.disabled = !notificacoesCache.some((n) => !n.lida);
    }

    function irParaDestino(notificacao) {
        const usuario = window.auth.getUsuarioLogado();
        const feedDestino =
            usuario && (usuario.tipo === 'empresa' || usuario.tipo === 'empresa_selo')
                ? 'feed-empresa.html'
                : 'feed-cliente.html';

        if (notificacao.tipo === 'selo_empresa' && notificacao.empresaId) {
            window.location.href = `perfil-empresa.html?id=${notificacao.empresaId}`;
            return;
        }

        if (notificacao.postId) {
            const jaEstaNoFeed = window.location.pathname.includes('feed-');
            if (jaEstaNoFeed) {
                const alvo = document.querySelector(`.post-card[data-id="${notificacao.postId}"]`);
                if (alvo) {
                    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    togglePainel(false);
                    return;
                }
            }
            window.location.href = `${feedDestino}#post-${notificacao.postId}`;
        }
    }

    function renderizarLista() {
        const lista = document.getElementById('sinoLista');
        if (!lista) return;

        if (notificacoesCache.length === 0) {
            lista.innerHTML =
                '<div class="sino-vazio"><i class="fa-regular fa-bell-slash"></i><p>Nenhuma notificação ainda</p></div>';
            return;
        }

        lista.innerHTML = notificacoesCache
            .map(
                (n) => `
            <div class="sino-item ${n.lida ? '' : 'sino-item--nova'}" data-id="${n.id}">
                <div class="sino-item__icone"><i class="fa-solid ${ICONE_POR_TIPO[n.tipo] || 'fa-bell'}"></i></div>
                <div class="sino-item__corpo">
                    <p>${n.mensagem}</p>
                    <span>${formatarTempo(n.criadoEm)}</span>
                </div>
                ${n.lida ? '' : '<span class="sino-item__ponto"></span>'}
            </div>
        `
            )
            .join('');

        lista.querySelectorAll('.sino-item').forEach((el) => {
            el.addEventListener('click', function () {
                const id = this.dataset.id;
                const notificacao = notificacoesCache.find((n) => String(n.id) === String(id));
                if (!notificacao) return;

                if (!notificacao.lida) {
                    notificacao.lida = true;
                    renderizarLista();
                    atualizarBadge();
                    atualizarBotaoLerTudo();
                    window.notificacoesService.marcarComoLida(id).catch(() => {});
                }
                irParaDestino(notificacao);
            });
        });
    }

    function criarEstrutura() {
        const wrapper = document.createElement('div');
        wrapper.className = 'sino-notificacoes';
        wrapper.id = 'sinoNotificacoes';

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'sino-btn';
        botao.setAttribute('aria-label', 'Notificações');
        botao.innerHTML =
            '<i class="fa-solid fa-bell"></i><span class="sino-badge" id="sinoBadge" style="display:none;">0</span>';

        const painel = document.createElement('div');
        painel.className = 'sino-painel';
        painel.id = 'sinoPainel';
        painel.innerHTML = `
            <div class="sino-painel__header">
                <span>Notificações</span>
                <button type="button" id="sinoMarcarTodas" disabled>Ler tudo</button>
            </div>
            <div class="sino-painel__lista" id="sinoLista"></div>
        `;

        wrapper.appendChild(botao);
        wrapper.appendChild(painel);

        botao.addEventListener('click', function (e) {
            e.stopPropagation();
            togglePainel();
        });
        painel.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        document.addEventListener('click', function () {
            if (painelAberto) togglePainel(false);
        });

        painel.querySelector('#sinoMarcarTodas').addEventListener('click', async function () {
            const usuario = window.auth.getUsuarioLogado();
            if (!usuario) return;
            notificacoesCache = notificacoesCache.map((n) => ({ ...n, lida: true }));
            renderizarLista();
            atualizarBadge();
            atualizarBotaoLerTudo();
            await window.notificacoesService.marcarTodasComoLidas(usuario.id);
        });

        return wrapper;
    }

    async function carregar(usuarioId) {
        notificacoesCache = await window.notificacoesService.buscarNotificacoes(usuarioId);
        renderizarLista();
        atualizarBadge();
        atualizarBotaoLerTudo();
    }

    async function iniciar() {
        if (!window.auth || !window.auth.isLogado() || !window.notificacoesService) return;
        const usuario = window.auth.getUsuarioLogado();
        if (!usuario) return;

        const navLinks = document.querySelector('.nav-links');
        if (!navLinks || document.getElementById('sinoNotificacoes')) return;

        const estrutura = criarEstrutura();
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            navLinks.insertBefore(estrutura, logoutBtn);
        } else {
            navLinks.appendChild(estrutura);
        }

        await carregar(usuario.id);

        if (pararEscuta) pararEscuta();
        pararEscuta = window.notificacoesService.ouvirNovas(usuario.id, function (nova) {
            notificacoesCache.unshift(nova);
            renderizarLista();
            atualizarBadge();
            atualizarBotaoLerTudo();
        });

        // Deep-link vindo de outra página (ex: perfil-empresa.html#post-123)
        if (window.location.hash.startsWith('#post-')) {
            const postId = window.location.hash.replace('#post-', '');
            setTimeout(() => {
                document
                    .querySelector(`.post-card[data-id="${postId}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 800);
        }
    }

    function remover() {
        const el = document.getElementById('sinoNotificacoes');
        if (el) el.remove();
        if (pararEscuta) {
            pararEscuta();
            pararEscuta = null;
        }
        notificacoesCache = [];
    }

    window.renderizarSinoNotificacoes = iniciar;
    window.removerSinoNotificacoes = remover;

    document.addEventListener('DOMContentLoaded', function () {
        async function tentarIniciar() {
            const pronto =
                typeof auth !== 'undefined' && window.notificacoesService && window.notificacoesService.inicializado;

            if (!pronto) {
                setTimeout(tentarIniciar, 500);
                return;
            }

            // Espera a restauração da sessão terminar (igual o feed.js já faz) —
            // sem isso, isLogado() responde "false" cedo demais mesmo com o
            // usuário logado de verdade, e o sino nunca chega a ser criado.
            if (auth.initPromise) {
                await auth.initPromise;
            }

            iniciar();
        }
        setTimeout(tentarIniciar, 700);
    });
})();

console.log('📦 notificacoes.js carregado!');