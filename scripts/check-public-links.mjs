#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "public-links.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const failures = [];

for (const pattern of config.forbiddenPatterns || []) {
  const hits = scanForPattern(root, pattern);
  if (hits.length) failures.push(`Forbidden pattern "${pattern}" found:\n${hits.join("\n")}`);
}

for (const link of config.links || []) {
  await checkUrl(link);
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`OK: ${config.links.length} public links checked`);

async function checkUrl(link) {
  let response;
  try {
    response = await fetch(link.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000) });
  } catch (error) {
    failures.push(`${link.name}: fetch failed for ${link.url}: ${error.message}`);
    return;
  }
  if (![200, 301, 302, 303, 307, 308].includes(response.status)) {
    failures.push(`${link.name}: unexpected HTTP ${response.status} for ${link.url}`);
  }
  await checkCertificate(link);
}

async function checkCertificate(link) {
  const url = new URL(link.url);
  if (url.protocol !== "https:") return;
  const port = Number(url.port || 443);
  await new Promise((resolve) => {
    const socket = tls.connect({
      host: url.hostname,
      port,
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: 8000,
    }, () => {
      const cert = socket.getPeerCertificate();
      const validTo = Date.parse(cert.valid_to);
      const daysLeft = Math.floor((validTo - Date.now()) / 86400000);
      if (cert.subject?.CN !== config.host && !String(cert.subjectaltname || "").includes(`DNS:${config.host}`)) {
        failures.push(`${link.name}: certificate does not match ${config.host}`);
      }
      if (daysLeft < 14) failures.push(`${link.name}: certificate expires in ${daysLeft} days`);
      socket.end();
      resolve();
    });
    socket.on("error", (error) => {
      failures.push(`${link.name}: TLS failed for ${link.url}: ${error.message}`);
      resolve();
    });
    socket.on("timeout", () => {
      failures.push(`${link.name}: TLS timeout for ${link.url}`);
      socket.destroy();
      resolve();
    });
  });
}

function scanForPattern(dir, pattern) {
  const hits = [];
  const ignored = new Set([".git", "node_modules", "tmp"]);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...scanForPattern(fullPath, pattern));
      continue;
    }
    if (fullPath === configPath) continue;
    if (!/\.(html|js|mjs|json|md|css|service|sh)$/i.test(entry.name)) continue;
    const text = fs.readFileSync(fullPath, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes(pattern)) hits.push(`${path.relative(root, fullPath)}:${index + 1}: ${line.trim().slice(0, 180)}`);
    });
  }
  return hits;
}
