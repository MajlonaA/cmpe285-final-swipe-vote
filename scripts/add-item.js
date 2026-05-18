const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "..", "data");
const itemsFile = path.join(dataDir, "items.json");
const accents = ["#0f766e", "#e11d48", "#2563eb", "#d97706", "#7c3aed", "#15803d"];

const [name, category, description, imageInput, accentInput] = process.argv.slice(2);

if (!name || !category || !description || !imageInput) {
  console.error(
    'Usage: npm run add-item -- "Name" "Category" "Short description" "cataasPhotoId-or-imageUrl" "#0f766e"'
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

function imageFields(value) {
  if (/^https?:\/\//.test(value)) {
    return {
      image: value,
      imageCredit: "User-provided source",
      imageSource: value
    };
  }

  return {
    image: `https://cataas.com/cat/${value}?width=900&height=700`,
    imageCredit: "CATAAS",
    imageSource: "https://cataas.com",
    externalPhotoId: value
  };
}

fs.mkdirSync(dataDir, { recursive: true });
const items = fs.existsSync(itemsFile) ? JSON.parse(fs.readFileSync(itemsFile, "utf8")) : [];

if (!Array.isArray(items)) {
  console.error("data/items.json must contain an array.");
  process.exit(1);
}

const id = nextCatId(items);
const accent = validAccent(accentInput, accents[items.length % accents.length]);
items.push({
  id,
  name,
  category,
  description,
  ...imageFields(imageInput),
  accent
});

fs.writeFileSync(itemsFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Added ${name} as ${id}.`);
