const fs = require("node:fs");
const fsp = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const itemsFile = path.join(rootDir, "data", "items.json");

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`${url} returned HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timed out downloading ${url}`));
    });
    request.on("error", reject);
  });
}

async function main() {
  const items = JSON.parse(await fsp.readFile(itemsFile, "utf8"));
  for (const item of items) {
    if (!item.image.startsWith("/images/cats/")) {
      continue;
    }

    const destination = path.join(publicDir, item.image);
    await fsp.mkdir(path.dirname(destination), { recursive: true });

    const existing = await fsp.stat(destination).catch(() => null);
    if (existing && existing.size > 0) {
      continue;
    }

    const source = item.remoteImage || `https://cataas.com/cat/${item.externalPhotoId}`;
    await download(source, destination);
    console.log(`Cached ${item.id} from ${source}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
