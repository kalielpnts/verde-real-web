// ============================================================
// notificacoes-pagina.js - Página com todas as notificações
// ============================================================

const ICONE_POR_TIPO = {
    curtida: 'fa-heart',
    comentario: 'fa-comment',
    status_denuncia: 'fa-flag',
    selo_empresa: 'fa-award',
    seguidor: 'fa-user-plus',
};

function formatarTempoCompleto(criadoEm) {
    return new Date(criadoEm).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function irParaDestinoPagina(notificacao) {
    if (notificacao.tipo === 'seguidor' && notificacao.atorId) {
        window.location.href = `perfil.html?id=${notificacao.atorId}`;
        return;
    }
    if (notificacao.tipo === 'selo_empresa' && notificacao.empresaId) {
        window.location.href = `perfil.html?id=${notificacao.empresaId}`;
        return;
    }
    if (notificacao.postId) {
        const usuario = window.auth.getUsuarioLogado();
        const feedDestino =
            usuario && (usuario.tipo === 'empresa' || usuario.tipo === 'empresa_selo')
                ? 'feed-empresa.html'
                : 'feed-cliente.html';
        window.location.href = `${feedDestino}#post-${notificacao.postId}`;
    }
}

async function carregarPagina() {
    const container = document.getElementById('notificacoes-lista');

    if (!window.auth || !window.auth.isLogado()) {
        container.innerHTML = '<p>Faça login para ver suas notificações.</p>';
        return;
    }

    const usuario = window.auth.getUsuarioLogado();
    const notificacoes = await window.notificacoesService.buscarNotificacoes(usuario.id, 100);

    if (notificacoes.length === 0) {
        container.innerHTML = `
            <div class="mensagem-feed">
                <i class="fa-regular fa-bell-slash"></i>
                <h3>Nenhuma notificação</h3>
                <p>Quando algo acontecer, vai aparecer aqui.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notificacoes
        .map(
            (n) => `
        <div class="sidebar-card notificacao-item ${n.lida ? '' : 'notificacao-item--nova'}" data-id="${n.id}">
            <div class="notificacao-item__icone"><i class="fa-solid ${ICONE_POR_TIPO[n.tipo] || 'fa-bell'}"></i></div>
            <div class="notificacao-item__corpo">
                <p>${n.mensagem}</p>
                <span>${formatarTempoCompleto(n.criadoEm)}</span>
            </div>
            <button class="notificacao-item__apagar" data-id="${n.id}" title="Apagar">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `
        )
        .join('');

    container.querySelectorAll('.notificacao-item__corpo, .notificacao-item__icone').forEach((el) => {
        el.addEventListener('click', async function () {
            const item = this.closest('.notificacao-item');
            const id = item.dataset.id;
            const notificacao = notificacoes.find((n) => String(n.id) === String(id));
            if (!notificacao) return;

            if (!notificacao.lida) {
                await window.notificacoesService.marcarComoLida(id);
            }
            irParaDestinoPagina(notificacao);
        });
    });

    container.querySelectorAll('.notificacao-item__apagar').forEach((botao) => {
        botao.addEventListener('click', async function (e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const item = this.closest('.notificacao-item');
            botao.disabled = true;
            const apagou = await window.notificacoesService.deletarNotificacao(id);
            if (apagou) {
                item.remove();
            } else {
                botao.disabled = false;
                alert('Não foi possível apagar. Tente de novo.');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async function tentar() {
    if (!window.auth || !window.notificacoesService) {
        setTimeout(tentar, 300);
        return;
    }
    if (auth.initPromise) await auth.initPromise;
    carregarPagina();
});