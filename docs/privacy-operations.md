# Proposed privacy operations for the website owner

This runbook is a proposed process requiring adoption by the identified business operator. It is not evidence that the operator has appointed staff, set legal deadlines or implemented its retention schedule. No real enquiry data was accessed or deleted while preparing it.

## Access, correction and deletion requests

1. Assign a responsible privacy contact and monitored channel. Record the request and receipt date in a restricted case log; keep personal information out of Git, public tickets and application logs. Determine the applicable response deadline and exceptions.
2. Verify the requester’s authority using proportionate information, such as a reference and contact details already held, and an appropriate callback or other verified channel. Do not request passport/bank documents through the public form.
3. An authorised administrator can locate private Vercel Blob records under `enquiries/`. The filename uses `requestKey`; the customer’s receipt is the separate `id` inside the JSON. A receipt must not be treated as a public download key. Limit review to relevant records and use a secure, approved working environment.
4. For an access request, provide the requester’s information through an authenticated or otherwise appropriately verified channel; do not turn the blob public or publish a link containing credentials. The website has no automated export/self-service account feature.
5. For correction, arrange a controlled update to the private record with the administrator/developer. Preserve the receipt ID, creation metadata and original request key/hash used for retry recognition. Check the operation on a non-production copy first and record the correction securely. No public correction API currently exists.
6. For deletion, check legal retention duties and any necessary dispute/legal hold. An authorised administrator can remove the relevant blob using Vercel’s private-storage tools. Locate all records within the agreed scope rather than assuming one reference covers every enquiry. Check downloaded copies and any later CRM/email/SMS records separately. The local SQLite service, if used with real enquiries, also needs deletion from related notification jobs and lawful backup handling; it is separate from production Blob storage.
7. Document the action and any specific lawful reason for retaining information, confirm the outcome to the verified requester, and explain any relevant provider-cache/backup limitation. Do not promise backup erasure or processing deadlines that have not been confirmed. Avoid keeping a copy of deleted enquiry contents just to prove deletion.

## Retention and security decisions

- Approve a purpose-based retention schedule for enquiries, clients, transactions, exports, messages, queues, logs and backups with legal advice. Assign a periodic review and deletion owner. No automatic deletion job exists; a policy statement does not enforce retention.
- Review Vercel account members and access roles, enable appropriate multi-factor authentication, protect Blob tokens, and document relevant provider data-processing agreements and countries. Keep secrets out of `VITE_` variables and frontend bundles.
- Keep development data synthetic. Confirm that developers/contractors are authorised before giving access to real data; processing from another country needs assessment. Separate development and production stores if needed. Do not assume that connecting the same store to preview/development isolates data.
- Confirm a secure backup/restore plan and backup expiry with the provider. A deletion request must not later be undone by an unreviewed restoration.
- Name an incident-response lead, preserve only necessary evidence, contain incidents and assess statutory regulator/individual notifications promptly. Applicable notification thresholds and deadlines need jurisdiction-specific review.

## Before a new integration goes live

Document its fields, purpose, legal ground, recipient/provider, countries, access permissions, retention and deletion path. Update collection and privacy notices first and provide any necessary separate consent controls. The current form has no marketing opt-in and no consent-version record; do not claim it grants general marketing or referral permission.

The production API currently does not send email/SMS. If the local notification service is configured with real credentials, it can process previously pending jobs automatically. Review the queue, recipients, privacy notice and lawful purpose before activation. Do not enable a broad historical replay as an incidental configuration change.
