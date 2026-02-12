#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER_START = "<!-- AGENT_INDEX:START -->";
export const MARKER_END = "<!-- AGENT_INDEX:END -->";

const INDEX_HEADER = "[Accelerate Core Repo Index]|root: .";
const INDEX_IMPORTANT =
  "|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning";
const MAX_FILES_PER_DIRECTORY = 30;

const INDEX_ROOTS = [
  ".agent-docs",
  "apps",
  "packages",
  "infra/firebase",
  "src",
  "prisma",
  "db",
  "migrations",
  "scripts/agents",
];

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "tmp",
  "tmp_generated",
]);

const EXCLUDED_FILE_SUFFIXES = [".tsbuildinfo"];

function asPosix(value) {
  return value.split(path.sep).join("/");
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function directoryExists(repoRoot, relativeDirectory) {
  try {
    const stats = await fs.stat(path.join(repoRoot, relativeDirectory));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function walkDirectory(repoRoot, absoluteDirectory, directoryToFiles) {
  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      await walkDirectory(repoRoot, path.join(absoluteDirectory, entry.name), directoryToFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (EXCLUDED_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      continue;
    }

    const absoluteFile = path.join(absoluteDirectory, entry.name);
    const relativeFile = asPosix(path.relative(repoRoot, absoluteFile));
    const relativeDirectory = asPosix(path.dirname(relativeFile));
    const files = directoryToFiles.get(relativeDirectory) ?? new Set();
    files.add(entry.name);
    directoryToFiles.set(relativeDirectory, files);
  }
}

export async function collectIndexEntries(repoRoot) {
  const directoryToFiles = new Map();

  for (const relativeDirectory of INDEX_ROOTS) {
    if (!(await directoryExists(repoRoot, relativeDirectory))) {
      continue;
    }

    await walkDirectory(repoRoot, path.join(repoRoot, relativeDirectory), directoryToFiles);
  }

  return directoryToFiles;
}

export function buildIndexLines(directoryToFiles, maxFilesPerDirectory = MAX_FILES_PER_DIRECTORY) {
  const lines = [INDEX_HEADER, INDEX_IMPORTANT];
  const directories = sortStrings(directoryToFiles.keys());

  for (const directory of directories) {
    const files = sortStrings(directoryToFiles.get(directory) ?? []);
    const visibleFiles = files.slice(0, maxFilesPerDirectory);
    const hiddenCount = files.length - visibleFiles.length;
    if (hiddenCount > 0) {
      visibleFiles.push(`...+${hiddenCount}`);
    }

    lines.push(`|${directory}:{${visibleFiles.join(",")}}`);
  }

  return lines;
}

export function buildIndexBlock(directoryToFiles, maxFilesPerDirectory = MAX_FILES_PER_DIRECTORY) {
  return buildIndexLines(directoryToFiles, maxFilesPerDirectory).join("\n");
}

export function injectGeneratedIndex(agentsContent, indexBlock) {
  const startIndex = agentsContent.indexOf(MARKER_START);
  const endIndex = agentsContent.indexOf(MARKER_END, startIndex);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Could not find AGENT_INDEX markers in AGENTS.md. Expected ${MARKER_START} and ${MARKER_END}.`
    );
  }

  const prefix = agentsContent.slice(0, startIndex + MARKER_START.length);
  const suffix = agentsContent.slice(endIndex);
  return `${prefix}\n${indexBlock}\n${suffix}`;
}

export async function generateUpdatedAgentsContent(repoRoot, agentsFile = "AGENTS.md") {
  const agentsPath = path.join(repoRoot, agentsFile);
  const currentContent = await fs.readFile(agentsPath, "utf8");
  const directoryToFiles = await collectIndexEntries(repoRoot);
  const indexBlock = buildIndexBlock(directoryToFiles);
  const updatedContent = injectGeneratedIndex(currentContent, indexBlock);

  return { agentsPath, currentContent, updatedContent, indexBlock };
}

function parseArgs(argv) {
  const checkOnly = argv.includes("--check");
  const unsupported = argv.filter((arg) => arg !== "--check");
  if (unsupported.length > 0) {
    throw new Error(`Unsupported arguments: ${unsupported.join(", ")}`);
  }

  return { checkOnly };
}

export async function runCli(argv = process.argv.slice(2), repoRoot = process.cwd()) {
  const { checkOnly } = parseArgs(argv);
  const { agentsPath, currentContent, updatedContent } = await generateUpdatedAgentsContent(repoRoot);

  if (checkOnly) {
    if (updatedContent !== currentContent) {
      process.stderr.write("AGENTS.md index is out of date. Run `npm run agents:index`.\n");
      return 1;
    }

    process.stdout.write("AGENTS.md index is up to date.\n");
    return 0;
  }

  if (updatedContent !== currentContent) {
    await fs.writeFile(agentsPath, updatedContent, "utf8");
    process.stdout.write("AGENTS.md index updated.\n");
  } else {
    process.stdout.write("AGENTS.md index already up to date.\n");
  }

  return 0;
}

const isCliEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntryPoint) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
