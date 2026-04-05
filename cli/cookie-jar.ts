/**
 * Minimal cookie jar for persisting cookies across SSO requests.
 * Only handles sso.garmin.com — no domain scoping needed.
 */
export class CookieJar {
  private cookies = new Map<string, string>();

  extractCookies(response: Response): void {
    const setCookieHeaders = response.headers.getSetCookie();
    for (const header of setCookieHeaders) {
      const nameValue = header.split(";")[0]?.trim();
      if (!nameValue) continue;
      const eqIdx = nameValue.indexOf("=");
      if (eqIdx === -1) continue;
      const name = nameValue.slice(0, eqIdx);
      const value = nameValue.slice(eqIdx + 1);
      this.cookies.set(name, value);
    }
  }

  getCookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    const existing = this.getCookieHeader();
    if (existing) {
      headers.set("Cookie", existing);
    }
    const response = await fetch(url, { ...init, headers });
    this.extractCookies(response);
    return response;
  }
}
