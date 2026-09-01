const root = document.documentElement;
const hueStep = 0.1;
let hue = 120;

setInterval(() => {
  hue = (hue + hueStep) % 360;
  root.style.setProperty("--hue", hue.toFixed(2));
}, 1000);
