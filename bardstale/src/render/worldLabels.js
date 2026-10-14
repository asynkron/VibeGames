import * as THREE from 'three';

/** Readable signs share one canvas style across services and travel destinations. */
export function createWorldLabel(name, color, { subtitle = '', width = 1.05 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = subtitle ? 220 : 160;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(22, 29, 34, 0.9)';
  context.beginPath();
  context.roundRect(3, 3, canvas.width - 6, canvas.height - 9, 22);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f1eee5';
  let fontSize = 55;
  context.font = `500 ${fontSize}px Georgia, serif`;
  while (context.measureText(name).width > 710 && fontSize > 36) {
    context.font = `500 ${--fontSize}px Georgia, serif`;
  }
  context.fillText(name, 384, subtitle ? 74 : 76, 710);
  if (subtitle) {
    context.fillStyle = color;
    context.font = '500 37px Georgia, serif';
    context.fillText(subtitle, 384, 158, 710);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = `world-label-${name}`;
  sprite.scale.set(width, width * canvas.height / canvas.width, 1);
  return { sprite, texture, material };
}
