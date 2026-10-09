import { resolve } from 'node:path';

export function readConfig(environment = process.env) {
  const port = Number(environment.PORT || 3001);
  const trustProxyHops = Number(environment.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');

  const emailReady = ['SMTP_HOST', 'ENQUIRY_EMAIL_TO', 'ENQUIRY_EMAIL_FROM'].every((key) => environment[key]?.trim());
  const smsReady = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'ENQUIRY_SMS_TO'].every((key) => environment[key]?.trim());
  const email = emailReady ? {
    host: environment.SMTP_HOST.trim(),
    port: Number(environment.SMTP_PORT || 587),
    secure: environment.SMTP_SECURE === 'true' || (!environment.SMTP_SECURE && Number(environment.SMTP_PORT) === 465),
    user: environment.SMTP_USER || '',
    password: environment.SMTP_PASS || '',
    to: environment.ENQUIRY_EMAIL_TO.trim(),
    from: environment.ENQUIRY_EMAIL_FROM.trim(),
  } : null;
  const sms = smsReady ? {
    accountSid: environment.TWILIO_ACCOUNT_SID.trim(),
    authToken: environment.TWILIO_AUTH_TOKEN,
    from: environment.TWILIO_FROM_NUMBER.trim(),
    to: environment.ENQUIRY_SMS_TO.trim(),
  } : null;

  if (email) {
    if (!Number.isInteger(email.port) || email.port < 1 || email.port > 65535) throw new Error('SMTP_PORT must be a valid port number.');
    if (![email.to, email.from].every((address) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) throw new Error('Email notification addresses must be valid email addresses.');
    if (Boolean(email.user) !== Boolean(email.password)) throw new Error('Set SMTP_USER and SMTP_PASS together.');
  }
  if (sms) {
    if (!/^AC[a-fA-F0-9]{32}$/.test(sms.accountSid)) throw new Error('TWILIO_ACCOUNT_SID must be a valid account SID.');
    if (![sms.to, sms.from].every((number) => /^\+[1-9]\d{7,14}$/.test(number))) throw new Error('SMS numbers must include a country code, for example +61477067457.');
  }
  return { port, trustProxyHops, databasePath: resolve(environment.ENQUIRY_DB_PATH || 'data/enquiries.sqlite'), notifications: { email, sms } };
}
