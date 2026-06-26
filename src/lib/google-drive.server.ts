// Google Drive storage — server-only (service account).
//
// IMPORTANTE: service accounts NÃO têm cota de armazenamento própria.
// Os arquivos devem ir para uma pasta compartilhada pelo usuário OU um Shared Drive.
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

dns.setDefaultResultOrder("ipv4first");

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const driveOpts = { supportsAllDrives: true } as const;
const listOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true } as const;

function getServiceAccountEmail(): string {
  try {
    const creds = getCredentials();
    if (typeof creds.client_email === "string") return creds.client_email;
  } catch {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (keyFile) {
      try {
        const c = readCredentialsFile(keyFile);
        if (typeof c.client_email === "string") return c.client_email;
      } catch { /* ignore */ }
    }
  }
  return "sua-service-account@projeto.iam.gserviceaccount.com";
}

function folderAccessHelp(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
  const email = getServiceAccountEmail();
  return (
    `Pasta do Drive inacessível (ID: ${folderId}). ` +
    `Service accounts não têm armazenamento próprio — compartilhe SUA pasta com ${email} como Editor, ` +
    `ou use um Shared Drive (Google Workspace) e adicione a service account como membro. ` +
    `Ver GOOGLE_DRIVE_SETUP.md`
  );
}

function wrapDriveError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|fetch failed/i.test(msg)) {
    return new Error(
      "Sem conexão com o Google Drive. Verifique internet/VPN e teste: node scripts/test-google-drive.mjs",
    );
  }
  if (/storage quota|do not have storage quota/i.test(msg)) {
    return new Error(
      "Service accounts não têm espaço próprio no Drive. " +
        "Compartilhe uma pasta sua com a service account como Editor " +
        "(os arquivos usam a sua cota), ou configure um Shared Drive. Ver GOOGLE_DRIVE_SETUP.md",
    );
  }
  if (/File not found|not found/i.test(msg)) {
    return new Error(folderAccessHelp());
  }
  return e instanceof Error ? e : new Error(msg);
}

function readCredentialsFile(filePath: string): Record<string, unknown> {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Arquivo de credenciais não encontrado: ${resolved}`);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8")) as Record<string, unknown>;
  } catch {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS aponta para JSON inválido: ${resolved}`);
  }
}

function getCredentials(): Record<string, unknown> {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile?.trim()) return readCredentialsFile(keyFile.trim());

  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON inválido.");
    }
  }

  throw new Error("Credenciais Google ausentes. Ver GOOGLE_DRIVE_SETUP.md");
}

let _drive: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (_drive) return _drive;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const auth = keyFile
    ? new google.auth.GoogleAuth({
        keyFile: path.isAbsolute(keyFile) ? keyFile : path.resolve(process.cwd(), keyFile),
        scopes: [DRIVE_SCOPE],
      })
    : new google.auth.GoogleAuth({
        credentials: getCredentials(),
        scopes: [DRIVE_SCOPE],
      });
  _drive = google.drive({ version: "v3", auth });
  return _drive;
}

let _resolvedRootFolderId: string | null = null;
/** driveId do Shared Drive, quando a pasta raiz estiver em um. */
let _sharedDriveId: string | null | undefined = undefined;

/** Verifica se a service account pode gravar na pasta (usa a cota do dono / Shared Drive). */
async function canWriteToFolder(folderId: string): Promise<boolean> {
  try {
    const drive = getDrive();
    const created = await drive.files.create({
      requestBody: {
        name: `_write_test_${Date.now()}`,
        mimeType: "application/vnd.google-apps.folder",
        parents: [folderId],
      },
      fields: "id",
      ...driveOpts,
    });
    if (!created.data.id) return false;
    // Create com sucesso = permissão OK. Delete do teste pode falhar em Shared Drives.
    try {
      await drive.files.delete({ fileId: created.data.id, ...driveOpts });
    } catch {
      /* ignorar — pasta de teste órfã é inofensiva */
    }
    return true;
  } catch {
    return false;
  }
}

/** Carrega metadados da pasta raiz (incl. Shared Drive). */
async function loadRootFolderMeta(folderId: string): Promise<void> {
  try {
    const drive = getDrive();
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id,driveId",
      ...driveOpts,
    });
    _sharedDriveId = res.data.driveId ?? null;
  } catch {
    _sharedDriveId = null;
  }
}

async function resolveRootFolderId(): Promise<string> {
  if (_resolvedRootFolderId) return _resolvedRootFolderId;

  const configured = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!configured) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID. Ver GOOGLE_DRIVE_SETUP.md");
  }

  if (!(await canWriteToFolder(configured))) {
    throw new Error(folderAccessHelp());
  }

  await loadRootFolderMeta(configured);
  _resolvedRootFolderId = configured;
  return configured;
}

const folderCache = new Map<string, string>();

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const cacheKey = `${parentId}/${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  try {
    const drive = getDrive();
    const escaped = name.replace(/'/g, "\\'");
    const q = `name='${escaped}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const list = await drive.files.list({
      q,
      fields: "files(id)",
      pageSize: 1,
      ...listOpts,
    });
    const existing = list.data.files?.[0]?.id;
    if (existing) {
      folderCache.set(cacheKey, existing);
      return existing;
    }

    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      ...driveOpts,
    });
    const id = created.data.id;
    if (!id) throw new Error(`Failed to create Drive folder: ${name}`);
    folderCache.set(cacheKey, id);
    return id;
  } catch (e) {
    throw wrapDriveError(e);
  }
}

async function resolveParentFolder(subfolders: string[]): Promise<string> {
  let parentId = await resolveRootFolderId();
  for (const segment of subfolders) {
    parentId = await findOrCreateFolder(parentId, segment);
  }
  return parentId;
}

export type UploadResult = {
  fileId: string;
  viewUrl: string;
  contentUrl: string;
};

async function setPublicLink(fileId: string): Promise<void> {
  try {
    const drive = getDrive();
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      ...driveOpts,
    });
  } catch (e) {
    throw wrapDriveError(e);
  }
}

function publicUrls(fileId: string, mimeType: string): { viewUrl: string; contentUrl: string } {
  const isImage = mimeType.startsWith("image/");
  return {
    viewUrl: isImage
      ? `https://drive.google.com/uc?export=view&id=${fileId}`
      : `https://drive.google.com/file/d/${fileId}/view`,
    contentUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
  };
}

export async function uploadFile(opts: {
  name: string;
  buffer: Buffer;
  mimeType: string;
  subfolders?: string[];
}): Promise<UploadResult> {
  try {
    const drive = getDrive();
    const parentId = await resolveParentFolder(opts.subfolders ?? []);
    const stream = Readable.from(opts.buffer);

    const created = await drive.files.create({
      requestBody: { name: opts.name, parents: [parentId] },
      media: { mimeType: opts.mimeType, body: stream },
      fields: "id",
      ...driveOpts,
    });

    const fileId = created.data.id;
    if (!fileId) throw new Error("Drive upload failed: no file id returned");

    await setPublicLink(fileId);
    return { fileId, ...publicUrls(fileId, opts.mimeType) };
  } catch (e) {
    throw wrapDriveError(e);
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    const drive = getDrive();
    await drive.files.delete({ fileId, ...driveOpts });
  } catch (e) {
    throw wrapDriveError(e);
  }
}

/** Extrai file ID de URLs comuns do Google Drive. */
export function extractDriveFileId(url: string): string | null {
  const byQuery = url.match(/[?&]id=([^&]+)/);
  if (byQuery) return byQuery[1];
  const byPath = url.match(/\/file\/d\/([^/]+)/);
  if (byPath) return byPath[1];
  return null;
}

/** Baixa arquivo + tipo MIME (para servir imagens via API). */
export async function downloadFileWithMeta(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const drive = getDrive();
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType",
      ...driveOpts,
    });
    const res = await drive.files.get(
      { fileId, alt: "media", ...driveOpts },
      { responseType: "arraybuffer" },
    );
    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: meta.data.mimeType ?? "application/octet-stream",
    };
  } catch (e) {
    throw wrapDriveError(e);
  }
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  try {
    const drive = getDrive();
    const res = await drive.files.get(
      { fileId, alt: "media", ...driveOpts },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  } catch (e) {
    throw wrapDriveError(e);
  }
}
