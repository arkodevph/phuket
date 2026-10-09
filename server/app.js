import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { validateEnquiry } from './validation.js';

export function createApp({ store, notifications, staticDirectory, trustProxyHops = 0, rateLimitOptions = {}, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  app.use('/api', (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

  app.post('/api/enquiries', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many enquiries. Please try again later or call 0477 067 457.' },
    ...rateLimitOptions,
  }), (request, response, next) => {
    if (!request.is('application/json')) return response.status(415).json({ message: 'Please submit your enquiry as JSON.' });
    if (request.get('sec-fetch-site') === 'cross-site') return response.status(403).json({ message: 'Please submit your enquiry through this website.' });
    next();
  }, express.json({ limit: '16kb' }), (request, response) => {
    const { value, errors } = validateEnquiry(request.body);
    if (Object.keys(errors).length) return response.status(422).json({ message: 'Please review your enquiry details.', errors });
    const requestKey = request.get('Idempotency-Key') || randomUUID();
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestKey)) return response.status(400).json({ message: 'Please retry your enquiry with a valid request reference.' });
    const result = store.create(value, requestKey);
    if (result.conflict) return response.status(409).json({ message: 'This request reference was already used. Please review your details and try again.' });
    response.status(result.duplicate ? 200 : 201).json({ id: result.id, receivedAt: result.receivedAt });
    // Storage and its notification jobs are committed before acknowledging receipt.
    notifications?.kick();
  });

  app.use('/api', (_request, response) => response.status(404).json({ message: 'Endpoint not found.' }));
  if (staticDirectory && existsSync(join(staticDirectory, 'index.html'))) {
    app.use(express.static(staticDirectory, { index: false }));
    app.use((request, response, next) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') return next();
      response.sendFile(join(staticDirectory, 'index.html'));
    });
  }
  app.use((_request, response) => response.status(404).json({ message: 'Not found.' }));
  app.use((error, _request, response, _next) => {
    if (response.headersSent) return;
    if (error.type === 'entity.too.large') return response.status(413).json({ message: 'Your enquiry is too long. Please shorten your additional details.' });
    if (error.type === 'entity.parse.failed') return response.status(400).json({ message: 'Please submit a valid enquiry.' });
    logger.error('Enquiry request failed.');
    response.status(500).json({ message: 'We could not save your enquiry. Please try again or call 0477 067 457.' });
  });
  return app;
}
