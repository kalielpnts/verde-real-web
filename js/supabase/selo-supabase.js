// ============================================================
// selo-supabase.js - Gerenciamento de Selos com Supabase
// ============================================================
// Este arquivo gerencia todas as operações de selos:
// - Conceder selo
// - Verificar selo
// - Renovar selo
// - Listar selos ativos
// - Estatísticas de selos
// ============================================================

class SeloService {
    constructor() {
        this.supabase = window.supabase;
        this.auth = window.auth;
        this.inicializado = false;
        this.init();
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    async init() {
        try {
            if (!this.supabase) {
                console.error('❌ Supabase não disponível');
                return;
            }

            console.log('🏅 Inicializando SeloService...');
            this.inicializado = true;
            console.log('✅ SeloService inicializado!');
        } catch (error) {
            console.error('❌ Erro ao inicializar SeloService:', error);
        }
    }

    // ============================================================
    // CONCEDER SELO
    // ============================================================

    /**
     * Concede um selo para uma empresa
     * @param {string} empresaId - ID da empresa
     * @param {Object} dadosSelo - Dados do selo
     * @param {string} dadosSelo.nivel - 'bronze', 'prata', 'ouro'
     * @param {Array} dadosSelo.certificacoes - Lista de certificações
     * @param {Array} dadosSelo.metas - Lista de metas
     * @param {string} dadosSelo.observacoes - Observações (opcional)
     * @param {string} dadosSelo.validade - Data de validade (opcional)
     * @returns {Promise<Object>} Selo concedido
     */
    async concederSelo(empresaId, dadosSelo) {
        // Verificar autenticação
        if (!this.auth || !this.auth.isLogado()) {
            throw new Error('Você precisa estar logado para conceder selo.');
        }

        const usuario = this.auth.getUsuarioLogado();

        // Verificar se é uma empresa
        if (!this.auth.isEmpresa() && !this.auth.temSelo()) {
            throw new Error('Apenas empresas podem solicitar selo.');
        }

        // Verificar se a empresa é a mesma que está solicitando (ou admin)
        if (empresaId !== usuario.id) {
            // TODO: Verificar se é admin
            // Por enquanto, só permite solicitar para si mesmo
            throw new Error('Você só pode solicitar selo para sua própria empresa.');
        }

        try {
            // Verificar se já possui selo ativo
            const seloExistente = await this.getSeloByEmpresa(empresaId);
            if (seloExistente && seloExistente.status === 'ativo') {
                throw new Error('Esta empresa já possui um selo ativo.');
            }

            const selo = {
                empresa_id: empresaId,
                nivel: dadosSelo.nivel || 'bronze',
                certificacoes: dadosSelo.certificacoes || [],
                metas: dadosSelo.metas || [],
                status: 'ativo',
                data_concessao: new Date().toISOString(),
                validade: dadosSelo.validade || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                renovado_em: null,
                observacoes: dadosSelo.observacoes || ''
            };

            const { data, error } = await this.supabase
                .from('selos')
                .insert([selo])
                .select()
                .single();

            if (error) {
                throw new Error('Erro ao conceder selo: ' + error.message);
            }

            // Atualizar tipo do usuário para 'empresa_selo'
            await this.supabase
                .from('usuarios')
                .update({ tipo: 'empresa_selo' })
                .eq('id', empresaId);

            // Atualizar sessão local
            if (this.auth && this.auth.usuarioLogado && this.auth.usuarioLogado.id === empresaId) {
                this.auth.usuarioLogado.tipo = 'empresa_selo';
                localStorage.setItem('verdeRealUsuario', JSON.stringify(this.auth.usuarioLogado));
            }

            console.log('✅ Selo concedido para empresa:', empresaId);
            return data;

        } catch (error) {
            console.error('❌ Erro ao conceder selo:', error);
            throw error;
        }
    }

    // ============================================================
    // VERIFICAR SELO
    // ============================================================

    /**
     * Busca o selo de uma empresa
     * @param {string} empresaId - ID da empresa
     * @param {boolean} apenasAtivo - Buscar apenas selos ativos
     * @returns {Promise<Object|null>} Selo encontrado ou null
     */
    async getSeloByEmpresa(empresaId, apenasAtivo = true) {
        if (!empresaId) return null;

        try {
            let query = this.supabase
                .from('selos')
                .select('*')
                .eq('empresa_id', empresaId);

            if (apenasAtivo) {
                query = query.eq('status', 'ativo');
            }

            const { data, error } = await query
                .order('data_concessao', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Erro ao buscar selo:', error);
                return null;
            }

            // Verificar se o selo expirou
            if (data && data.status === 'ativo' && new Date(data.validade) < new Date()) {
                // Atualizar status para expirado
                await this.supabase
                    .from('selos')
                    .update({ status: 'expirado' })
                    .eq('id', data.id);
                
                data.status = 'expirado';
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar selo:', error);
            return null;
        }
    }

    /**
     * Verifica se uma empresa possui selo ativo
     * @param {string} empresaId - ID da empresa
     * @returns {Promise<boolean>} true se possui selo ativo
     */
    async temSeloAtivo(empresaId) {
        const selo = await this.getSeloByEmpresa(empresaId, true);
        return !!(selo && selo.status === 'ativo' && new Date(selo.validade) > new Date());
    }

    // ============================================================
    // RENOVAR SELO
    // ============================================================

    /**
     * Renova um selo existente
     * @param {string} seloId - ID do selo
     * @param {string} novaValidade - Nova data de validade (opcional)
     * @returns {Promise<Object>} Selo renovado
     */
    async renovarSelo(seloId, novaValidade = null) {
        if (!this.auth || !this.auth.isLogado()) {
            throw new Error('Você precisa estar logado para renovar selo.');
        }

        try {
            // Buscar selo
            const { data: selo, error: findError } = await this.supabase
                .from('selos')
                .select('*')
                .eq('id', seloId)
                .single();

            if (findError || !selo) {
                throw new Error('Selo não encontrado.');
            }

            // Verificar se a empresa é a mesma
            const usuario = this.auth.getUsuarioLogado();
            if (selo.empresa_id !== usuario.id) {
                throw new Error('Você só pode renovar seu próprio selo.');
            }

            const validade = novaValidade || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await this.supabase
                .from('selos')
                .update({
                    status: 'ativo',
                    validade: validade,
                    renovado_em: new Date().toISOString()
                })
                .eq('id', seloId)
                .select()
                .single();

            if (error) {
                throw new Error('Erro ao renovar selo: ' + error.message);
            }

            console.log('✅ Selo renovado com sucesso!');
            return data;

        } catch (error) {
            console.error('❌ Erro ao renovar selo:', error);
            throw error;
        }
    }

    // ============================================================
    // LISTAR SELOS
    // ============================================================

    /**
     * Lista todos os selos ativos
     * @param {number} limite - Quantidade de selos
     * @param {number} offset - Paginação
     * @param {Object} filtros - Filtros opcionais
     * @returns {Promise<Array>} Lista de selos
     */
    async listarSelosAtivos(limite = 50, offset = 0, filtros = {}) {
        try {
            let query = this.supabase
                .from('selos')
                .select(`
                    *,
                    usuarios:nome,
                    usuarios:avatar,
                    usuarios:email
                `)
                .eq('status', 'ativo')
                .order('data_concessao', { ascending: false })
                .range(offset, offset + limite - 1);

            // Filtro por nível
            if (filtros.nivel) {
                query = query.eq('nivel', filtros.nivel);
            }

            // Filtro por busca (nome da empresa)
            if (filtros.busca) {
                // Como não podemos fazer join direto com busca, buscamos primeiro os usuários
                const { data: usuarios, error: userError } = await this.supabase
                    .from('usuarios')
                    .select('id')
                    .ilike('nome', `%${filtros.busca}%`);

                if (userError) {
                    console.error('Erro ao buscar usuários:', userError);
                } else if (usuarios && usuarios.length > 0) {
                    const ids = usuarios.map(u => u.id);
                    query = query.in('empresa_id', ids);
                } else {
                    return [];
                }
            }

            const { data, error } = await query;

            if (error) {
                throw new Error('Erro ao listar selos: ' + error.message);
            }

            return data || [];
        } catch (error) {
            console.error('❌ Erro ao listar selos:', error);
            return [];
        }
    }

    /**
     * Busca todos os selos (incluindo inativos/expirados) de uma empresa
     * @param {string} empresaId - ID da empresa
     * @returns {Promise<Array>} Histórico de selos
     */
    async getHistoricoSelos(empresaId) {
        try {
            const { data, error } = await this.supabase
                .from('selos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('data_concessao', { ascending: false });

            if (error) {
                throw new Error('Erro ao buscar histórico: ' + error.message);
            }

            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar histórico:', error);
            return [];
        }
    }

    // ============================================================
    // ESTATÍSTICAS DE SELOS
    // ============================================================

    /**
     * Busca estatísticas sobre os selos
     * @returns {Promise<Object>} Estatísticas
     */
    async getEstatisticasSelos() {
        try {
            // Total de selos ativos
            const { count: totalAtivos, error: err1 } = await this.supabase
                .from('selos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo');

            // Total de selos por nível
            const { data: niveis, error: err2 } = await this.supabase
                .from('selos')
                .select('nivel')
                .eq('status', 'ativo');

            const contagemNiveis = {
                bronze: 0,
                prata: 0,
                ouro: 0
            };

            if (niveis) {
                niveis.forEach(s => {
                    if (contagemNiveis[s.nivel] !== undefined) {
                        contagemNiveis[s.nivel]++;
                    }
                });
            }

            // Selos que vão expirar em 30 dias
            const trintaDias = new Date();
            trintaDias.setDate(trintaDias.getDate() + 30);

            const { count: expirando, error: err3 } = await this.supabase
                .from('selos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo')
                .lt('validade', trintaDias.toISOString());

            return {
                totalAtivos: totalAtivos || 0,
                porNivel: contagemNiveis,
                expirandoEm30Dias: expirando || 0
            };

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return {
                totalAtivos: 0,
                porNivel: { bronze: 0, prata: 0, ouro: 0 },
                expirandoEm30Dias: 0
            };
        }
    }

    // ============================================================
    // EMPRESAS COM SELO
    // ============================================================

    /**
     * Busca todas as empresas que possuem selo ativo
     * @param {number} limite - Quantidade de empresas
     * @param {number} offset - Paginação
     * @returns {Promise<Array>} Lista de empresas com selo
     */
    async getEmpresasComSelo(limite = 50, offset = 0) {
        try {
            const { data, error } = await this.supabase
                .from('selos')
                .select(`
                    empresa_id,
                    nivel,
                    data_concessao,
                    validade,
                    usuarios:nome,
                    usuarios:avatar,
                    usuarios:bio,
                    usuarios:empresa_nome
                `)
                .eq('status', 'ativo')
                .order('data_concessao', { ascending: false })
                .range(offset, offset + limite - 1);

            if (error) {
                throw new Error('Erro ao buscar empresas com selo: ' + error.message);
            }

            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar empresas com selo:', error);
            return [];
        }
    }

    // ============================================================
    // VALIDAÇÕES
    // ============================================================

    /**
     * Valida se uma empresa pode receber selo
     * @param {string} empresaId - ID da empresa
     * @returns {Promise<Object>} Resultado da validação
     */
    async validarEmpresaParaSelo(empresaId) {
        try {
            // Verificar se a empresa existe
            const { data: empresa, error: findError } = await this.supabase
                .from('usuarios')
                .select('*')
                .eq('id', empresaId)
                .single();

            if (findError || !empresa) {
                return { valido: false, motivo: 'Empresa não encontrada.' };
            }

            // Verificar se é uma empresa
            if (empresa.tipo !== 'empresa' && empresa.tipo !== 'empresa_selo') {
                return { valido: false, motivo: 'O usuário não é uma empresa.' };
            }

            // Verificar se já possui selo ativo
            const selo = await this.getSeloByEmpresa(empresaId, true);
            if (selo && selo.status === 'ativo') {
                return { valido: false, motivo: 'Empresa já possui selo ativo.' };
            }

            return { 
                valido: true, 
                motivo: 'Empresa apta para receber selo.',
                empresa: empresa
            };

        } catch (error) {
            console.error('❌ Erro ao validar empresa:', error);
            return { valido: false, motivo: 'Erro ao validar empresa.' };
        }
    }

    // ============================================================
    // MÉTODOS AUXILIARES
    // ============================================================

    /**
     * Formata o status do selo para exibição
     * @param {Object} selo - Objeto do selo
     * @returns {Object} Status formatado
     */
    formatarStatusSelo(selo) {
        if (!selo) {
            return {
                texto: 'Sem Selo',
                classe: 'inativo',
                icone: 'fa-times-circle',
                cor: '#999'
            };
        }

        const agora = new Date();
        const validade = new Date(selo.validade);

        if (selo.status === 'ativo' && validade > agora) {
            const diasRestantes = Math.ceil((validade - agora) / (1000 * 60 * 60 * 24));
            return {
                texto: `Ativo - ${selo.nivel.toUpperCase()} (${diasRestantes} dias)`,
                classe: 'ativo',
                icone: 'fa-check-circle',
                cor: '#2e7d32',
                diasRestantes
            };
        }

        if (selo.status === 'ativo' && validade <= agora) {
            return {
                texto: 'Expirado',
                classe: 'expirado',
                icone: 'fa-exclamation-circle',
                cor: '#c62828'
            };
        }

        if (selo.status === 'pendente') {
            return {
                texto: 'Aguardando Auditoria',
                classe: 'pendente',
                icone: 'fa-clock',
                cor: '#ffa726'
            };
        }

        return {
            texto: 'Inativo',
            classe: 'inativo',
            icone: 'fa-times-circle',
            cor: '#999'
        };
    }

    /**
     * Gera um resumo do selo para exibição
     * @param {Object} selo - Objeto do selo
     * @returns {Object} Resumo formatado
     */
    resumirSelo(selo) {
        if (!selo) {
            return {
                temSelo: false,
                nivel: null,
                status: 'sem_selo',
                validade: null,
                icone: '🏢'
            };
        }

        const statusInfo = this.formatarStatusSelo(selo);

        return {
            temSelo: true,
            nivel: selo.nivel,
            status: statusInfo.classe,
            statusTexto: statusInfo.texto,
            validade: selo.validade,
            dataConcessao: selo.data_concessao,
            certificacoes: selo.certificacoes || [],
            metas: selo.metas || [],
            icone: selo.nivel === 'ouro' ? '🏅' : selo.nivel === 'prata' ? '🥈' : '🥉'
        };
    }
}

// ============================================================
// INICIALIZAR
// ============================================================

let seloService = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase !== 'undefined' && typeof auth !== 'undefined') {
        console.log('🏅 SeloService iniciando...');
        seloService = new SeloService();
        window.selo = seloService;
        console.log('✅ SeloService disponível globalmente!');
    } else {
        console.warn('⚠️ Supabase ou Auth não disponíveis. Aguardando...');
        
        setTimeout(() => {
            if (typeof supabase !== 'undefined' && typeof auth !== 'undefined' && !seloService) {
                seloService = new SeloService();
                window.selo = seloService;
                console.log('✅ SeloService disponível globalmente!');
            }
        }, 1000);
    }
});

console.log('📦 selo-supabase.js carregado!');

