import OAuth from "oauth-1.0a";

const CONNECT_API_BASE = "https://connectapi.garmin.com";
const EXCHANGE_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0";
const CONSUMER_KEY = "fc3e99d2-118c-44b8-8ae3-03370dde24c0";
const CONSUMER_SECRET = "E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF";
const USER_AGENT = "GCM-iOS-5.22.1.4";

export interface OAuth1Credentials {
  oauth_token: string;
  oauth_token_secret: string;
}

export interface OAuth2Token {
  access_token: string;
  expires_at: number;
}

async function hmacSha1(baseString: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(baseString),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export class GarminApi {
  private oauth1: OAuth1Credentials;
  private accessToken: string;
  private expiresAt: number;
  private displayNameCache: string | null = null;
  constructor(oauth1Json: string, oauth2Json: string) {
    const o1 = JSON.parse(oauth1Json);
    this.oauth1 = {
      oauth_token: o1.oauth_token,
      oauth_token_secret: o1.oauth_token_secret,
    };
    const o2 = JSON.parse(oauth2Json);
    this.accessToken = o2.access_token;
    this.expiresAt = o2.expires_at;
  }

  private async refreshToken(): Promise<void> {
    const requestData = {
      url: EXCHANGE_URL,
      method: "POST" as const,
    };
    const token = {
      key: this.oauth1.oauth_token,
      secret: this.oauth1.oauth_token_secret,
    };

    // Build OAuth signature manually since oauth-1.0a expects sync hash
    // but Web Crypto is async
    const oauth = new OAuth({
      consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
      signature_method: "HMAC-SHA1",
      hash_function: () => "", // placeholder
    });

    const oauthData = oauth.authorize(requestData, token);
    // Remove placeholder signature before computing the real one,
    // otherwise it pollutes the base string
    delete oauthData.oauth_signature;
    const baseString = oauth.getBaseString(requestData, oauthData);
    const signingKey = oauth.getSigningKey(token.secret);
    oauthData.oauth_signature = await hmacSha1(baseString, signingKey);

    const authHeader = oauth.toHeader(oauthData);

    const response = await fetch(EXCHANGE_URL, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Token refresh failed ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    this.accessToken = data.access_token as string;
    this.expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in as number);
  }

  private isExpired(): boolean {
    return this.expiresAt < Date.now() / 1000;
  }

  private async ensureValidToken(): Promise<string> {
    if (this.isExpired()) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    query?: Record<string, string | number>,
    body?: unknown,
  ): Promise<T> {
    const token = await this.ensureValidToken();
    const url = new URL(path, CONNECT_API_BASE);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), init);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Garmin API ${response.status} ${response.statusText}: ${text}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T = unknown>(
    path: string,
    query?: Record<string, string | number>,
  ): Promise<T> {
    return this.request<T>("GET", path, query);
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number>,
  ): Promise<T> {
    return this.request<T>("POST", path, query, body);
  }

  async getDisplayName(): Promise<string> {
    if (this.displayNameCache) return this.displayNameCache;
    const settings = await this.get<{ userData: { displayName: string } }>(
      "/userprofile-service/userprofile/user-settings",
    );
    this.displayNameCache = settings.userData.displayName;
    return this.displayNameCache;
  }

  async delete<T = unknown>(
    path: string,
    query?: Record<string, string | number>,
  ): Promise<T> {
    return this.request<T>("DELETE", path, query);
  }
}
