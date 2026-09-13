// ============================================================
// db-supabase.js - Operações CRUD Genéricas com Supabase
// ============================================================
// Este arquivo fornece funções genéricas para operações CRUD:
// - Criar registros
// - Buscar registros
// - Atualizar registros
// - Deletar registros
// - Buscar com filtros
// - Paginação
// ============================================================

class DatabaseService {
    constructor() {
        this.supabase = window.supabase;
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

            console.log('🗄️ Inicializando DatabaseService...');
            this.inicializado = true;
            console.log('✅ DatabaseService inicializado!');
        } catch (error) {
            console.error('❌ Erro ao inicializar DatabaseService:', error);
        }
    }

    // ============================================================
    // CRUD GENÉRICO
    // ============================================================

    /**
     * Insere um novo registro em uma tabela
     * @param {string} tabela - Nome da tabela
     * @param {Object} dados - Dados a serem inseridos
     * @param {Object} opcoes - Opções adicionais
     * @param {boolean} opcoes.retornar - Retornar o registro inserido?
     * @returns {Promise<Object>} Registro inserido
     */
    async inserir(tabela, dados, opcoes = { retornar: true }) {
        try {
            let query = this.supabase.from(tabela).insert([dados]);

            if (opcoes.retornar) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Erro ao inserir em ${tabela}: ${error.message}`);
            }

            return opcoes.retornar ? data?.[0] : { success: true };
        } catch (error) {
            console.error(`❌ Erro ao inserir em ${tabela}:`, error);
            throw error;
        }
    }

    /**
     * Busca registros em uma tabela com filtros opcionais
     * @param {string} tabela - Nome da tabela
     * @param {Object} filtros - Filtros para a busca
     * @param {Object} opcoes - Opções adicionais
     * @param {Array} opcoes.select - Campos a serem selecionados
     * @param {string} opcoes.ordenar - Campo para ordenação
     * @param {boolean} opcoes.desc - Ordenar decrescente?
     * @param {number} opcoes.limite - Limite de resultados
     * @param {number} opcoes.offset - Paginação
     * @returns {Promise<Array>} Lista de registros
     */
    async buscar(tabela, filtros = {}, opcoes = {}) {
        try {
            let query = this.supabase.from(tabela).select(opcoes.select || '*');

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string' && value.includes('%')) {
                        // LIKE (busca parcial)
                        query = query.ilike(key, value);
                    } else if (Array.isArray(value)) {
                        // IN
                        query = query.in(key, value);
                    } else {
                        // Igualdade
                        query = query.eq(key, value);
                    }
                }
            }

            // Ordenação
            if (opcoes.ordenar) {
                query = query.order(opcoes.ordenar, { ascending: !opcoes.desc });
            }

            // Paginação
            if (opcoes.limite) {
                query = query.limit(opcoes.limite);
            }

            if (opcoes.offset) {
                query = query.range(opcoes.offset, opcoes.offset + (opcoes.limite || 10) - 1);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Erro ao buscar em ${tabela}: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error(`❌ Erro ao buscar em ${tabela}:`, error);
            return [];
        }
    }

    /**
     * Busca um único registro em uma tabela
     * @param {string} tabela - Nome da tabela
     * @param {Object} filtros - Filtros para a busca
     * @param {Object} opcoes - Opções adicionais
     * @param {Array} opcoes.select - Campos a serem selecionados
     * @returns {Promise<Object|null>} Registro encontrado ou null
     */
    async buscarUm(tabela, filtros = {}, opcoes = {}) {
        try {
            let query = this.supabase.from(tabela).select(opcoes.select || '*');

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    query = query.eq(key, value);
                }
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                throw new Error(`Erro ao buscar em ${tabela}: ${error.message}`);
            }

            return data || null;
        } catch (error) {
            console.error(`❌ Erro ao buscar em ${tabela}:`, error);
            return null;
        }
    }

    /**
     * Busca um registro pelo ID
     * @param {string} tabela - Nome da tabela
     * @param {string|number} id - ID do registro
     * @param {Object} opcoes - Opções adicionais
     * @param {Array} opcoes.select - Campos a serem selecionados
     * @returns {Promise<Object|null>} Registro encontrado ou null
     */
    async buscarPorId(tabela, id, opcoes = {}) {
        return await this.buscarUm(tabela, { id: id }, opcoes);
    }

    /**
     * Atualiza registros em uma tabela
     * @param {string} tabela - Nome da tabela
     * @param {Object} dados - Dados a serem atualizados
     * @param {Object} filtros - Filtros para encontrar os registros
     * @param {Object} opcoes - Opções adicionais
     * @param {boolean} opcoes.retornar - Retornar os registros atualizados?
     * @returns {Promise<Object>} Registros atualizados
     */
    async atualizar(tabela, dados, filtros = {}, opcoes = { retornar: true }) {
        try {
            let query = this.supabase.from(tabela).update(dados);

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    query = query.eq(key, value);
                }
            }

            if (opcoes.retornar) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Erro ao atualizar em ${tabela}: ${error.message}`);
            }

            return opcoes.retornar ? data || [] : { success: true };
        } catch (error) {
            console.error(`❌ Erro ao atualizar em ${tabela}:`, error);
            throw error;
        }
    }

    /**
     * Atualiza um registro pelo ID
     * @param {string} tabela - Nome da tabela
     * @param {string|number} id - ID do registro
     * @param {Object} dados - Dados a serem atualizados
     * @param {Object} opcoes - Opções adicionais
     * @param {boolean} opcoes.retornar - Retornar o registro atualizado?
     * @returns {Promise<Object>} Registro atualizado
     */
    async atualizarPorId(tabela, id, dados, opcoes = { retornar: true }) {
        const result = await this.atualizar(tabela, dados, { id: id }, opcoes);
        return opcoes.retornar ? result?.[0] : result;
    }

    /**
     * Deleta registros de uma tabela
     * @param {string} tabela - Nome da tabela
     * @param {Object} filtros - Filtros para encontrar os registros
     * @param {Object} opcoes - Opções adicionais
     * @param {boolean} opcoes.retornar - Retornar os registros deletados?
     * @returns {Promise<Object>} Registros deletados
     */
    async deletar(tabela, filtros = {}, opcoes = { retornar: false }) {
        try {
            let query = this.supabase.from(tabela).delete();

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    query = query.eq(key, value);
                }
            }

            if (opcoes.retornar) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Erro ao deletar em ${tabela}: ${error.message}`);
            }

            return opcoes.retornar ? data || [] : { success: true };
        } catch (error) {
            console.error(`❌ Erro ao deletar em ${tabela}:`, error);
            throw error;
        }
    }

    /**
     * Deleta um registro pelo ID
     * @param {string} tabela - Nome da tabela
     * @param {string|number} id - ID do registro
     * @param {Object} opcoes - Opções adicionais
     * @param {boolean} opcoes.retornar - Retornar o registro deletado?
     * @returns {Promise<Object>} Registro deletado
     */
    async deletarPorId(tabela, id, opcoes = { retornar: false }) {
        const result = await this.deletar(tabela, { id: id }, opcoes);
        return opcoes.retornar ? result?.[0] : result;
    }

    // ============================================================
    // CONTAGEM
    // ============================================================

    /**
     * Conta registros em uma tabela com filtros
     * @param {string} tabela - Nome da tabela
     * @param {Object} filtros - Filtros para a contagem
     * @returns {Promise<number>} Número de registros
     */
    async contar(tabela, filtros = {}) {
        try {
            let query = this.supabase.from(tabela).select('*', { count: 'exact', head: true });

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string' && value.includes('%')) {
                        query = query.ilike(key, value);
                    } else if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            }

            const { count, error } = await query;

            if (error) {
                throw new Error(`Erro ao contar em ${tabela}: ${error.message}`);
            }

            return count || 0;
        } catch (error) {
            console.error(`❌ Erro ao contar em ${tabela}:`, error);
            return 0;
        }
    }

    /**
     * Verifica se existe algum registro com os filtros
     * @param {string} tabela - Nome da tabela
     * @param {Object} filtros - Filtros para verificação
     * @returns {Promise<boolean>} true se existir
     */
    async existe(tabela, filtros = {}) {
        const count = await this.contar(tabela, filtros);
        return count > 0;
    }

    // ============================================================
    // OPERAÇÕES ESPECIAIS
    // ============================================================

    /**
     * Busca registros com relacionamento (join)
     * @param {string} tabela - Nome da tabela principal
     * @param {Object} relacionamentos - Relacionamentos { campo: 'tabela_relacionada(campos)' }
     * @param {Object} filtros - Filtros para a busca
     * @param {Object} opcoes - Opções adicionais
     * @returns {Promise<Array>} Registros com relacionamentos
     */
    async buscarComRelacionamento(tabela, relacionamentos = {}, filtros = {}, opcoes = {}) {
        try {
            // Construir a string de select com relacionamentos
            let selectStr = '*';
            
            if (Object.keys(relacionamentos).length > 0) {
                const rels = Object.entries(relacionamentos)
                    .map(([campo, rel]) => `${campo}:${rel}`)
                    .join(',');
                selectStr = `*, ${rels}`;
            }

            let query = this.supabase.from(tabela).select(selectStr);

            // Aplicar filtros
            for (const [key, value] of Object.entries(filtros)) {
                if (value !== undefined && value !== null && value !== '') {
                    query = query.eq(key, value);
                }
            }

            // Ordenação
            if (opcoes.ordenar) {
                query = query.order(opcoes.ordenar, { ascending: !opcoes.desc });
            }

            // Paginação
            if (opcoes.limite) {
                query = query.limit(opcoes.limite);
            }

            if (opcoes.offset) {
                query = query.range(opcoes.offset, opcoes.offset + (opcoes.limite || 10) - 1);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Erro ao buscar em ${tabela}: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error(`❌ Erro ao buscar em ${tabela}:`, error);
            return [];
        }
    }

    /**
     * Executa uma query raw (SQL) - apenas para operações complexas
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise<Array>} Resultado da query
     */
    async queryRaw(sql, params = []) {
        try {
            const { data, error } = await this.supabase.rpc('exec_sql', {
                query: sql,
                params: params
            });

            if (error) {
                throw new Error(`Erro ao executar query: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('❌ Erro ao executar query raw:', error);
            return [];
        }
    }

    // ============================================================
    // UTILITÁRIOS
    // ============================================================

    /**
     * Constrói filtros a partir de um objeto
     * @param {Object} filtros - Filtros
     * @param {Array} camposPermitidos - Campos permitidos para filtro
     * @returns {Object} Filtros sanitizados
     */
    construirFiltros(filtros, camposPermitidos = []) {
        const sanitizados = {};

        for (const [key, value] of Object.entries(filtros)) {
            if (value !== undefined && value !== null && value !== '') {
                // Verificar se o campo é permitido
                if (camposPermitidos.length === 0 || camposPermitidos.includes(key)) {
                    sanitizados[key] = value;
                }
            }
        }

        return sanitizados;
    }

    /**
     * Sanitiza dados antes de inserir/atualizar
     * @param {Object} dados - Dados a serem sanitizados
     * @param {Array} camposPermitidos - Campos permitidos
     * @returns {Object} Dados sanitizados
     */
    sanitizarDados(dados, camposPermitidos = []) {
        const sanitizados = {};

        for (const [key, value] of Object.entries(dados)) {
            if (value !== undefined && value !== null) {
                // Verificar se o campo é permitido
                if (camposPermitidos.length === 0 || camposPermitidos.includes(key)) {
                    // Remover espaços extras de strings
                    if (typeof value === 'string') {
                        sanitizados[key] = value.trim();
                    } else {
                        sanitizados[key] = value;
                    }
                }
            }
        }

        return sanitizados;
    }

    /**
     * Gera um ID único (para uso em testes)
     * @returns {string} ID único
     */
    gerarIdUnico() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}

// ============================================================
// INICIALIZAR
// ============================================================

let dbService = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase !== 'undefined') {
        console.log('🗄️ DatabaseService iniciando...');
        dbService = new DatabaseService();
        window.db = dbService;
        console.log('✅ DatabaseService disponível globalmente!');
    } else {
        console.warn('⚠️ Supabase não disponível. Aguardando...');
        
        setTimeout(() => {
            if (typeof supabase !== 'undefined' && !dbService) {
                dbService = new DatabaseService();
                window.db = dbService;
                console.log('✅ DatabaseService disponível globalmente!');
            }
        }, 1000);
    }
});

console.log('📦 db-supabase.js carregado!');

