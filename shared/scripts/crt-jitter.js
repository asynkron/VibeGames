// Shared CRT jitter helper. Elements with `data-crt-jitter` will gently wobble
// to keep the illusion alive. Provide optional `data-crt-jitter-smoothing`
// (0..0.99) and `data-crt-jitter-axis="xy"` attributes to fine-tune.
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const parseAmount = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function applyJitter(el) {
  if (el.__crtJitterLoop) return;

  const amplitude = parseAmount(el.getAttribute('data-crt-jitter'), 0.4);
  const smoothing = clamp(parseAmount(el.getAttribute('data-crt-jitter-smoothing'), 0.85), 0, 0.99);
  const axis = (el.getAttribute('data-crt-jitter-axis') || 'y').toLowerCase();

  let offsetX = 0;
  let offsetY = 0;

  function frame() {
    if (!el.isConnected || PREFERS_REDUCED_MOTION.matches) {
      el.style.setProperty('--crt-jitter-x', '0px');
      el.style.setProperty('--crt-jitter-y', '0px');
      el.__crtJitterLoop = null;
      return;
    }

    const jitterX = axis.includes('x') ? (Math.random() - 0.5) * amplitude : 0;
    const jitterY = axis.includes('y') ? (Math.random() - 0.5) * amplitude : 0;

    offsetX = offsetX * smoothing + jitterX * (1 - smoothing);
    offsetY = offsetY * smoothing + jitterY * (1 - smoothing);

    el.style.setProperty('--crt-jitter-x', `${offsetX.toFixed(3)}px`);
    el.style.setProperty('--crt-jitter-y', `${offsetY.toFixed(3)}px`);

    el.__crtJitterLoop = requestAnimationFrame(frame);
  }

  el.__crtJitterLoop = requestAnimationFrame(frame);
}

function scan(root = document) {
  root.querySelectorAll('[data-crt-jitter]').forEach(applyJitter);
}

if (!PREFERS_REDUCED_MOTION.matches) {
  scan();
}

PREFERS_REDUCED_MOTION.addEventListener('change', (event) => {
  if (!event.matches) {
    scan();
  }
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node;
      if (element.matches?.('[data-crt-jitter]')) {
        applyJitter(element);
      }
      if (element.querySelectorAll) {
        scan(element);
      }
    });
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
