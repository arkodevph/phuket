import nodemailer from 'nodemailer';

function notificationText(enquiry, channel) {
  const budget = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(enquiry.budget_aud);
  return [
    'Goodspeed Real Estate — New property enquiry',
    `Reference: ${enquiry.id}`,
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Mobile: ${enquiry.mobile}`,
    `Budget: ${budget} AUD`,
    `Location: ${enquiry.preferred_location}`,
    `Funding: ${enquiry.funding}`,
    `Buying timeframe: ${enquiry.timeframe}`,
    ...(channel === 'email' && enquiry.note ? ['', `Additional details: ${enquiry.note}`] : []),
    `Received: ${enquiry.created_at}`,
  ].join('\n');
}

export function createNotificationProviders(config, { createTransport = nodemailer.createTransport, fetchImpl = fetch } = {}) {
  const providers = {};
  if (config.email) {
    const settings = config.email;
    const transport = createTransport({
      host: settings.host, port: settings.port, secure: settings.secure,
      requireTLS: !settings.secure,
      ...(settings.user ? { auth: { user: settings.user, pass: settings.password } } : {}),
      connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 15_000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    providers.email = async (enquiry) => {
      try {
        const result = await transport.sendMail({
          from: { name: 'Goodspeed Real Estate', address: settings.from },
          to: settings.to,
          replyTo: { name: enquiry.name, address: enquiry.email },
          subject: `Property enquiry — ${enquiry.name}`,
          text: notificationText(enquiry, 'email'),
          messageId: `<${enquiry.id}@${settings.from.split('@')[1]}>`,
        });
        if (!result.accepted?.length) throw new Error('Email not accepted');
        return result.messageId;
      } catch {
        throw new Error('Email provider did not accept the notification.');
      }
    };
  }
  if (config.sms) {
    const settings = config.sms;
    providers.sms = async (enquiry) => {
      let response;
      try {
        response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: settings.to, From: settings.from, Body: notificationText(enquiry, 'sms') }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new Error('SMS provider could not be reached.');
      }
      if (!response.ok) throw new Error(`SMS provider returned HTTP ${response.status}.`);
      const result = await response.json();
      if (!result.sid || result.error_code || ['failed', 'undelivered'].includes(result.status)) throw new Error('SMS provider did not accept the notification.');
      return result.sid;
    };
  }
  return providers;
}

export function createNotificationWorker({ store, providers, logger = console, now = Date.now }) {
  let active = null;
  let timer = null;
  let stopped = false;

  async function processPending() {
    const jobs = store.pendingNotifications(Object.keys(providers), now());
    for (const job of jobs) {
      if (stopped) break;
      try {
        const providerId = await providers[job.channel](job);
        store.completeNotification(job.job_id, providerId);
      } catch (error) {
        store.retryNotification(job.job_id, job.attempts, `${job.channel} notification attempt failed.`, now());
        logger.error(`${job.channel} notification failed for enquiry ${job.id}; retry scheduled.`);
      }
    }
  }

  function kick() {
    if (stopped || active) return active || Promise.resolve();
    active = processPending().catch(() => logger.error('Notification queue could not be processed.'))
      .finally(() => { active = null; });
    return active;
  }

  return {
    kick,
    start() {
      stopped = false;
      void kick();
      timer = setInterval(kick, 30_000);
      timer.unref();
    },
    async stop() {
      stopped = true;
      clearInterval(timer);
      await active;
    },
  };
}
