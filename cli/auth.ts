import { createInterface } from "node:readline";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { authenticate } from "./garmin-sso.js";
import { exchangeTokens } from "./garmin-oauth.js";

const CONFIG_DIR = join(homedir(), ".garmin-codemode-mcp");
const PROJECT_DIR = new URL("..", import.meta.url).pathname;

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";
    const onData = (ch: string) => {
      const c = ch.toString();
      if (c === "\n" || c === "\r" || c === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (c === "\u0003") {
        // Ctrl+C
        process.exit(1);
      } else if (c === "\u007f" || c === "\b") {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        input += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

function saveTokens(
  oauth1Json: string,
  oauth2Json: string,
): void {
  // Save to ~/.garmin-codemode-mcp/
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(join(CONFIG_DIR, "oauth1.json"), oauth1Json + "\n");
  writeFileSync(join(CONFIG_DIR, "oauth2.json"), oauth2Json + "\n");
  console.log(`Tokens saved to ${CONFIG_DIR}/`);

  // Write to .dev.vars
  const devVarsPath = join(PROJECT_DIR, ".dev.vars");
  let content = "";
  if (existsSync(devVarsPath)) {
    content = readFileSync(devVarsPath, "utf8");
  }

  content = upsertLine(content, "GARMIN_OAUTH1", oauth1Json);
  content = upsertLine(content, "GARMIN_OAUTH2", oauth2Json);

  writeFileSync(devVarsPath, content);
  console.log(`Updated ${devVarsPath}`);
}

function upsertLine(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return content.trimEnd() + (content.trim() ? "\n" : "") + line + "\n";
}

async function verify(): Promise<void> {
  const oauth1Path = join(CONFIG_DIR, "oauth1.json");
  const oauth2Path = join(CONFIG_DIR, "oauth2.json");

  if (!existsSync(oauth1Path) || !existsSync(oauth2Path)) {
    console.error("No saved tokens found. Run `pnpm auth` first.");
    process.exit(1);
  }

  const oauth2 = JSON.parse(readFileSync(oauth2Path, "utf8")) as {
    access_token: string;
    expires_at: number;
  };
  const now = Date.now() / 1000;

  if (oauth2.expires_at < now) {
    console.log("OAuth2 token is expired. Run `pnpm auth` to re-authenticate.");
    process.exit(1);
  }

  const remaining = Math.floor((oauth2.expires_at - now) / 3600);
  console.log(`OAuth2 token is valid (expires in ~${remaining}h)`);

  // Test API call
  const response = await fetch(
    "https://connectapi.garmin.com/userprofile-service/userprofile/user-settings",
    {
      headers: {
        Authorization: `Bearer ${oauth2.access_token}`,
        "User-Agent": "GCM-iOS-5.22.1.4",
      },
    },
  );

  if (response.ok) {
    const data = (await response.json()) as {
      userData: { displayName: string };
    };
    console.log(`Authenticated as: ${data.userData.displayName}`);
  } else {
    console.log(
      `Token may be invalid (API returned ${response.status}). Run \`pnpm auth\` to re-authenticate.`,
    );
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--verify")) {
    await verify();
    return;
  }

  console.log("Garmin Connect Authentication\n");

  const email = await prompt("Email: ");
  const password = await promptHidden("Password: ");

  console.log("\nAuthenticating with Garmin SSO...");

  const serviceTicket = await authenticate(email, password, async (method) => {
    return prompt(`Enter MFA code (sent via ${method}): `);
  });

  console.log("Exchanging tokens...");

  const { oauth1, oauth2 } = await exchangeTokens(serviceTicket);

  const oauth1Json = JSON.stringify(oauth1);
  const oauth2Json = JSON.stringify(oauth2);

  saveTokens(oauth1Json, oauth2Json);

  console.log("\nAuthentication complete! You can now run `pnpm dev`.");
}

main().catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
