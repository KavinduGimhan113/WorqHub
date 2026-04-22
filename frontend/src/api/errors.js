/**
 * Human-readable message from axios errors (JSON API, HTML error pages, network).
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  const status = err.response?.status;
  const data = err.response?.data;

  if (data && typeof data === 'object' && data.message != null) {
    return String(data.message);
  }
  if (typeof data === 'string' && data.trim()) {
    const lower = data.toLowerCase();
    // CRA webpack-dev-server proxy failure (backend not running)
    if (lower.includes('econnrefused') || lower.includes('proxy error')) {
      return 'Cannot reach the API server. Start the backend: open a terminal, run cd backend then npm run dev, and wait until it says it is listening on port 5000 (MongoDB must be running too).';
    }
    if (!lower.startsWith('<!doctype')) {
      return data.length > 200 ? `${data.slice(0, 200)}…` : data;
    }
  }
  if (status === 404) {
    return 'API endpoint not found. Restart the backend after updating, or check the API URL.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'API server unavailable. If you use npm start for the frontend, run the backend on port 5000 (npm run dev in the backend folder).';
  }
  if (status) {
    return `Request failed (${status}). Try again.`;
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
    return 'Network error — start the backend (cd backend && npm run dev) and ensure MongoDB is connected.';
  }
  if (err.message) {
    return err.message;
  }
  return fallback;
}
