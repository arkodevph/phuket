import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createNotificationProviders, createNotificationWorker } from './notifications.js';
import { createEnquiryStore } from './store.js';
import { validateEnquiry } from './validation.js';

const validEnquiry = {
  name: 'Alex Buyer', email: 'alex@example.test', mobile: '0412 345 678', budget: '500000',
  location: 'Kamala, Phuket', funding: 'Finance required', timeframe: '3–6 months', note: 'A two-bedroom home.\nNear the beach.',
};
const quietLogger = { error() {} };

async function fixture(context, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'goodspeed-test-'));
  const path = join(directory, 'enquiries.sqlite');
  const store = createEnquiryStore(path);
  const app = createApp({ store, logger: quietLogger, rateLimitOptions: { limit: 100, ...options.rateLimitOptions } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const post = (body = validEnquiry, key = randomUUID()) => fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body),
  });
  function rows(table) {
    const database = new DatabaseSync(path, { readOnly: true });
    try { return database.prepare(`SELECT * FROM ${table}`).all(); } finally { database.close(); }
  }
  return { store, path, baseUrl, post, rows };
}

test('a valid enquiry saves all buyer details and queues email and SMS before returning a receipt', async (context) => {
  const { post, rows } = await fixture(context);
  const response = await post({ ...validEnquiry, name: '  Alex Buyer  ' });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const receipt = await response.json();
  assert.deepEqual(Object.keys(receipt).sort(), ['id', 'receivedAt']);
  const [saved] = rows('enquiries');
  assert.equal(saved.id, receipt.id);
  assert.equal(saved.name, 'Alex Buyer');
  assert.equal(saved.email, validEnquiry.email);
  assert.equal(saved.mobile, validEnquiry.mobile);
  assert.equal(saved.budget_aud, 500000);
  assert.equal(saved.preferred_location, validEnquiry.location);
  assert.equal(saved.funding, validEnquiry.funding);
  assert.equal(saved.timeframe, validEnquiry.timeframe);
  assert.equal(saved.note, validEnquiry.note);
  assert.deepEqual(rows('notification_jobs').map((job) => job.channel).sort(), ['email', 'sms']);
});

test('records and pending notifications survive a database restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'goodspeed-restart-'));
  const path = join(directory, 'enquiries.sqlite');
  try {
    const store = createEnquiryStore(path);
    const key = randomUUID();
    const receipt = store.create(validateEnquiry(validEnquiry).value, key);
    store.close();
    const reopened = createEnquiryStore(path);
    try {
      assert.equal(reopened.create(validateEnquiry(validEnquiry).value, key).id, receipt.id);
      assert.equal(reopened.pendingNotifications(['email', 'sms']).length, 2);
    } finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('invalid buyer fields and unsafe numeric values are rejected without saving records', async (context) => {
  const { post, rows } = await fixture(context);
  for (const overrides of [
    { name: '  ' }, { name: 'Buyer\nInjected header' }, { email: 'invalid' }, { mobile: 'not a number' },
    { budget: 0 }, { budget: -100 }, { budget: '100.50' }, { budget: '0x123' }, { budget: Number.MAX_SAFE_INTEGER + 1 },
    { location: '  ' }, { funding: 'Unrecognised option' }, { timeframe: 'Tomorrow' }, { note: 'x'.repeat(1001) },
  ]) {
    const response = await post({ ...validEnquiry, ...overrides });
    assert.equal(response.status, 422, JSON.stringify(overrides));
  }
  assert.equal(rows('enquiries').length, 0);
  assert.equal(rows('notification_jobs').length, 0);
});

test('network retries with the same request key do not duplicate enquiries or notifications', async (context) => {
  const { post, rows } = await fixture(context);
  const key = randomUUID();
  const first = await post(validEnquiry, key);
  const second = await post(validEnquiry, key);
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), await first.json());
  const conflict = await post({ ...validEnquiry, budget: '600000' }, key);
  assert.equal(conflict.status, 409);
  assert.equal(rows('enquiries').length, 1);
  assert.equal(rows('notification_jobs').length, 2);
});

test('storage failure rolls back the enquiry and returns an error rather than a false receipt', async (context) => {
  const { path, post, rows } = await fixture(context);
  const database = new DatabaseSync(path);
  database.exec('DROP TABLE notification_jobs');
  database.close();
  const response = await post();
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.match(result.message, /could not save/);
  assert.doesNotMatch(JSON.stringify(result), /sqlite|SQL|notification_jobs/i);
  assert.equal(rows('enquiries').length, 0);
});

test('malformed, oversized, non-JSON and cross-site requests are rejected; enquiries cannot be listed publicly', async (context) => {
  const { baseUrl, rows } = await fixture(context);
  for (const [body, headers, expected] of [
    ['{', { 'Content-Type': 'application/json' }, 400],
    ['x'.repeat(17_000), { 'Content-Type': 'application/json' }, 413],
    ['name=Alex', { 'Content-Type': 'application/x-www-form-urlencoded' }, 415],
    [JSON.stringify(validEnquiry), { 'Content-Type': 'application/json', 'sec-fetch-site': 'cross-site' }, 403],
  ]) {
    const response = await fetch(`${baseUrl}/api/enquiries`, { method: 'POST', headers, body });
    assert.equal(response.status, expected);
  }
  assert.equal((await fetch(`${baseUrl}/api/enquiries`)).status, 404);
  assert.equal(rows('enquiries').length, 0);
});

test('enquiry rate limits return a retry time without accepting further submissions', async (context) => {
  const { post, rows } = await fixture(context, { rateLimitOptions: { limit: 2 } });
  assert.equal((await post()).status, 201);
  assert.equal((await post()).status, 201);
  const response = await post();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(rows('enquiries').length, 2);
});

test('unconfigured notifications remain queued and can be processed after configuration', async (context) => {
  const { post, store, rows } = await fixture(context);
  await post();
  const disabled = createNotificationWorker({ store, providers: {}, logger: quietLogger });
  await disabled.kick();
  assert.ok(rows('notification_jobs').every((job) => job.completed_at === null && job.attempts === 0));
  const sent = [];
  const configured = createNotificationWorker({ store, logger: quietLogger, providers: {
    email: async (job) => { sent.push(['email', job.email]); return 'email-message-id'; },
    sms: async (job) => { sent.push(['sms', job.mobile]); return 'sms-message-id'; },
  } });
  await configured.kick();
  await configured.kick();
  assert.equal(sent.length, 2);
  assert.ok(rows('notification_jobs').every((job) => job.completed_at && job.provider_id));
});

test('an email outage leaves the enquiry saved, allows SMS through and retries email later', async (context) => {
  const { post, store, rows } = await fixture(context);
  const response = await post();
  assert.equal(response.status, 201);
  let currentTime = Date.now();
  let emailAttempts = 0;
  const worker = createNotificationWorker({ store, logger: quietLogger, now: () => currentTime, providers: {
    email: async () => { if (++emailAttempts === 1) throw new Error('Provider unavailable'); return 'email-ok'; },
    sms: async () => 'sms-ok',
  } });
  await worker.kick();
  let jobs = rows('notification_jobs');
  assert.equal(jobs.find((job) => job.channel === 'email').completed_at, null);
  assert.equal(jobs.find((job) => job.channel === 'email').attempts, 1);
  assert.ok(jobs.find((job) => job.channel === 'sms').completed_at);
  await worker.kick();
  assert.equal(emailAttempts, 1);
  currentTime += 60_001;
  await worker.kick();
  jobs = rows('notification_jobs');
  assert.equal(emailAttempts, 2);
  assert.ok(jobs.every((job) => job.completed_at));
  assert.equal(rows('enquiries').length, 1);
});

test('notification adapters address the advisor and include buyer contact and property details', async () => {
  let emailMessage;
  let smsMessage;
  const config = {
    email: { host: 'smtp.example.test', port: 587, secure: false, from: 'website@example.test', to: 'advisor@example.test', user: 'test', password: 'test-secret' },
    sms: { accountSid: `AC${'a'.repeat(32)}`, authToken: 'test-token', from: '+15005550006', to: '+61477067457' },
  };
  const providers = createNotificationProviders(config, {
    createTransport: () => ({ sendMail: async (message) => { emailMessage = message; return { accepted: [config.email.to], messageId: 'email-id' }; } }),
    fetchImpl: async (url, options) => { smsMessage = { url, options }; return { ok: true, json: async () => ({ sid: 'sms-id', status: 'queued' }) }; },
  });
  const enquiry = { id: randomUUID(), name: validEnquiry.name, email: validEnquiry.email, mobile: validEnquiry.mobile, budget_aud: 500000, preferred_location: validEnquiry.location, funding: validEnquiry.funding, timeframe: validEnquiry.timeframe, note: validEnquiry.note, created_at: new Date().toISOString() };
  assert.equal(await providers.email(enquiry), 'email-id');
  assert.equal(await providers.sms(enquiry), 'sms-id');
  assert.equal(emailMessage.to, 'advisor@example.test');
  assert.equal(emailMessage.replyTo.address, validEnquiry.email);
  assert.match(emailMessage.text, /500,000/);
  assert.match(emailMessage.text, /Near the beach/);
  assert.equal(smsMessage.options.body.get('To'), '+61477067457');
  assert.equal(smsMessage.options.body.get('From'), '+15005550006');
  assert.match(smsMessage.options.body.get('Body'), /Finance required/);
  assert.match(smsMessage.options.body.get('Body'), /alex@example.test/);
  assert.ok(smsMessage.options.body.get('Body').length < 1600);
});

test('backend runs with notification settings blank and validates configured providers', () => {
  const config = readConfig({});
  assert.equal(config.notifications.email, null);
  assert.equal(config.notifications.sms, null);
  assert.equal(config.port, 3001);
  assert.throws(() => readConfig({ PORT: 'invalid' }), /PORT/);
  assert.throws(() => readConfig({ TRUST_PROXY_HOPS: '-1' }), /TRUST_PROXY_HOPS/);
  assert.throws(() => readConfig({ SMTP_HOST: 'smtp.example.test', ENQUIRY_EMAIL_TO: 'invalid', ENQUIRY_EMAIL_FROM: 'site@example.test' }), /email addresses/);
});
