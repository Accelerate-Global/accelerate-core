const CSV_BOM = "\uFEFF";

type JsonRecord = Record<string, unknown>;

function normalizeRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return { value };
}

async function forEachNdjsonRecord(
  stream: ReadableStream<Uint8Array>,
  onRecord: (value: unknown) => Promise<void> | void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lineNumber = 0;

  const processLine = async (lineRaw: string) => {
    lineNumber += 1;
    const line = lineRaw.trim();
    if (!line) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid NDJSON payload at line ${lineNumber}`);
    }
    await onRecord(parsed);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx = buffer.indexOf("\n");
      while (newlineIdx >= 0) {
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
        buffer = buffer.slice(newlineIdx + 1);
        await processLine(line);
        newlineIdx = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      await processLine(buffer.replace(/\r$/, ""));
    }
  } finally {
    reader.releaseLock();
  }
}

function stringifyScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  return JSON.stringify(value);
}

function escapeCsvCell(value: string): string {
  const escaped = value.replaceAll("\"", "\"\"");
  if (/[",\n\r]/.test(value)) return `"${escaped}"`;
  return escaped;
}

export async function collectCsvColumnsFromNdjson(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const keys = new Set<string>();

  await forEachNdjsonRecord(stream, (value) => {
    const record = normalizeRecord(value);
    for (const key of Object.keys(record)) keys.add(key);
  });

  const columns = [...keys].sort((a, b) => a.localeCompare(b));
  return columns.length > 0 ? columns : ["value"];
}

export function createCsvStreamFromNdjson(
  stream: ReadableStream<Uint8Array>,
  columns: string[]
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(CSV_BOM));
        controller.enqueue(encoder.encode(`${columns.map(escapeCsvCell).join(",")}\n`));

        await forEachNdjsonRecord(stream, (value) => {
          const record = normalizeRecord(value);
          const row = columns.map((column) => escapeCsvCell(stringifyScalar(record[column]))).join(",");
          controller.enqueue(encoder.encode(`${row}\n`));
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      void stream.cancel().catch(() => {});
    }
  });
}

export async function convertNdjsonTextToCsvForTest(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const firstPass = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const columns = await collectCsvColumnsFromNdjson(firstPass);

  const secondPass = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const csvStream = createCsvStreamFromNdjson(secondPass, columns);
  const response = new Response(csvStream);
  return response.text();
}
