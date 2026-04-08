import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

interface AuthEnv {
  OAUTH_PROVIDER: OAuthHelpers;
  LOGIN_PASSWORD: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLoginPage(clientName: string, error?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Garmin MCP — Sign in</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex; align-items: center; justify-content: center;
        min-height: 100vh; margin: 0;
        background: #0b0d10; color: #e6e6e6;
      }
      .card {
        background: #15181d; border: 1px solid #262b33;
        border-radius: 12px; padding: 32px; max-width: 360px; width: 100%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      }
      h1 { margin: 0 0 4px; font-size: 20px; }
      p.sub { margin: 0 0 24px; color: #8a93a0; font-size: 14px; }
      label { display: block; font-size: 13px; margin-bottom: 6px; color: #b8c0cc; }
      input[type="password"] {
        width: 100%; box-sizing: border-box;
        padding: 10px 12px; font-size: 15px;
        background: #0b0d10; color: #e6e6e6;
        border: 1px solid #2b313a; border-radius: 8px;
      }
      input:focus { outline: none; border-color: #4a90e2; }
      button {
        margin-top: 16px; width: 100%;
        padding: 10px; font-size: 15px; font-weight: 600;
        background: #4a90e2; color: white;
        border: none; border-radius: 8px; cursor: pointer;
      }
      button:hover { background: #3a7fd0; }
      .err { color: #ff6b6b; font-size: 13px; margin-top: 12px; }
      .client { color: #4a90e2; font-weight: 600; }
    </style>
  </head>
  <body>
    <form class="card" method="post">
      <h1>Connect to Garmin MCP</h1>
      <p class="sub"><span class="client">${escapeHtml(clientName)}</span> is requesting access to your Garmin Connect data.</p>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required autofocus />
      ${error ? `<div class="err">${escapeHtml(error)}</div>` : ""}
      <button type="submit">Authorize</button>
    </form>
  </body>
</html>`;
}

export const authHandler = {
  async fetch(request: Request, env: AuthEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Garmin MCP server. Connect via an MCP client.", {
        headers: { "content-type": "text/plain" },
      });
    }

    if (url.pathname !== "/authorize") {
      return new Response("Not found", { status: 404 });
    }

    const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);
    const client = await env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId);
    const clientName = client?.clientName ?? oauthReq.clientId ?? "MCP client";

    if (request.method === "GET") {
      return new Response(renderLoginPage(clientName), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const password = String(form.get("password") ?? "");

      if (!timingSafeEqual(password, env.LOGIN_PASSWORD)) {
        return new Response(renderLoginPage(clientName, "Incorrect password."), {
          status: 401,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq,
        userId: "owner",
        scope: oauthReq.scope ?? [],
        metadata: { label: "Garmin MCP owner" },
        props: {},
      });

      return Response.redirect(redirectTo, 302);
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
