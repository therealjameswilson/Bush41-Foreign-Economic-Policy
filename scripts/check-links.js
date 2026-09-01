#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/volume.json"), "utf8"));
const urls = [
  data.meta.officialUrl,
  ...data.records.flatMap((record) => [record.catalogUrl, record.pdfUrl]),
  ...(data.nscCollections || []).flatMap((collection) => [
    collection.catalogUrl,
    ...collection.fileUnits.flatMap((fileUnit) => [fileUnit.catalogUrl, fileUnit.pdfUrl]),
  ]),
  ...data.publicReferences.map((record) => record.url),
  ...data.sourceCollections.map((source) => source.url),
].filter(Boolean);

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const uniqueUrls = [...new Set(urls)];
  const results = [];
  const queue = [...uniqueUrls];
  const concurrency = 8;

  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const url = queue.shift();
      results.push(await check(url));
    }
  }));

  results.sort((a, b) => a.url.localeCompare(b.url));
  const blocked = results.filter((result) => isExpectedHostBlock(result));
  const failures = results.filter((result) => !result.ok && !isExpectedHostBlock(result));
  const report = {
    checkedAt: new Date().toISOString(),
    total: results.length,
    ok: results.filter((result) => result.ok).length,
    blocked: blocked.length,
    failed: failures.length,
    blockedResults: blocked,
    failures,
    results,
  };

  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/link-check.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Checked ${report.total} unique official URLs: ${report.ok} reachable, ${report.blocked} host-blocked, ${report.failed} failed.`);
  blocked.forEach((result) => console.warn(`${result.status}\t${result.url}\thost blocks automated requests`));
  if (failures.length) {
    failures.forEach((failure) => console.error(`${failure.status || "ERR"}\t${failure.url}\t${failure.error || ""}`));
    process.exitCode = 1;
  }
}

function isExpectedHostBlock(result) {
  return result.status === 403 && new URL(result.url).hostname === "history.state.gov";
}

async function check(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Bush41-Foreign-Economic-Policy link audit" },
    });
    if (response.status === 403 || response.status === 405) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-1023", "user-agent": "Bush41-Foreign-Economic-Policy link audit" },
      });
    }
    return { url, ok: response.ok, status: response.status, finalUrl: response.url };
  } catch (error) {
    return { url, ok: false, status: null, error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}
