import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createNotificationProviders, createNotificationWorker } from './notifications.js';
import { createEnquiryStore } from './store.js';

const config = readConfig();
const store = createEnquiryStore(config.databasePath);
const providers = createNotificationProviders(config.notifications);
const notifications = createNotificationWorker({ store, providers });
const app = createApp({
  store, notifications, trustProxyHops: config.trustProxyHops,
  staticDirectory: fileURLToPath(new URL('../dist', import.meta.url)),
});
const server = app.listen(config.port, '0.0.0.0', () => {
  console.info(`Goodspeed Real Estate backend listening on port ${config.port}.`);
  console.info(`Email notifications: ${providers.email ? 'configured' : 'awaiting configuration'}. SMS notifications: ${providers.sms ? 'configured' : 'awaiting configuration'}.`);
  notifications.start();
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await new Promise((resolve) => server.close(resolve));
  await notifications.stop();
  store.close();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
server.on('error', async () => {
  console.error('Backend could not start. Check that its port is available.');
  await notifications.stop();
  store.close();
  process.exitCode = 1;
});
