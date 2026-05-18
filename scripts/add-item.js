const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "..", "data");
const itemsFile = path.join(dataDir, "items.json");
const accents = ["#0f766e", "#e11d48", "#2563eb", "#d97706", "#7c3aed", "#15803d"];

const [name, category, description, accentInput] = process.argv.slice(2);

if (!name || !category || !description) {
  console.error('Usage: npm run add-item -- "Name" "Category" "Short description" "#0f766e"');
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
  image: `/images/${id}.svg`,
  accent
});

fs.writeFileSync(itemsFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Added ${name} as ${id}.`);
