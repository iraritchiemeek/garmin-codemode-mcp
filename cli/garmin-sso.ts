import { CookieJar } from "./cookie-jar.js";

const SSO_BASE = "https://sso.garmin.com";
const CLIENT_ID = "GCM_ANDROID_DARK";
const SERVICE_URL = "https://mobile.integration.garmin.com/gcm/android";

const SSO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface LoginResponse {
  serviceTicketId?: string;
  responseStatus: {
    type: string;
    message: string;
  };
  customerMfaInfo?: {
    mfaLastMethodUsed: string;
  };
}

export async function authenticate(
  email: string,
  password: string,
  mfaCallback?: (method: string) => Promise<string>,
): Promise<string> {
  const jar = new CookieJar();

  // Step 1: Load sign-in page to set session cookies
  const signInUrl = `${SSO_BASE}/mobile/sso/en/sign-in?clientId=${CLIENT_ID}`;
  await jar.fetch(signInUrl, { headers: SSO_HEADERS });

  // Step 2: Submit credentials
  const loginParams = new URLSearchParams({
    clientId: CLIENT_ID,
    locale: "en-US",
    service: SERVICE_URL,
  });
  const loginUrl = `${SSO_BASE}/mobile/api/login?${loginParams}`;

  const loginResponse = await jar.fetch(loginUrl, {
    method: "POST",
    headers: {
      ...SSO_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: email,
      password,
      rememberMe: false,
      captchaToken: "",
    }),
  });

  if (!loginResponse.ok) {
    const text = await loginResponse.text();
    throw new Error(`SSO login failed (${loginResponse.status}): ${text}`);
  }

  const loginData = (await loginResponse.json()) as LoginResponse;
  const status = loginData.responseStatus.type;

  if (status === "SUCCESSFUL") {
    if (!loginData.serviceTicketId) {
      throw new Error("Login succeeded but no service ticket returned");
    }
    return loginData.serviceTicketId;
  }

  if (status === "MFA_REQUIRED") {
    const method =
      loginData.customerMfaInfo?.mfaLastMethodUsed ?? "EMAIL_CODE";
    if (!mfaCallback) {
      throw new Error(`MFA required (${method}) but no callback provided`);
    }

    console.log(`MFA required via ${method}`);
    const code = await mfaCallback(method);

    // Step 3: Verify MFA code
    const mfaUrl = `${SSO_BASE}/mobile/api/mfa/verifyCode?${loginParams}`;
    const mfaResponse = await jar.fetch(mfaUrl, {
      method: "POST",
      headers: {
        ...SSO_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mfaMethod: method,
        mfaVerificationCode: code,
        rememberMyBrowser: false,
        reconsentList: [],
        mfaSetup: false,
      }),
    });

    if (!mfaResponse.ok) {
      const text = await mfaResponse.text();
      throw new Error(`MFA verification failed (${mfaResponse.status}): ${text}`);
    }

    const mfaData = (await mfaResponse.json()) as LoginResponse;
    if (mfaData.responseStatus.type !== "SUCCESSFUL") {
      throw new Error(
        `MFA verification failed: ${mfaData.responseStatus.type} — ${mfaData.responseStatus.message}`,
      );
    }
    if (!mfaData.serviceTicketId) {
      throw new Error("MFA succeeded but no service ticket returned");
    }
    return mfaData.serviceTicketId;
  }

  throw new Error(
    `Login failed: ${status} — ${loginData.responseStatus.message}`,
  );
}
