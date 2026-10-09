import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function createEnquiryStore(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      request_key TEXT UNIQUE NOT NULL,
      request_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      budget_aud INTEGER NOT NULL CHECK (budget_aud > 0),
      preferred_location TEXT NOT NULL,
      funding TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS notification_jobs (
      id INTEGER PRIMARY KEY,
      enquiry_id TEXT NOT NULL REFERENCES enquiries(id),
      channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      provider_id TEXT,
      last_error TEXT,
      UNIQUE (enquiry_id, channel)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS pending_notifications
      ON notification_jobs (next_attempt_at) WHERE completed_at IS NULL;
  `);

  return {
    create(enquiry, requestKey) {
      const hash = createHash('sha256').update(JSON.stringify(enquiry)).digest('hex');
      const existing = database.prepare('SELECT id, created_at, request_hash FROM enquiries WHERE request_key = ?').get(requestKey);
      if (existing) {
        if (existing.request_hash !== hash) return { conflict: true };
        return { duplicate: true, id: existing.id, receivedAt: existing.created_at };
      }
      const id = randomUUID();
      const receivedAt = new Date().toISOString();
      database.exec('BEGIN IMMEDIATE');
      try {
        database.prepare(`INSERT INTO enquiries
          (id, request_key, request_hash, name, email, mobile, budget_aud, preferred_location, funding, timeframe, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, requestKey, hash, enquiry.name, enquiry.email, enquiry.mobile, enquiry.budget, enquiry.location, enquiry.funding, enquiry.timeframe, enquiry.note, receivedAt);
        const queue = database.prepare('INSERT INTO notification_jobs (enquiry_id, channel) VALUES (?, ?)');
        queue.run(id, 'email');
        queue.run(id, 'sms');
        database.exec('COMMIT');
        return { id, receivedAt, duplicate: false };
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    pendingNotifications(channels, now = Date.now()) {
      if (!channels.length) return [];
      const placeholders = channels.map(() => '?').join(', ');
      return database.prepare(`SELECT job.id AS job_id, job.channel, job.attempts, enquiry.*
        FROM notification_jobs AS job JOIN enquiries AS enquiry ON enquiry.id = job.enquiry_id
        WHERE job.completed_at IS NULL AND job.next_attempt_at <= ? AND job.channel IN (${placeholders})
        ORDER BY job.id LIMIT 10`).all(now, ...channels);
    },
    completeNotification(jobId, providerId) {
      database.prepare('UPDATE notification_jobs SET completed_at = ?, provider_id = ?, last_error = NULL WHERE id = ?')
        .run(new Date().toISOString(), providerId || null, jobId);
    },
    retryNotification(jobId, attempts, message, now = Date.now()) {
      const delay = Math.min(3_600_000, 60_000 * (2 ** Math.min(attempts, 6)));
      database.prepare('UPDATE notification_jobs SET attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?')
        .run(now + delay, message, jobId);
    },
    close() { database.close(); },
  };
}
