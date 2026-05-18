const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const publicDir = path.join(rootDir, "public");
const itemsFile = path.join(dataDir, "items.json");
const accents = ["#0f766e", "#e11d48", "#2563eb", "#d97706", "#7c3aed", "#15803d"];

const [name, category, description, imageInput, accentInput, creditInput] = process.argv.slice(2);

if (!name || !category || !description || !imageInput) {
  console.error(
    'Usage: npm run add-item -- "Name" "Category" "Short description" "cataasPhotoId-or-imageUrl" "#0f766e" "Photo credit"'
  );
  process.exit(1);
}

function nextCatId(items) {
  const highest = items.reduce((max, item) => {
    const match = /^cat-(\d+)$/.exec(item.id || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `cat-${String(highest + 1).padStart(3, "0")}`;
}

function validAccent(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback;
}

function sourceFor(value) {
  if (/^https?:\/\//.test(value)) {
    return {
      credit: creditInput || "User-provided source",
      source: value,
      remoteImage: value
    };
  }

  return {
    credit: "CATAAS",
    source: "https://cataas.com",
    remoteImage: `https://cataas.com/cat/${value}`,
    externalPhotoId: value
  };
}

function extensionFor(contentType) {
  if (contentType.includes("image/png")) {
    return "png";
  }
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
    return "jpg";
  }
  throw new Error(`Unsupported image content type: ${contentType || "unknown"}`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).toString()).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`${url} returned HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          body: Buffer.concat(chunks),
          contentType: response.headers["content-type"] || ""
        });
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timed out downloading ${url}`));
    });
    request.on("error", reject);
  });
}

async function main() {
  await fsp.mkdir(dataDir, { recursive: true });
  const items = fs.existsSync(itemsFile) ? JSON.parse(await fsp.readFile(itemsFile, "utf8")) : [];

  if (!Array.isArray(items)) {
    throw new Error("data/items.json must contain an array.");
  }

  const id = nextCatId(items);
  const source = sourceFor(imageInput);
  const downloaded = await download(source.remoteImage);
  const extension = extensionFor(downloaded.contentType);
  const relativeImage = `/images/cats/${id}.${extension}`;
  const imagePath = path.join(publicDir, relativeImage);

  await fsp.mkdir(path.dirname(imagePath), { recursive: true });
  await fsp.writeFile(imagePath, downloaded.body);

  const accent = validAccent(accentInput, accents[items.length % accents.length]);
  items.push({
    id,
    name,
    category,
    description,
    image: relativeImage,
    imageCredit: source.credit,
    imageSource: source.source,
    remoteImage: source.remoteImage,
    ...(source.externalPhotoId ? { externalPhotoId: source.externalPhotoId } : {}),
    accent
  });

  await fsp.writeFile(itemsFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`Added ${name} as ${id} and cached ${relativeImage}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
