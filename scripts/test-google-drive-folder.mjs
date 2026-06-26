// Diagnóstico da pasta raiz: node scripts/test-google-drive-folder.mjs
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

dns.setDefaultResultOrder("ipv4first");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyFile = path.join(root, "secrets/google-service-account.json");
const creds = JSON.parse(fs.readFileSync(keyFile, "utf8"));
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || (() => {
  const env = fs.readFileSync(path.join(root, ".env"), "utf8");
  const m = env.match(/GOOGLE_DRIVE_FOLDER_ID="([^"]+)"/);
  return m?.[1];
})();

console.log("Service account:", creds.client_email);
console.log("Folder ID:", folderId);

const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });
const driveOpts = { supportsAllDrives: true };

let meta = null;
try {
  const res = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType,driveId",
    ...driveOpts,
  });
  meta = res.data;
  console.log("OK — pasta encontrada:", meta);
  if (meta.driveId) {
    console.log("(Shared Drive detectado — driveId:", meta.driveId + ")");
  }
} catch (e) {
  console.log("FALHA files.get:", e.message);
}

console.log("\nTestando permissão de escrita (create)...");
try {
  const created = await drive.files.create({
    requestBody: {
      name: `_teste_acesso_${Date.now()}`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [folderId],
    },
    fields: "id,name",
    ...driveOpts,
  });
  console.log("OK — upload funcionaria. Subpasta criada:", created.data.name);
  try {
    await drive.files.delete({ fileId: created.data.id, ...driveOpts });
    console.log("Subpasta de teste removida.");
  } catch {
    console.log("(Delete do teste falhou — normal em Shared Drive; escrita OK.)");
  }
} catch (e) {
  console.log("FALHA create:", e.message);
  if (/storage quota|do not have storage quota/i.test(e.message)) {
    console.log("\n→ Service accounts NÃO têm espaço próprio.");
    console.log("→ Compartilhe SUA pasta com a service account como Editor, ou use Shared Drive.");
  } else {
    console.log("\n→ Adicione", creds.client_email, "como Editor na pasta ou membro do Shared Drive.");
  }
}
