import { el } from '../store.js';
import { icon } from './icons.js';

let stack;
function ensureStack() {
  if (!stack) {
    stack = el('div', { class: 'toast-stack', id: 'toast-stack', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(stack);
  }
  return stack;
}

export function toast(message, { type = '', duration = 2600, iconName = 'check' } = {}) {
  const container = ensureStack();
  const node = el('div', { class: `toast ${type}`.trim() }, [
    el('span', { html: icon(iconName, { size: 15 }) }),
    el('span', {}, message),
  ]);
  container.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity 200ms ease';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 220);
  }, duration);
}
