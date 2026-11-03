#!/usr/bin/env node
/**
 * Guards regenerated adapters-api auth: BaseService expects authentications.PrivateToken.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "testit-js-commons", "src", "adapters-api", "src");
const client = fs.readFileSync(path.join(root, "ApiClient.js"), "utf8");

if (!/authentications\s*=\s*\{[\s\S]*?['"]PrivateToken['"]\s*:/.test(client)) {
  console.error('FAIL: ApiClient.authentications must include "PrivateToken"');
  process.exit(1);
}
if (client.includes("Bearer or PrivateToken")) {
  console.error('FAIL: rename "Bearer or PrivateToken" back to PrivateToken (+ Cookies)');
  process.exit(1);
}

const apiDir = path.join(root, "api");
for (const file of fs.readdirSync(apiDir).filter((f) => f.endsWith(".js"))) {
  const text = fs.readFileSync(path.join(apiDir, file), "utf8");
  for (const match of text.matchAll(/authNames\s*=\s*\[([^\]]+)\]/g)) {
    if (!match[1].includes("PrivateToken")) {
      console.error(`FAIL: ${file} authNames missing PrivateToken: [${match[1]}]`);
      process.exit(1);
    }
  }
}

console.log("OK: PrivateToken auth contract");
