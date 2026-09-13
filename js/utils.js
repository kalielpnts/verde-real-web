// ============================================================
// utils.js - Funções Utilitárias
// ============================================================
// Este arquivo contém funções auxiliares reutilizáveis:
// - Formatação de dados
// - Validações
// - Máscaras de input
// - Manipulação de arrays e objetos
// - Manipulação de strings
// - Utilitários de DOM
// ============================================================

// ============================================================
// 1. FORMATAÇÃO DE DADOS
// ============================================================

/**
 * Formata uma data para o formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @param {boolean} includeTime - Incluir hora?
 * @returns {string} Data formatada
 */
function formatarData(date, includeTime = true) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Data inválida';

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();

    if (includeTime) {
        const horas = String(d.getHours()).padStart(2, '0');
        const minutos = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }

    return `${dia}/${mes}/${ano}`;
}

/**
 * Formata uma data para o formato relativo (ex: "há 2 horas")
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data relativa
 */
function formatarDataRelativa(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Data inválida';

    const agora = new Date();
    const diff = agora - d;

    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    const semanas = Math.floor(dias / 7);
    const meses = Math.floor(dias / 30);
    const anos = Math.floor(dias / 365);

    if (segundos < 60) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    if (horas < 24) return `há ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias < 7) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
    if (semanas < 4) return `há ${semanas} semana${semanas > 1 ? 's' : ''}`;
    if (meses < 12) return `há ${meses} mês${meses > 1 ? 'es' : ''}`;
    return `há ${anos} ano${anos > 1 ? 's' : ''}`;
}

/**
 * Formata um número para o formato brasileiro
 * @param {number} number - Número a ser formatado
 * @param {number} decimals - Casas decimais
 * @returns {string} Número formatado
 */
function formatarNumero(number, decimals = 0) {
    if (isNaN(number)) return '0';
    return Number(number).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Formata um valor monetário para o formato brasileiro
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado (R$)
 */
function formatarMoeda(value) {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formata um texto para URL amigável (slug)
 * @param {string} text - Texto a ser convertido
 * @returns {string} Slug
 */
function criarSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Trunca um texto para um tamanho máximo
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Tamanho máximo
 * @param {string} suffix - Sufixo para textos truncados
 * @returns {string} Texto truncado
 */
function truncarTexto(text, maxLength = 100, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
}

/**
 * Capitaliza a primeira letra de cada palavra
 * @param {string} text - Texto a ser capitalizado
 * @returns {string} Texto capitalizado
 */
function capitalizeWords(text) {
    if (!text) return '';
    return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Remove acentos de uma string
 * @param {string} text - Texto com acentos
 * @returns {string} Texto sem acentos
 */
function removerAcentos(text) {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera uma string aleatória
 * @param {number} length - Tamanho da string
 * @returns {string} String aleatória
 */
function gerarStringAleatoria(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================================
// 2. VALIDAÇÕES
// ============================================================

/**
 * Valida se um email é válido
 * @param {string} email - Email a ser validado
 * @returns {boolean} true se válido
 */
function validarEmail(email) {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida se um CPF é válido
 * @param {string} cpf - CPF a ser validado (apenas números)
 * @returns {boolean} true se válido
 */
function validarCPF(cpf) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
}

/**
 * Valida se um CNPJ é válido
 * @param {string} cnpj - CNPJ a ser validado (apenas números)
 * @returns {boolean} true se válido
 */
function validarCNPJ(cnpj) {
    if (!cnpj) return false;
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = 12;
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = 0; i < tamanho; i++) {
        soma += parseInt(cnpj.charAt(i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let resto = soma % 11;
    let digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== parseInt(cnpj.charAt(tamanho))) return false;

    tamanho = 13;
    soma = 0;
    pos = tamanho - 7;

    for (let i = 0; i < tamanho; i++) {
        soma += parseInt(cnpj.charAt(i)) * pos--;
        if (pos < 2) pos = 9;
    }

    resto = soma % 11;
    digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== parseInt(cnpj.charAt(tamanho))) return false;

    return true;
}

/**
 * Valida se um telefone é válido (formato brasileiro)
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean} true se válido
 */
function validarTelefone(phone) {
    if (!phone) return false;
    phone = phone.replace(/[^\d]/g, '');
    return phone.length >= 10 && phone.length <= 11;
}

/**
 * Valida se uma URL é válida
 * @param {string} url - URL a ser validada
 * @returns {boolean} true se válida
 */
function validarURL(url) {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Valida se uma senha é forte
 * @param {string} senha - Senha a ser validada
 * @param {number} minLength - Tamanho mínimo
 * @returns {object} { valida, forca, mensagem }
 */
function validarSenha(senha, minLength = 6) {
    const resultado = {
        valida: false,
        forca: 0,
        mensagem: ''
    };

    if (!senha || senha.length < minLength) {
        resultado.mensagem = `A senha deve ter pelo menos ${minLength} caracteres.`;
        return resultado;
    }

    let forca = 0;
    if (senha.length >= 6) forca++;
    if (senha.length >= 10) forca++;
    if (/[A-Z]/.test(senha)) forca++;
    if (/[0-9]/.test(senha)) forca++;
    if (/[^A-Za-z0-9]/.test(senha)) forca++;

    resultado.forca = Math.min(Math.floor(forca / 2) + 1, 3);
    resultado.valida = resultado.forca >= 2;

    const niveis = ['fraca', 'media', 'forte'];
    resultado.mensagem = `Senha ${niveis[resultado.forca - 1] || 'fraca'}`;

    return resultado;
}

// ============================================================
// 3. MÁSCARAS DE INPUT
// ============================================================

/**
 * Aplica máscara de CPF (XXX.XXX.XXX-XX)
 * @param {string} value - Valor a ser mascarado
 * @returns {string} CPF mascarado
 */
function mascaraCPF(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    if (value.length <= 3) return value;
    if (value.length <= 6) return value.replace(/(\d{3})(\d+)/, '$1.$2');
    if (value.length <= 9) return value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

/**
 * Aplica máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} value - Valor a ser mascarado
 * @returns {string} CNPJ mascarado
 */
function mascaraCNPJ(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    if (value.length <= 2) return value;
    if (value.length <= 5) return value.replace(/(\d{2})(\d+)/, '$1.$2');
    if (value.length <= 8) return value.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    if (value.length <= 12) return value.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
}

/**
 * Aplica máscara de telefone ((XX) XXXXX-XXXX)
 * @param {string} value - Valor a ser mascarado
 * @returns {string} Telefone mascarado
 */
function mascaraTelefone(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    if (value.length <= 2) return value;
    if (value.length <= 7) return value.replace(/(\d{2})(\d+)/, '($1) $2');
    if (value.length <= 10) return value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    return value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}

/**
 * Aplica máscara de CEP (XXXXX-XXX)
 * @param {string} value - Valor a ser mascarado
 * @returns {string} CEP mascarado
 */
function mascaraCEP(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    if (value.length <= 5) return value;
    return value.replace(/(\d{5})(\d+)/, '$1-$2');
}

/**
 * Aplica máscara de placa de carro (ABC-1234 ou ABC1D23)
 * @param {string} value - Valor a ser mascarado
 * @returns {string} Placa mascarada
 */
function mascaraPlaca(value) {
    if (!value) return '';
    value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 3) return value;
    if (value.length <= 7) {
        const letras = value.substring(0, 3);
        const numeros = value.substring(3);
        return `${letras}-${numeros}`;
    }
    return value.substring(0, 8);
}

// ============================================================
// 4. MANIPULAÇÃO DE ARRAYS E OBJETOS
// ============================================================

/**
 * Agrupa um array por uma chave
 * @param {Array} array - Array a ser agrupado
 * @param {string} key - Chave para agrupamento
 * @returns {Object} Objeto agrupado
 */
function groupBy(array, key) {
    if (!array || !Array.isArray(array)) return {};
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Ordena um array por uma chave
 * @param {Array} array - Array a ser ordenado
 * @param {string} key - Chave para ordenação
 * @param {boolean} ascending - Ordem crescente?
 * @returns {Array} Array ordenado
 */
function sortBy(array, key, ascending = true) {
    if (!array || !Array.isArray(array)) return [];
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (typeof aVal === 'string') {
            return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return ascending ? aVal - bVal : bVal - aVal;
    });
}

/**
 * Remove duplicatas de um array
 * @param {Array} array - Array com possíveis duplicatas
 * @param {string} key - Chave para identificar duplicatas
 * @returns {Array} Array sem duplicatas
 */
function uniqueBy(array, key) {
    if (!array || !Array.isArray(array)) return [];
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

/**
 * Filtra um array por termos de busca
 * @param {Array} array - Array a ser filtrado
 * @param {string} searchTerm - Termo de busca
 * @param {Array} keys - Chaves a serem pesquisadas
 * @returns {Array} Array filtrado
 */
function filtrarPorTexto(array, searchTerm, keys) {
    if (!array || !Array.isArray(array)) return [];
    if (!searchTerm) return array;
    
    const term = searchTerm.toLowerCase();
    return array.filter(item => {
        return keys.some(key => {
            const value = item[key];
            return value && String(value).toLowerCase().includes(term);
        });
    });
}

// ============================================================
// 5. UTILITÁRIOS DE DOM
// ============================================================

/**
 * Espera um elemento aparecer no DOM
 * @param {string} selector - Seletor do elemento
 * @param {number} timeout - Timeout em ms
 * @returns {Promise<Element>}
 */
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Elemento "${selector}" não encontrado após ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Rola a página suavemente para um elemento
 * @param {string|Element} target - Seletor ou elemento alvo
 * @param {number} offset - Deslocamento em pixels
 */
function scrollToElement(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Copia texto para a área de transferência
 * @param {string} text - Texto a ser copiado
 * @returns {Promise<boolean>} true se copiado com sucesso
 */
async function copyToClipboard(text) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback para navegadores antigos
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}

/**
 * Obtém o valor de um parâmetro da URL
 * @param {string} param - Nome do parâmetro
 * @returns {string|null} Valor do parâmetro
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Redireciona para uma URL com parâmetros
 * @param {string} url - URL base
 * @param {object} params - Parâmetros a serem adicionados
 */
function redirectWithParams(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const separator = url.includes('?') ? '&' : '?';
    window.location.href = `${url}${separator}${queryString}`;
}

// ============================================================
// 6. UTILITÁRIOS DE ARMAZENAMENTO
// ============================================================

/**
 * Salva dados no localStorage com validação de tamanho
 * @param {string} key - Chave de armazenamento
 * @param {*} data - Dados a serem salvos
 * @returns {boolean} true se salvo com sucesso
 */
function salvarLocalStorage(key, data) {
    try {
        const json = JSON.stringify(data);
        localStorage.setItem(key, json);
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

/**
 * Recupera dados do localStorage
 * @param {string} key - Chave de armazenamento
 * @param {*} defaultValue - Valor padrão se não encontrado
 * @returns {*} Dados recuperados
 */
function recuperarLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Erro ao recuperar do localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove dados do localStorage
 * @param {string} key - Chave de armazenamento
 * @returns {boolean} true se removido com sucesso
 */
function removerLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
        return false;
    }
}

// ============================================================
// 7. EXPORTAÇÃO PARA USO GLOBAL
// ============================================================

// Funções de formatação
window.formatarData = formatarData;
window.formatarDataRelativa = formatarDataRelativa;
window.formatarNumero = formatarNumero;
window.formatarMoeda = formatarMoeda;
window.criarSlug = criarSlug;
window.truncarTexto = truncarTexto;
window.capitalizeWords = capitalizeWords;
window.removerAcentos = removerAcentos;
window.gerarStringAleatoria = gerarStringAleatoria;

// Funções de validação
window.validarEmail = validarEmail;
window.validarCPF = validarCPF;
window.validarCNPJ = validarCNPJ;
window.validarTelefone = validarTelefone;
window.validarURL = validarURL;
window.validarSenha = validarSenha;

// Funções de máscara
window.mascaraCPF = mascaraCPF;
window.mascaraCNPJ = mascaraCNPJ;
window.mascaraTelefone = mascaraTelefone;
window.mascaraCEP = mascaraCEP;
window.mascaraPlaca = mascaraPlaca;

// Funções de array/objeto
window.groupBy = groupBy;
window.sortBy = sortBy;
window.uniqueBy = uniqueBy;
window.filtrarPorTexto = filtrarPorTexto;

// Funções de DOM
window.waitForElement = waitForElement;
window.scrollToElement = scrollToElement;
window.copyToClipboard = copyToClipboard;
window.getUrlParam = getUrlParam;
window.redirectWithParams = redirectWithParams;

// Funções de armazenamento
window.salvarLocalStorage = salvarLocalStorage;
window.recuperarLocalStorage = recuperarLocalStorage;
window.removerLocalStorage = removerLocalStorage;

console.log('📦 utils.js carregado com sucesso!');

