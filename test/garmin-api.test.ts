import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GarminApi } from "../src/garmin-api.js";

const VALID_OAUTH1 = JSON.stringify({
  oauth_token: "test-token",
  oauth_token_secret: "test-secret",
});

function validOAuth2(overrides?: Partial<{ access_token: string; expires_at: number }>) {
  return JSON.stringify({
    access_token: "test-access-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  });
}

function expiredOAuth2() {
  return JSON.stringify({
    access_token: "expired-token",
    expires_at: Math.floor(Date.now() / 1000) - 60,
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number) {
  return new Response(body, { status });
}

/** Extract [url, init] from a mock.calls entry with proper types. */
function callArgs(mock: ReturnType<typeof vi.fn<typeof fetch>>, index: number) {
  const args = mock.mock.calls[index];
  return {
    url: String(args[0]),
    headers: (args[1]?.headers ?? {}) as Record<string, string>,
    method: args[1]?.method,
  };
}

describe("GarminApi", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    mockFetch = vi.fn<typeof fetch>();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    it("parses valid OAuth credentials", () => {
      expect(() => new GarminApi(VALID_OAUTH1, validOAuth2())).not.toThrow();
    });

    it("throws on malformed OAuth1 JSON", () => {
      expect(() => new GarminApi("not-json", validOAuth2())).toThrow();
    });

    it("throws on malformed OAuth2 JSON", () => {
      expect(() => new GarminApi(VALID_OAUTH1, "not-json")).toThrow();
    });
  });

  describe("get()", () => {
    it("sends Bearer token and correct headers", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2({ access_token: "my-bearer" }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.get("/test-path");

      expect(mockFetch).toHaveBeenCalledOnce();
      const { url, headers } = callArgs(mockFetch, 0);
      expect(url).toBe("https://connectapi.garmin.com/test-path");
      expect(headers).toMatchObject({
        Authorization: "Bearer my-bearer",
        Accept: "application/json",
      });
      expect(headers["User-Agent"]).toBeDefined();
    });

    it("builds query parameters", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await api.get("/activities", { start: 0, limit: 20 });

      const parsed = new URL(callArgs(mockFetch, 0).url);
      expect(parsed.searchParams.get("start")).toBe("0");
      expect(parsed.searchParams.get("limit")).toBe("20");
    });

    it("skips undefined query values", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await api.get("/activities", {
        limit: 10,
        start: undefined as unknown as number,
      });

      const parsed = new URL(callArgs(mockFetch, 0).url);
      expect(parsed.searchParams.get("limit")).toBe("10");
      expect(parsed.searchParams.has("start")).toBe(false);
    });

    it("returns parsed JSON on success", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      const payload = { activityId: "123", name: "Morning Run" };
      mockFetch.mockResolvedValueOnce(jsonResponse(payload));

      const result = await api.get("/activity/123");
      expect(result).toEqual(payload);
    });

    it("throws on non-200 response with status and body", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(textResponse("Unauthorized access", 401));

      await expect(api.get("/bad-path")).rejects.toThrow(/401/);
    });

    it("does not refresh when token is valid", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.get("/test");

      // Only one fetch call (the API call), no refresh
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe("post()", () => {
    it("sends POST method with JSON body", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      const body = { workoutName: "Tempo Run", sportType: "running" };
      mockFetch.mockResolvedValueOnce(jsonResponse({ workoutId: "456" }));

      const result = await api.post("/workout-service/workout", body);

      expect(result).toEqual({ workoutId: "456" });
      expect(mockFetch).toHaveBeenCalledOnce();
      const call = mockFetch.mock.calls[0];
      const init = call[1]!;
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
      expect(init.body).toBe(JSON.stringify(body));
    });

    it("sends POST without body when body is undefined", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.post("/some-endpoint");

      const init = mockFetch.mock.calls[0][1]!;
      expect(init.method).toBe("POST");
      expect(init.body).toBeUndefined();
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });

    it("builds query parameters", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.post("/endpoint", { data: 1 }, { key: "value" });

      const parsed = new URL(callArgs(mockFetch, 0).url);
      expect(parsed.searchParams.get("key")).toBe("value");
    });

    it("throws on error response", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(textResponse("Bad Request", 400));

      await expect(api.post("/bad", {})).rejects.toThrow(/400/);
    });

    it("refreshes expired token before request", async () => {
      const api = new GarminApi(VALID_OAUTH1, expiredOAuth2());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "fresh", expires_in: 3600 }),
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({ created: true }));

      const result = await api.post("/workout", { name: "test" });

      expect(result).toEqual({ created: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const apiCall = callArgs(mockFetch, 1);
      expect(apiCall.headers.Authorization).toBe("Bearer fresh");
    });
  });

  describe("delete()", () => {
    it("sends DELETE method", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      const result = await api.delete("/workout-service/workout/123");

      expect(result).toBeUndefined();
      const init = mockFetch.mock.calls[0][1]!;
      expect(init.method).toBe("DELETE");
    });

    it("handles JSON response from delete", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }));

      const result = await api.delete("/some-resource/456");

      expect(result).toEqual({ deleted: true });
    });

    it("throws on error response", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(textResponse("Not Found", 404));

      await expect(api.delete("/missing/999")).rejects.toThrow(/404/);
    });

    it("refreshes expired token before request", async () => {
      const api = new GarminApi(VALID_OAUTH1, expiredOAuth2());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "fresh", expires_in: 3600 }),
      );
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await api.delete("/workout/123");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const apiCall = callArgs(mockFetch, 1);
      expect(apiCall.headers.Authorization).toBe("Bearer fresh");
    });
  });

  describe("getDisplayName()", () => {
    it("fetches and returns displayName from user settings", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ userData: { displayName: "testuser123" } }),
      );

      const name = await api.getDisplayName();

      expect(name).toBe("testuser123");
      const { url } = callArgs(mockFetch, 0);
      expect(url).toContain("/userprofile-service/userprofile/user-settings");
    });

    it("caches displayName on subsequent calls", async () => {
      const api = new GarminApi(VALID_OAUTH1, validOAuth2());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ userData: { displayName: "cached-user" } }),
      );

      const first = await api.getDisplayName();
      const second = await api.getDisplayName();

      expect(first).toBe("cached-user");
      expect(second).toBe("cached-user");
      // Only one fetch call — second call used cache
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe("token refresh", () => {
    it("refreshes expired token before making API call", async () => {
      const api = new GarminApi(VALID_OAUTH1, expiredOAuth2());

      // First call: token exchange
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "fresh-token", expires_in: 3600 }),
      );
      // Second call: actual API request
      mockFetch.mockResolvedValueOnce(jsonResponse({ refreshed: true }));

      const result = await api.get("/test");

      expect(result).toEqual({ refreshed: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should be POST to exchange endpoint
      const exchange = callArgs(mockFetch, 0);
      expect(exchange.url).toContain("/oauth-service/oauth/exchange/user/2.0");
      expect(exchange.method).toBe("POST");

      // Second call should use the fresh token
      const apiCall = callArgs(mockFetch, 1);
      expect(apiCall.headers.Authorization).toBe("Bearer fresh-token");
    });

    it("throws when token refresh fails", async () => {
      const api = new GarminApi(VALID_OAUTH1, expiredOAuth2());
      mockFetch.mockResolvedValueOnce(textResponse("Internal Server Error", 500));

      await expect(api.get("/test")).rejects.toThrow(/Token refresh failed 500/);
    });
  });
});
