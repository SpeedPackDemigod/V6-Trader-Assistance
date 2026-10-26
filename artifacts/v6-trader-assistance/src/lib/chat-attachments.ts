const MIME_BY_EXTENSION = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
} as const;

export type SupportedAttachmentMimeType =
  (typeof MIME_BY_EXTENSION)[keyof typeof MIME_BY_EXTENSION];

export type LocalChatAttachment = {
  id: string;
  name: string;
  mimeType: SupportedAttachmentMimeType;
  size: number;
  kind: "image" | "document";
  preview?: string;
  truncated?: boolean;
};

export type StoredChatAttachment = {
  blob: Blob;
  encoding: "base64" | "text";
};

export type PreparedChatAttachment = {
  attachment: LocalChatAttachment;
  stored: StoredChatAttachment;
};

export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_ATTACHMENT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_TEXT_CHARS = 20_000;
export const MAX_ATTACHMENT_BATCH_BYTES = 6 * 1024 * 1024;
export const MAX_DOCUMENT_CONTEXT_CHARS = 40_000;
export const CHAT_ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.csv,.json";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This image could not be prepared. Try another image.")),
      "image/jpeg",
      quality,
    );
  });
}

function makeImagePreview(
  bitmap: ImageBitmap,
): string {
  const maxSize = 160;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This image could not be prepared.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.65);
}

async function prepareImage(
  file: File,
  id: string,
  name: string,
): Promise<PreparedChatAttachment> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot prepare image attachments.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error("Images must be 40 megapixels or smaller.");
    }

    const preview = makeImagePreview(bitmap);
    let output: Blob | undefined;
    for (const [maxDimension, quality] of [
      [1600, 0.8],
      [1200, 0.68],
    ]) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This image could not be prepared.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      output = await canvasToBlob(canvas, quality);
      if (output.size <= 900_000) break;
    }

    if (!output || output.size > 900_000) {
      throw new Error("This image is too large to attach. Choose a smaller image.");
    }

    return {
      attachment: {
        id,
        name,
        mimeType: "image/jpeg",
        size: file.size,
        kind: "image" as const,
        preview,
      },
      stored: { blob: output, encoding: "base64" as const },
    };
  } finally {
    bitmap.close();
  }
}

export async function prepareChatAttachment(
  file: File,
): Promise<PreparedChatAttachment> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = Object.prototype.hasOwnProperty.call(
    MIME_BY_EXTENSION,
    extension,
  )
    ? MIME_BY_EXTENSION[extension as keyof typeof MIME_BY_EXTENSION]
    : undefined;
  if (!mimeType) {
    throw new Error(
      "Unsupported file type. Accepted formats: PNG, JPG/JPEG, WEBP, PDF, TXT, MD, CSV, and JSON.",
    );
  }
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
    throw new Error(`${file.name} exceeds the 5 MB per-file limit.`);
  }

  const id = makeId();
  if (mimeType.startsWith("image/")) {
    return prepareImage(file, id, file.name);
  }

  if (mimeType === "application/pdf") {
    return {
      attachment: {
        id,
        name: file.name,
        mimeType,
        size: file.size,
        kind: "document",
      },
      stored: { blob: file, encoding: "base64" },
    };
  }

  const text = await file.text();
  if (text.length > MAX_ATTACHMENT_TEXT_CHARS) {
    throw new Error(
      `${file.name} exceeds the 20,000-character text limit. Split the file and try again.`,
    );
  }

  return {
    attachment: {
      id,
      name: file.name,
      mimeType,
      size: file.size,
      kind: "document",
    },
    stored: {
      blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
      encoding: "text",
    },
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read an attachment."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read an attachment."));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const DATABASE_NAME = "v6-trader-assistance-chat-files";
const STORE_NAME = "attachments";
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser cannot store chat attachments."));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not store chat attachments."));
  });
  return databasePromise;
}

export async function storeChatAttachment(
  id: string,
  stored: StoredChatAttachment,
): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id, ...stored });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Could not store chat attachments."));
    transaction.onabort = () => reject(new Error("Could not store chat attachments."));
  });
}

export async function readChatAttachment(
  id: string,
): Promise<StoredChatAttachment | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const record = request.result as
        | ({ id: string } & StoredChatAttachment)
        | undefined;
      resolve(record ? { blob: record.blob, encoding: record.encoding } : undefined);
    };
    request.onerror = () => reject(new Error("Could not read chat attachments."));
  });
}

export async function deleteChatAttachments(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Could not remove chat attachments."));
  });
}
