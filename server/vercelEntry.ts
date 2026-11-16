import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './createApp.js';

let cachedApp: ReturnType<typeof createApiApp> | null = null;
let initError: Error | null = null;

function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;
  try {
    cachedApp = createApiApp();
    return cachedApp;
  } catch (err: any) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getApp();
    return app(req as any, res as any);
  } catch (err: any) {
    console.error('[Vercel API Fatal Init Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: err?.message || 'Server initialization failed',
      })
    );
  }
}
