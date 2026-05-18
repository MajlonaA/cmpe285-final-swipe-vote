const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "..", "data");
const itemsFile = path.join(dataDir, "items.json");
const votesFile = path.join(dataDir, "votes.json");

const cats = [
  ["Mochi", "Tabby", "A curious window watcher who follows sunbeams from room to room."],
  ["Luna", "Tuxedo", "A polite lap cat with a dramatic little white mustache."],
  ["Nimbus", "Russian Blue", "A quiet observer who warms up slowly and then stays close."],
  ["Pepper", "Calico", "A confident explorer with opinions about every cardboard box."],
  ["Biscuit", "Orange Tabby", "A biscuit-making specialist with a loud breakfast announcement."],
  ["Willow", "Siamese Mix", "A talkative companion who likes puzzle toys and shoulder perches."],
  ["Maple", "Tortoiseshell", "A clever climber with a tiny mischievous streak."],
  ["Otis", "Maine Coon Mix", "A gentle giant who prefers slow blinks and soft blankets."],
  ["Pixel", "Domestic Shorthair", "A fast little gamer-cat who chases every moving dot."],
  ["Clover", "Bombay Mix", "A sleek shadow who appears whenever snacks are opened."],
  ["Juno", "Dilute Calico", "A sweet greeter who meets visitors at the door."],
  ["Bean", "Black Shorthair", "A tiny house panther with excellent toy-mouse technique."],
  ["Hazel", "Bengal Mix", "A high-energy jumper who needs shelves, playtime, and praise."],
  ["Saffron", "Cream Tabby", "A mellow nap expert who likes calm rooms and warm laundry."],
  ["Tango", "Ginger Shorthair", "A bold hallway sprinter with a goofy chirp."],
  ["Miso", "Snowshoe Mix", "A gentle blue-eyed cat who loves quiet company."],
  ["Olive", "Torbie", "A smart problem solver who opens doors if you underestimate her."],
  ["Finn", "Gray Tabby", "A loyal desk buddy for homework sessions and late-night coding."],
  ["Skye", "Ragdoll Mix", "A floppy cuddle fan who trusts slowly and deeply."],
  ["Poppy", "White Shorthair", "A bright, tidy cat who enjoys feather wands and high perches."]
];

const moods = [
  ["Cozy", "Best matched with someone who wants a calm evening companion."],
  ["Playful", "Best matched with someone who can schedule real daily play sessions."],
  ["Social", "Best matched with a home that enjoys greeting and gentle attention."],
  ["Independent", "Best matched with patient people who respect space and routine."],
  ["Cuddly", "Best matched with someone who wants a close sofa and study buddy."]
];

const accents = [
  "#0f766e",
  "#e11d48",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#15803d",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#4f46e5"
];

const items = [];
let serial = 1;

for (const [mood, moodDescription] of moods) {
  for (const [name, breed, catDescription] of cats) {
    const id = `cat-${String(serial).padStart(3, "0")}`;
    items.push({
      id,
      name: `${name} the ${mood} Cat`,
      category: breed,
      description: `${catDescription} ${moodDescription}`,
      image: `/images/${id}.svg`,
      accent: accents[(serial - 1) % accents.length]
    });
    serial += 1;
  }
}

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(itemsFile, `${JSON.stringify(items, null, 2)}\n`);

if (!fs.existsSync(votesFile)) {
  fs.writeFileSync(
    votesFile,
    `${JSON.stringify(
      {
        votes: [],
        analytics: {
          totalSwipes: 0,
          totalDecisionMs: 0,
          decisionCount: 0,
          sessionIds: []
        }
      },
      null,
      2
    )}\n`
  );
}

console.log(`Seeded ${items.length} cat profiles in ${itemsFile}`);
