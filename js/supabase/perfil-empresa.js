// ============================================================
// perfil-empresa.js - Perfil público de empresa
// ============================================================

async function carregarPerfilEmpresa() {
    const params = new URLSearchParams(window.location.search);
    const empresaId = params.get('id');
    const container = document.getElementById('perfil-empresa-container');

    if (!empresaId) {
        container.innerHTML = '<p>Empresa não especificada.</p>';
        return;
    }

    while (!window.supabase) {
        await new Promise((r) => setTimeout(r, 100));
    }

    const { data: empresa, error: erroEmpresa } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', empresaId)
        .single();

    if (erroEmpresa || !empresa) {
        container.innerHTML = '<p>Empresa não encontrada.</p>';
        return;
    }

    const { data: selos } = await window.supabase
        .from('selos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

    const { count: totalSeguidores } = await window.supabase
        .from('seguidores_empresa')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);

    const { data: posts } = await window.supabase
        .from('posts')
        .select('*, autor:profiles!posts_autor_id_fkey(*)')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

    let jaSegue = false;
    const usuarioLogado = window.auth && window.auth.isLogado() ? window.auth.getUsuarioLogado() : null;
    if (usuarioLogado) {
        const { data: seguindo } = await window.supabase
            .from('seguidores_empresa')
            .select('id')
            .eq('seguidor_id', usuarioLogado.id)
            .eq('empresa_id', empresaId)
            .maybeSingle();
        jaSegue = !!seguindo;
    }

    renderizarPerfilEmpresa(empresa, selos || [], totalSeguidores || 0, posts || [], jaSegue, usuarioLogado);
}

const NIVEL_COR = { bronze: '#B08968', prata: '#9CA8A5', ouro: '#c9a959' };
const NIVEL_LABEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };
const STATUS_LABEL = { pendente: 'Pendente', ativo: 'Ativo', expirado: 'Expirado', revogado: 'Revogado' };

function renderizarPerfilEmpresa(empresa, selos, totalSeguidores, posts, jaSegue, usuarioLogado) {
    const seloAtivo = selos.find((s) => s.status === 'ativo');
    const container = document.getElementById('perfil-empresa-container');

    const avatarHTML = empresa.avatar_url
        ? `<img src="${empresa.avatar_url}" class="post-avatar" style="width:80px;height:80px;object-fit:cover;">`
        : `<div class="post-avatar" style="width:80px;height:80px;font-size:2rem;">${empresa.nome.charAt(0).toUpperCase()}</div>`;

    const seloHTML = seloAtivo
        ? `<span class="badge" style="border:1px solid ${NIVEL_COR[seloAtivo.nivel]};color:${NIVEL_COR[seloAtivo.nivel]};">
             <i class="fas fa-shield-halved"></i> Selo ${NIVEL_LABEL[seloAtivo.nivel]}
           </span>`
        : `<span class="badge" style="border:1px solid var(--verde-detalhe2);color:var(--verde-detalhe2);">
             <i class="fas fa-circle-exclamation"></i> Sem selo verificado
           </span>`;

    const mostrarBotaoSeguir = usuarioLogado && usuarioLogado.id !== empresa.id;

    container.innerHTML = `
        <div class="sidebar-card" style="text-align:center;">
            ${avatarHTML}
            <h2 style="margin:0.75rem 0 0.5rem;">${empresa.nome}</h2>
            ${seloHTML}
            <p style="font-family:'Space Mono',monospace;font-size:0.75rem;color:var(--verde-detalhe2);margin:0.75rem 0;">
                ${totalSeguidores} ${totalSeguidores === 1 ? 'SEGUIDOR' : 'SEGUIDORES'}
            </p>
            ${mostrarBotaoSeguir ? `
                <button class="btn-submit" id="btnSeguirEmpresa" data-seguindo="${jaSegue}">
                    <i class="fas ${jaSegue ? 'fa-user-minus' : 'fa-user-plus'}"></i>
                    ${jaSegue ? 'Deixar de seguir' : 'Seguir empresa'}
                </button>
            ` : ''}
        </div>

        ${selos.length > 0 ? `
            <div class="sidebar-card">
                <h3><i class="fas fa-shield-halved"></i> Histórico de selos</h3>
                ${selos.map((s) => `
                    <div style="display:flex;align-items:center;gap:0.5rem;border-bottom:var(--border-linha);padding:0.5rem 0;">
                        <span style="width:10px;height:10px;border-radius:50%;background:${NIVEL_COR[s.nivel]};"></span>
                        <span style="flex:1;font-weight:600;">${NIVEL_LABEL[s.nivel]}</span>
                        <span style="font-family:'Space Mono',monospace;font-size:0.7rem;color:var(--verde-detalhe2);">${STATUS_LABEL[s.status].toUpperCase()}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <h3 style="margin:1.5rem 0 1rem;"><i class="fas fa-bullhorn"></i> Denúncias vinculadas (${posts.length})</h3>
        <div id="posts-empresa-container">
            ${posts.length === 0
                ? '<p style="color:var(--verde-detalhe2);">Nenhuma denúncia registrada contra esta empresa.</p>'
                : posts.map((p) => `
                    <div class="post-card">
                        <div class="post-content">
                            <h3>${p.categoria}</h3>
                            <p>${p.conteudo}</p>
                        </div>
                        <div class="likes-count">
                            Por ${p.autor ? p.autor.nome : 'Usuário'} · ${new Date(p.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                `).join('')
            }
        </div>
    `;

    const btnSeguir = document.getElementById('btnSeguirEmpresa');
    if (btnSeguir) {
        btnSeguir.addEventListener('click', async () => {
            btnSeguir.disabled = true;
            try {
                const seguindoAgora = btnSeguir.dataset.seguindo === 'true';
                if (seguindoAgora) {
                    await window.supabase
                        .from('seguidores_empresa')
                        .delete()
                        .eq('seguidor_id', usuarioLogado.id)
                        .eq('empresa_id', empresa.id);
                } else {
                    await window.supabase
                        .from('seguidores_empresa')
                        .insert({ seguidor_id: usuarioLogado.id, empresa_id: empresa.id });
                }
                await carregarPerfilEmpresa();
            } catch (error) {
                alert('Erro: ' + error.message);
            } finally {
                btnSeguir.disabled = false;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', carregarPerfilEmpresa);