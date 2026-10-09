import { createHash, randomUUID } from 'node:crypto';
import { get, put } from '@vercel/blob';

const access = 'private';

async function readEnquiry(pathname) {
  const result = await get(pathname, { access });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

function receiptFor(record, hash) {
  if (record.requestHash !== hash) return { conflict: true };
  return { duplicate: true, id: record.id, receivedAt: record.created_at };
}

export function createVercelBlobStore() {
  return {
    async create(enquiry, requestKey) {
      const requestHash = createHash('sha256').update(JSON.stringify(enquiry)).digest('hex');
      const pathname = `enquiries/${requestKey}.json`;
      const existing = await readEnquiry(pathname);
      if (existing) return receiptFor(existing, requestHash);

      const record = {
        id: randomUUID(),
        requestKey,
        requestHash,
        name: enquiry.name,
        email: enquiry.email,
        mobile: enquiry.mobile,
        budget_aud: enquiry.budget,
        preferred_location: enquiry.location,
        funding: enquiry.funding,
        timeframe: enquiry.timeframe,
        note: enquiry.note,
        created_at: new Date().toISOString(),
      };

      try {
        await put(pathname, JSON.stringify(record), {
          access,
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
        });
        return { id: record.id, receivedAt: record.created_at, duplicate: false };
      } catch (error) {
        // A concurrent retry can win the immutable pathname while this request uploads.
        try {
          const raced = await readEnquiry(pathname);
          if (raced) return receiptFor(raced, requestHash);
        } catch {
          // Preserve the original storage failure if the follow-up read also fails.
        }
        throw error;
      }
    },
  };
}
