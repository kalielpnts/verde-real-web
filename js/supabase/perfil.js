// ============================================================
// perfil.js - Perfil público (usuário comum ou empresa)
// ============================================================

const NIVEL_COR = { bronze: '#B08968', prata: '#9CA8A5', ouro: '#c9a959' };
const NIVEL_LABEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };
const STATUS_LABEL = { pendente: 'Pendente', ativo: 'Ativo', expirado: 'Expirado', revogado: 'Revogado' };

async function carregarPerfil() {
    const params = new URLSearchParams(window.location.search);
    const perfilId = params.get('id');
    const container = document.getElementById('perfil-container');

    if (!perfilId) {
        container.innerHTML = '<p>Perfil não especificado.</p>';
        return;
    }

    while (!window.supabase) {
        await new Promise((r) => setTimeout(r, 100));
    }

    const { data: perfil, error: erroPerfil } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', perfilId)
        .single();

    if (erroPerfil || !perfil) {
        container.innerHTML = '<p>Perfil não encontrado.</p>';
        return;
    }

    const ehEmpresa = perfil.tipo === 'empresa';

    const [
        { data: selos },
        { count: totalSeguidores },
        { count: totalSeguindo },
        { data: postsProprios },
        { data: postsVinculados },
    ] = await Promise.all([
        ehEmpresa
            ? window.supabase.from('selos').select('*').eq('empresa_id', perfilId).order('criado_em', { ascending: false })
            : Promise.resolve({ data: [] }),
        window.supabase.from('seguidores').select('*', { count: 'exact', head: true }).eq('seguido_id', perfilId),
        window.supabase.from('seguidores').select('*', { count: 'exact', head: true }).eq('seguidor_id', perfilId),
        window.supabase
            .from('posts')
            .select('*, autor:profiles!posts_autor_id_fkey(*)')
            .eq('autor_id', perfilId)
            .order('criado_em', { ascending: false }),
        ehEmpresa
            ? window.supabase
                  .from('posts')
                  .select('*, autor:profiles!posts_autor_id_fkey(*)')
                  .eq('empresa_id', perfilId)
                  .order('criado_em', { ascending: false })
            : Promise.resolve({ data: [] }),
    ]);

    let jaSegue = false;
    const usuarioLogado = window.auth && window.auth.isLogado() ? window.auth.getUsuarioLogado() : null;
    if (usuarioLogado) {
        const { data: seguindo } = await window.supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', usuarioLogado.id)
            .eq('seguido_id', perfilId)
            .maybeSingle();
        jaSegue = !!seguindo;
    }

    renderizarPerfil({
        perfil,
        ehEmpresa,
        selos: selos || [],
        totalSeguidores: totalSeguidores || 0,
        totalSeguindo: totalSeguindo || 0,
        postsProprios: postsProprios || [],
        postsVinculados: postsVinculados || [],
        jaSegue,
        usuarioLogado,
    });
}

function cardPost(p) {
    return `
        <div class="post-card">
            <div class="post-content">
                <h3>${p.categoria}</h3>
                <p>${p.conteudo}</p>
            </div>
            <div class="likes-count">
                Por ${p.autor ? p.autor.nome : 'Usuário'} · ${new Date(p.criado_em).toLocaleDateString('pt-BR')}
            </div>
        </div>
    `;
}

function renderizarPerfil({ perfil, ehEmpresa, selos, totalSeguidores, totalSeguindo, postsProprios, postsVinculados, jaSegue, usuarioLogado }) {
    const container = document.getElementById('perfil-container');
    const seloAtivo = selos.find((s) => s.status === 'ativo');

    const avatarHTML = perfil.avatar_url
        ? `<img src="${perfil.avatar_url}" class="post-avatar" style="width:80px;height:80px;object-fit:cover;">`
        : `<div class="post-avatar" style="width:80px;height:80px;font-size:2rem;">${perfil.nome.charAt(0).toUpperCase()}</div>`;

    const tipoBadge = ehEmpresa
        ? `<span class="badge" style="border:1px solid var(--verde-primario);color:var(--verde-primario);"><i class="fas fa-building"></i> Empresa</span>`
        : `<span class="badge" style="border:1px solid var(--verde-detalhe2);color:var(--verde-detalhe2);"><i class="fas fa-user"></i> Cidadão</span>`;

    const seloHTML = ehEmpresa
        ? seloAtivo
            ? `<span class="badge" style="border:1px solid ${NIVEL_COR[seloAtivo.nivel]};color:${NIVEL_COR[seloAtivo.nivel]};">
                 <i class="fas fa-shield-halved"></i> Selo ${NIVEL_LABEL[seloAtivo.nivel]}
               </span>`
            : `<span class="badge" style="border:1px solid var(--verde-detalhe2);color:var(--verde-detalhe2);">
                 <i class="fas fa-circle-exclamation"></i> Sem selo verificado
               </span>`
        : '';

    const mostrarBotaoSeguir = usuarioLogado && usuarioLogado.id !== perfil.id;

    container.innerHTML = `
        <div class="sidebar-card" style="text-align:center;">
            ${avatarHTML}
            <h2 style="margin:0.75rem 0 0.5rem;">${perfil.nome}</h2>
            <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:0.5rem;">
                ${tipoBadge}
                ${seloHTML}
            </div>
            <p style="font-family:'Space Mono',monospace;font-size:0.75rem;color:var(--verde-detalhe2);margin:0.75rem 0;">
                ${totalSeguidores} ${totalSeguidores === 1 ? 'SEGUIDOR' : 'SEGUIDORES'} · ${totalSeguindo} SEGUINDO
            </p>
            ${mostrarBotaoSeguir ? `
                <button class="btn-submit" id="btnSeguir" data-seguindo="${jaSegue}">
                    <i class="fas ${jaSegue ? 'fa-user-minus' : 'fa-user-plus'}"></i>
                    ${jaSegue ? 'Deixar de seguir' : 'Seguir'}
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

        ${ehEmpresa ? `
            <h3 style="margin:1.5rem 0 1rem;"><i class="fas fa-bullhorn"></i> Denúncias vinculadas (${postsVinculados.length})</h3>
            <div>
                ${postsVinculados.length === 0
                    ? '<p style="color:var(--verde-detalhe2);">Nenhuma denúncia registrada contra esta empresa.</p>'
                    : postsVinculados.map(cardPost).join('')
                }
            </div>
        ` : ''}

        <h3 style="margin:1.5rem 0 1rem;"><i class="fas fa-pen"></i> Publicações de ${perfil.nome} (${postsProprios.length})</h3>
        <div>
            ${postsProprios.length === 0
                ? '<p style="color:var(--verde-detalhe2);">Nenhuma publicação ainda.</p>'
                : postsProprios.map(cardPost).join('')
            }
        </div>
    `;

    const btnSeguir = document.getElementById('btnSeguir');
    if (btnSeguir) {
        btnSeguir.addEventListener('click', async () => {
            btnSeguir.disabled = true;
            try {
                const seguindoAgora = btnSeguir.dataset.seguindo === 'true';
                if (seguindoAgora) {
                    const { error } = await window.supabase
                        .from('seguidores')
                        .delete()
                        .eq('seguidor_id', usuarioLogado.id)
                        .eq('seguido_id', perfil.id);
                    if (error) throw error;
                } else {
                    const { error } = await window.supabase
                        .from('seguidores')
                        .insert({ seguidor_id: usuarioLogado.id, seguido_id: perfil.id });
                    if (error) throw error;
                }
                await carregarPerfil();
            } catch (error) {
                console.error(error);
                alert('Erro: ' + error.message);
            } finally {
                btnSeguir.disabled = false;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', carregarPerfil);