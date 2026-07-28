import type { Connect, Plugin } from 'vite';
import {
  generateMealIdeasWithOpenAI,
  type MealIdeasRequest,
} from './mealIdeas';

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(
  res: Connect.ServerResponse,
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isMealIdeasRequest(body: unknown): body is MealIdeasRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.scope === 'string' &&
    typeof b.referenceDate === 'string' &&
    Array.isArray(b.kitchen) &&
    Array.isArray(b.phaseRules) &&
    typeof b.profile === 'object' &&
    b.profile !== null
  );
}

/**
 * Dev/preview middleware: POST /api/meal-ideas
 * Keeps OPENAI_API_KEY on the server (never exposed to the Vite client).
 */
export function mealIdeasApiPlugin(env: Record<string, string>): Plugin {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';
  const model = env.OPENAI_MEAL_MODEL?.trim() || 'gpt-4o-mini';

  const attach = (middlewares: Connect.Server) => {
    middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0];
      if (url !== '/api/meal-ideas') {
        next();
        return;
      }

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Key');
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      if (!apiKey) {
        sendJson(res, 503, {
          error:
            'Meal ideas unavailable. Set OPENAI_API_KEY in .env.local (server-only) and restart the dev server.',
          fallback: true,
        });
        return;
      }

      try {
        const body = await readJsonBody(req);
        if (!isMealIdeasRequest(body)) {
          sendJson(res, 400, { error: 'Invalid request body.', fallback: true });
          return;
        }

        const clientKey =
          (typeof req.headers['x-client-key'] === 'string' && req.headers['x-client-key']) ||
          req.socket.remoteAddress ||
          'anonymous';
        const bypassCache =
          typeof (body as { regenerate?: unknown }).regenerate === 'boolean' &&
          (body as { regenerate?: boolean }).regenerate === true;

        const result = await generateMealIdeasWithOpenAI(body, {
          apiKey,
          model,
          bypassCache,
          clientKey,
        });
        sendJson(res, 200, result);
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status: number }).status)
            : 500;
        const message = error instanceof Error ? error.message : 'Meal idea generation failed.';
        sendJson(res, Number.isFinite(status) ? status : 500, {
          error: message,
          fallback: true,
        });
      }
    });
  };

  return {
    name: 'fasted-meal-ideas-api',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
