import { createApp } from '../server/app.js';
import { createVercelBlobStore } from '../server/blob-store.js';

const app = createApp({
  store: createVercelBlobStore(),
  trustProxyHops: 1,
});

export default function handler(request, response) {
  // This function is mounted at /api/enquiries. Normalize the path in case
  // the Vercel runtime passes the function-local path to Express.
  const query = request.url?.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
  request.url = `/api/enquiries${query}`;
  return app(request, response);
}
