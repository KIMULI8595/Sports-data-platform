import { startApplication } from './main.js';
import { updateApiStatus } from './shell.js';

try {
  startApplication();
  void updateApiStatus();
} catch (error) {
  console.error('SPORTPULSE preview failed:', error);

  const root = document.getElementById('app');

  if (root) {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = 'Unable to start SPORTPULSE preview.';
    root.replaceChildren(message);
  }
}