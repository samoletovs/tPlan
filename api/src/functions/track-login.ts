import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

const TELEGRAM_NOTIFY_URL = 'https://func-agents-s6vbks3oteo4y.azurewebsites.net/api/notify?code=r_R7xLV9tH3-9XjJ0dbniNan9OXwkZ2S8luCASzGE8OZAzFuxePshQ==';

app.http('trackLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'track-login',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const header = request.headers.get('x-ms-client-principal');
      if (!header) return { status: 401, jsonBody: { error: 'Not authenticated' } };

      const principal = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
      const email = principal.userDetails || 'unknown';
      const provider = principal.identityProvider || 'unknown';
      const timestamp = new Date().toISOString();

      await fetch(TELEGRAM_NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `👤 tPlan login\n\nUser: ${email}\nProvider: ${provider}\nTime: ${timestamp}`
        })
      }).catch(() => {});

      return { status: 200, jsonBody: { ok: true } };
    } catch {
      return { status: 200, jsonBody: { ok: false } };
    }
  }
});
