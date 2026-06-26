// Teste rápido: node scripts/test-google-drive.mjs
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

dns.setDefaultResultOrder("ipv4first");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

function getCredentials() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile) {
    const resolved = path.isAbsolute(keyFile) ? keyFile : path.join(root, keyFile);
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  }
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("Defina GOOGLE_APPLICATION_CREDENTIALS ou GOOGLE_SERVICE_ACCOUNT_JSON");
  return JSON.parse(json);
}

try {
  const creds = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  console.log("OK — token obtido:", Boolean(token.token));
} catch (e) {
  console.error("FALHA:", e.message);
  process.exit(1);
}
