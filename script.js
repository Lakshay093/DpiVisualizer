// Helpers
const dpiInput = document.getElementById('dpi');
const sensInput = document.getElementById('sens');
const inchSlider = document.getElementById('inches');
const edpiEl = document.getElementById('edpi');
const inchValEl = document.getElementById('inchVal');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

// Crisp canvas on HiDPI displays
function fitCanvas(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas(canvas);
window.addEventListener('resize', () => fitCanvas(canvas));

// Visualization parameters
const padding = 28; // inner padding
const baseX = padding + 20; // start x
const midY = () => canvas.height / (window.devicePixelRatio || 1) / 2;
const maxDrawWidth = () => (canvas.width / (window.devicePixelRatio || 1)) - padding * 2 - 40;

function getState() {
    const dpi = Math.max(100, Math.min(6400, parseFloat(dpiInput.value) || 0));
    const sens = Math.max(0.01, Math.min(5, parseFloat(sensInput.value) || 0));
    const inches = parseFloat(inchSlider.value);
    const edpi = dpi * sens;
    return {
        dpi,
        sens,
        inches,
        edpi
    };
}

function setState({
    dpi,
    sens
}) {
    if (dpi != null) dpiInput.value = dpi;
    if (sens != null) sensInput.value = sens;
    render();
}

function edpiToLength(edpi, inches) {
    // Map eDPI*inches to a drawable length. We auto-scale to keep it on canvas.
    const units = edpi * Math.max(0, inches);
    // Choose a dynamic scale so 1600 eDPI × 2 inches ~ 85% width
    const target = 0.85 * maxDrawWidth();
    const refUnits = 1600 * 2; // reference high movement
    const scale = target / refUnits;
    return Math.min(units * scale, maxDrawWidth());
}

function drawCrosshair(x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
    ctx.restore();
}

function drawRuler() {
    const y = midY() + 70;
    const w = maxDrawWidth();
    ctx.save();
    ctx.strokeStyle = '#27305a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baseX, y);
    ctx.lineTo(baseX + w, y);
    ctx.stroke();
    // Ticks for 400/800/1600 eDPI at 1 inch
    const marks = [400, 800, 1600];
    marks.forEach(m => {
        const lx = baseX + edpiToLength(m, 1);
        ctx.strokeStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(lx, y - 8);
        ctx.lineTo(lx, y + 8);
        ctx.stroke();
        ctx.fillStyle = '#ffb4b4';
        ctx.font = '12px system-ui';
        ctx.fillText(m.toString(), lx - 12, y + 20);
    });
    ctx.restore();
}

function render(trail) {
    const {
        dpi,
        sens,
        inches,
        edpi
    } = getState();
    edpiEl.textContent = Math.round(edpi);
    inchValEl.textContent = inches.toFixed(1);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Title bar
    ctx.fillStyle = '#cfd6ff';
    ctx.font = '14px system-ui';
    ctx.fillText(`DPI ${dpi} × Sens ${sens} → eDPI ${Math.round(edpi)} | Inches ${inches.toFixed(1)}`, baseX, 28);

    // Baseline
    const y = midY();
    const endLen = edpiToLength(edpi, inches);
    ctx.strokeStyle = '#223059';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, y);
    ctx.lineTo(baseX + Math.max(40, endLen), y);
    ctx.stroke();

    // Start & End crosshairs
    drawCrosshair(baseX, y, '#6ee7ff');
    drawCrosshair(baseX + endLen, y, '#8b80ff');

    // Optional trail for animation
    if (trail && trail.length) {
        ctx.save();
        trail.forEach((x, i) => {
            const alpha = i / trail.length;
            ctx.globalAlpha = 0.15 + alpha * 0.35;
            drawCrosshair(x, y, '#8b80ff');
        });
        ctx.restore();
    }

    drawRuler();
}

// Animation
let animId = null;

function animateOneInch() {
    cancelAnimationFrame(animId);
    const {
        dpi,
        sens
    } = getState();
    const edpi = dpi * sens;
    const start = performance.now();
    const duration = 900; // ms
    const inches = 1; // always animate a 1-inch swipe
    const endLen = edpiToLength(edpi, inches);

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    const trail = [];

    function frame(t) {
        const dt = Math.min(1, (t - start) / duration);
        const eased = easeOutCubic(dt);
        const curInches = inches * eased;
        inchSlider.value = curInches.toFixed(2);
        const curLen = edpiToLength(edpi, curInches);
        trail.push(baseX + curLen);
        render(trail.slice(-20)); // keep last 20 positions for a smooth trail
        if (dt < 1) {
            animId = requestAnimationFrame(frame);
        }
    }
    animId = requestAnimationFrame(frame);
}

// UI wiring
[dpiInput, sensInput, inchSlider].forEach(el => {
    el.addEventListener('input', () => render());
    el.addEventListener('change', () => render());
});

document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
        const [dpi, sens] = btn.dataset.preset.split(',').map(Number);
        setState({
            dpi,
            sens
        });
    });
});

document.getElementById('animate').addEventListener('click', () => {
    animateOneInch();
});

document.getElementById('reset').addEventListener('click', () => {
    inchSlider.value = 1;
    render();
});

// Initial render
render();