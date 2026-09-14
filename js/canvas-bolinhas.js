// ============================================================
// canvas-bolinhas.js - Efeito de bolinhas magnéticas (seção educação)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('canvas-bolinhas');
    const secao = document.getElementById('secao-educacao-interativa');
    if (!canvas || !secao) return;

    const ctx = canvas.getContext('2d');

    let bolinhas = [];
    let mouse = { x: -1000, y: -1000 };

    const espacamento = 45;
    const raioBase = 2;
    const raioMax = 5;
    const campoInfluencia = 220;
    const amplitudeMovimento = 3;

    function inicializarCanvas() {
        canvas.width = secao.offsetWidth;
        canvas.height = secao.offsetHeight;
        bolinhas = [];

        for (let x = espacamento / 2; x < canvas.width; x += espacamento) {
            for (let y = espacamento / 2; y < canvas.height; y += espacamento) {
                bolinhas.push({
                    origX: x,
                    origY: y,
                    x: x,
                    y: y,
                    dx: 0,
                    dy: 0,
                    raioAtual: raioBase,
                    angulo: Math.random() * Math.PI * 2,
                    velocidade: 0.01 + Math.random() * 0.015,
                });
            }
        }
    }

    secao.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    secao.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    window.addEventListener('resize', inicializarCanvas);

    function animar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(64, 122, 108, 0.4)';

        bolinhas.forEach((bolinha) => {
            bolinha.angulo += bolinha.velocidade;
            const flutuacaoX = Math.sin(bolinha.angulo) * amplitudeMovimento;
            const flutuacaoY = Math.cos(bolinha.angulo) * amplitudeMovimento;

            let alvoDx = 0;
            let alvoDy = 0;
            let alvoRaio = raioBase;

            if (mouse.x !== -1000) {
                const distMouseX = mouse.x - bolinha.origX;
                const distMouseY = mouse.y - bolinha.origY;
                const distanciaMouse = Math.sqrt(distMouseX * distMouseX + distMouseY * distMouseY);

                if (distanciaMouse < campoInfluencia) {
                    const forcaPuxao = 1 - distanciaMouse / campoInfluencia;
                    alvoDx = distMouseX * forcaPuxao * 0.4;
                    alvoDy = distMouseY * forcaPuxao * 0.4;
                    alvoRaio = raioBase + (raioMax - raioBase) * forcaPuxao;
                }
            }

            bolinha.dx += (alvoDx - bolinha.dx) * 0.05;
            bolinha.dy += (alvoDy - bolinha.dy) * 0.05;
            bolinha.raioAtual += (alvoRaio - bolinha.raioAtual) * 0.1;

            bolinha.x = bolinha.origX + flutuacaoX + bolinha.dx;
            bolinha.y = bolinha.origY + flutuacaoY + bolinha.dy;

            ctx.beginPath();
            ctx.arc(bolinha.x, bolinha.y, bolinha.raioAtual, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animar);
    }

    inicializarCanvas();
    animar();
});