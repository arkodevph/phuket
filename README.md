# Goodspeed Real Estate

Property enquiry website for Australians interested in buying in Thailand. The React frontend submits enquiries to a Node.js / Express backend. Local development stores enquiries in SQLite; Vercel production stores each enquiry as a private Vercel Blob.

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`. This starts the website and backend together. Vite forwards `/api` requests to the backend on `PORT`, which defaults to `3001`.

Frontend edits reload automatically. Restart `npm run dev` after changing backend code or notification settings.

## Enquiries

`POST /api/enquiries` accepts JSON with `name`, `email`, `mobile`, `budget` (whole AUD), `location`, `funding`, `timeframe` and optional `note`. Funding accepts `Cash purchase` or `Finance required`. Timeframes are defined in `src/enquiry-options.js`.

The API validates details, saves the enquiry, then returns a receipt with `id` and `receivedAt`. The form supplies an `Idempotency-Key` so retrying a submission after a lost response returns the original receipt. The API limits each IP to ten submission attempts per fifteen minutes and has no public enquiry listing endpoint.

For local development, enquiries are saved in `data/enquiries.sqlite` by default. Set `ENQUIRY_DB_PATH` to change the database location. On Vercel, create a private Blob store connected to the `phuket` project; the Vercel Blob SDK uses the project's `BLOB_READ_WRITE_TOKEN`. Enquiry records are stored under the private `enquiries/` path and are not exposed through a public API. The data directory and `.env` files are excluded from Git.

## Connect email and SMS later

The local backend accepts and saves enquiries with notification settings blank. Both notification jobs remain pending until their channel is configured. After supplying the settings and restarting the local backend, existing pending jobs are processed automatically. Vercel production currently persists enquiries; automatic email/SMS delivery is pending the advisor's recipient address and provider credentials.

For email, set `ENQUIRY_EMAIL_TO` to the advisor’s email, `ENQUIRY_EMAIL_FROM` to the sending address, and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` and `SMTP_PASS` for the email provider. Use port 587 with `SMTP_SECURE=false` for STARTTLS, or port 465 with `SMTP_SECURE=true` for TLS. Email notifications contain every enquiry field and use the buyer’s email as the reply-to address. See the [Nodemailer SMTP documentation](https://nodemailer.com/smtp).

For SMS, supply `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and an SMS-capable `TWILIO_FROM_NUMBER`. `ENQUIRY_SMS_TO` defaults in the example configuration to the existing Australian contact, `+61477067457`. Notifications include the buyer’s contact information, budget, location, funding, timeframe and reference; optional notes are included in email. See the [Twilio Message API](https://www.twilio.com/docs/messaging/api/message-resource).

The local worker checks the durable queue every thirty seconds. Failed attempts retry with increasing delays up to one hour. Completing a job means the email or SMS provider accepted the notification; it does not confirm final delivery to a device or inbox. A restart can replay a notification if the provider accepted it immediately before the process stopped, so use the enquiry reference to identify duplicates.

Optionally set `VITE_CONTACT_EMAIL` to display a public email in the website’s contact section and footer, then rebuild. Keep provider credentials in backend variables without the `VITE_` prefix.

## Build and run production

```sh
npm run build
npm start
```

The local backend serves both the built website and the API on `PORT`. Run one application instance with a persistent disk mounted at `ENQUIRY_DB_PATH`, and back up the SQLite database. If the host forwards requests through a proxy, set `TRUST_PROXY_HOPS` to the number of trusted proxy hops so IP rate limits use the visitor’s address. HTTPS should be provided by the hosting service. Vercel builds the Vite site into `dist` and runs the two API functions in `api/`.

`npm run preview` previews the frontend build only; use `npm start` to exercise the built website with working form submissions. `GET /api/health` returns `{ "status": "ok" }` while the backend is running.

## Check changes

```sh
npm test
npm run build
```

Backend tests cover validation, persistence across restart, submission retries, transactional rollback, request limits, pending notifications and provider failure recovery. Notification providers are mocked during tests, so they send no real email or SMS.
