// ============================================================
// notificacoes-supabase.js - Notificações com Supabase
// Espelha 1:1 o serviço usado no app (src/services/notificacoes.ts):
// mesma tabela `notificacoes`, mesmas colunas, mesmo canal realtime.
// ============================================================

class NotificacoesService {
    constructor() {
        this.supabase = window.supabase;
        this.auth = window.auth;
        this.canal = null;
        this.inicializado = false;
        this.init();
    }

    async init() {
        if (!this.supabase) {
            console.error('❌ Supabase não disponível (notificações)');
            return;
        }
        this.inicializado = true;
        console.log('✅ NotificacoesService inicializado!');
    }

    // ============================================================
    // MAPEAMENTO: linha da tabela -> formato usado na UI
    // ============================================================
    mapearNotificacao(linha) {
        return {
            id: linha.id,
            tipo: linha.tipo, // 'curtida' | 'comentario' | 'status_denuncia' | 'selo_empresa'
            mensagem: linha.mensagem,
            lida: linha.lida,
            postId: linha.post_id,
            empresaId: linha.empresa_id,
            criadoEm: linha.criado_em,
        };
    }

    async buscarNotificacoes(usuarioId, limite = 50) {
        try {
            const { data, error } = await this.supabase
                .from('notificacoes')
                .select('*')
                .eq('destinatario_id', usuarioId)
                .order('criado_em', { ascending: false })
                .limit(limite);

            if (error) throw new Error('Erro ao buscar notificações: ' + error.message);
            return (data || []).map((linha) => this.mapearNotificacao(linha));
        } catch (error) {
            console.error('❌ Erro ao buscar notificações:', error);
            return [];
        }
    }

    async contarNaoLidas(usuarioId) {
        try {
            const { count, error } = await this.supabase
                .from('notificacoes')
                .select('*', { count: 'exact', head: true })
                .eq('destinatario_id', usuarioId)
                .eq('lida', false);

            if (error) throw new Error('Erro ao contar notificações: ' + error.message);
            return count || 0;
        } catch (error) {
            console.error('❌ Erro ao contar notificações não lidas:', error);
            return 0;
        }
    }

    async marcarComoLida(notificacaoId) {
        try {
            const { error } = await this.supabase
                .from('notificacoes')
                .update({ lida: true })
                .eq('id', notificacaoId);
            if (error) throw new Error('Erro ao marcar notificação: ' + error.message);
            return true;
        } catch (error) {
            console.error('❌ Erro ao marcar notificação como lida:', error);
            return false;
        }
    }

    async marcarTodasComoLidas(usuarioId) {
        try {
            const { error } = await this.supabase
                .from('notificacoes')
                .update({ lida: true })
                .eq('destinatario_id', usuarioId)
                .eq('lida', false);
            if (error) throw new Error('Erro ao marcar notificações: ' + error.message);
            return true;
        } catch (error) {
            console.error('❌ Erro ao marcar todas como lidas:', error);
            return false;
        }
    }

    // ============================================================
    // REALTIME - mesmo padrão do app (canal por usuário/instância)
    // ============================================================
    ouvirNovas(usuarioId, aoReceber) {
        if (!this.supabase) return () => {};

        const nomeCanal = `notificacoes:${usuarioId}:${Date.now()}`;
        this.canal = this.supabase
            .channel(nomeCanal)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificacoes',
                    filter: `destinatario_id=eq.${usuarioId}`,
                },
                (payload) => aoReceber(this.mapearNotificacao(payload.new))
            )
            .subscribe();

        return () => {
            if (this.canal) {
                this.supabase.removeChannel(this.canal);
                this.canal = null;
            }
        };
    }
}

// ============================================================
// INICIALIZAR (mesmo padrão de retry usado no feed-supabase.js)
// ============================================================
let notificacoesService = null;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof supabase !== 'undefined') {
        notificacoesService = new NotificacoesService();
        window.notificacoesService = notificacoesService;
        console.log('✅ NotificacoesService disponível globalmente!');
    } else {
        setTimeout(() => {
            if (typeof supabase !== 'undefined' && !notificacoesService) {
                notificacoesService = new NotificacoesService();
                window.notificacoesService = notificacoesService;
                console.log('✅ NotificacoesService disponível globalmente!');
            }
        }, 1000);
    }
});

console.log('📦 notificacoes-supabase.js carregado!');