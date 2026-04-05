import { createHmac } from "node:crypto";
import OAuth from "oauth-1.0a";

const OAUTH_USER_AGENT = "com.garmin.android.apps.connectmobile";
const CONSUMER_JSON_URL =
  "https://thegarth.s3.amazonaws.com/oauth_consumer.json";
const PREAUTHORIZED_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/preauthorized";
const EXCHANGE_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0";

export interface OAuth1Result {
  oauth_token: string;
  oauth_token_secret: string;
}

export interface OAuth2Result {
  access_token: string;
  expires_at: number;
}

async function getConsumerCredentials(): Promise<{
  consumer_key: string;
  consumer_secret: string;
}> {
  const response = await fetch(CONSUMER_JSON_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch consumer credentials: ${response.status}`,
    );
  }
  return response.json() as Promise<{
    consumer_key: string;
    consumer_secret: string;
  }>;
}

function createOAuthClient(consumerKey: string, consumerSecret: string): OAuth {
  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

export async function exchangeTokens(
  serviceTicketId: string,
): Promise<{ oauth1: OAuth1Result; oauth2: OAuth2Result }> {
  const { consumer_key, consumer_secret } = await getConsumerCredentials();
  const oauth = createOAuthClient(consumer_key, consumer_secret);

  // Step 5: Exchange service ticket for OAuth1 token (consumer-only signing)
  const preauthorizedUrl = `${PREAUTHORIZED_URL}?${new URLSearchParams({
    ticket: serviceTicketId,
    "login-url": "https://mobile.integration.garmin.com/gcm/android",
    "accepts-mfa-tokens": "true",
  })}`;

  const preauthorizedRequest = { url: preauthorizedUrl, method: "GET" as const };
  const preauthorizedAuth = oauth.authorize(preauthorizedRequest);
  const preauthorizedHeader = oauth.toHeader(preauthorizedAuth);

  const preauthorizedResponse = await fetch(preauthorizedUrl, {
    method: "GET",
    headers: {
      ...preauthorizedHeader,
      "User-Agent": OAUTH_USER_AGENT,
    },
  });

  if (!preauthorizedResponse.ok) {
    const text = await preauthorizedResponse.text();
    throw new Error(
      `Preauthorized token exchange failed (${preauthorizedResponse.status}): ${text}`,
    );
  }

  const preauthorizedBody = await preauthorizedResponse.text();
  const preauthorizedParams = new URLSearchParams(preauthorizedBody);
  const oauthToken = preauthorizedParams.get("oauth_token");
  const oauthTokenSecret = preauthorizedParams.get("oauth_token_secret");

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error(
      `Preauthorized response missing tokens: ${preauthorizedBody}`,
    );
  }

  const oauth1: OAuth1Result = {
    oauth_token: oauthToken,
    oauth_token_secret: oauthTokenSecret,
  };

  // Step 6: Exchange OAuth1 for OAuth2 token
  const exchangeRequest = { url: EXCHANGE_URL, method: "POST" as const };
  const exchangeAuth = oauth.authorize(exchangeRequest, {
    key: oauth1.oauth_token,
    secret: oauth1.oauth_token_secret,
  });
  const exchangeHeader = oauth.toHeader(exchangeAuth);

  const exchangeResponse = await fetch(EXCHANGE_URL, {
    method: "POST",
    headers: {
      ...exchangeHeader,
      "User-Agent": OAUTH_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "",
  });

  if (!exchangeResponse.ok) {
    const text = await exchangeResponse.text();
    throw new Error(
      `OAuth2 exchange failed (${exchangeResponse.status}): ${text}`,
    );
  }

  const exchangeData = (await exchangeResponse.json()) as {
    access_token: string;
    expires_in: number;
  };

  const oauth2: OAuth2Result = {
    access_token: exchangeData.access_token,
    expires_at: Math.floor(Date.now() / 1000) + exchangeData.expires_in,
  };

  return { oauth1, oauth2 };
}
