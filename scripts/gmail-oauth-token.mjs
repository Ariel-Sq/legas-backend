#!/usr/bin/env node
/**
 * One-off helper: obtain a Gmail OAuth2 refresh token for the backend mailer.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/gmail-oauth-token.mjs
 *
 * It prints a URL, you open it with the shop's Google account, approve the
 * "send email" permission, and the refresh token is printed here. The token is
 * long-lived as long as the OAuth client is published (production), not in
 * "Testing" mode (those expire after 7 days).
 */
import http from 'node:http';

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    'Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el entorno.\n' +
      'Ejemplo:\n  GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/gmail-oauth-token.mjs',
  );
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  }).toString();

console.log('\n1) Abrí esta URL con la cuenta legasmuebles@gmail.com:\n');
console.log(authUrl);
console.log(`\n2) Esperando la respuesta en ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end('not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Autorización rechazada: ${error ?? 'sin código'}`);
    console.error(`\n✗ Autorización rechazada: ${error ?? 'sin código'}`);
    server.close(() => process.exit(1));
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.refresh_token) {
      console.error('\n✗ No se obtuvo refresh_token:', data);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No se pudo obtener el token. Mirá la terminal.');
      server.close(() => process.exit(1));
      return;
    }

    console.log('\n✓ Listo. Refresh token:\n');
    console.log(data.refresh_token);
    console.log('\nGuardalo como GOOGLE_REFRESH_TOKEN en el backend.\n');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      '<h2>Listo ✅</h2><p>Ya podés cerrar esta pestaña y volver a la terminal.</p>',
    );
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('\n✗ Error intercambiando el código:', err);
    res.writeHead(500).end('error');
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, () => {
  console.log(`Servidor local escuchando en el puerto ${PORT}.`);
});
