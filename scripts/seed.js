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

const photoIds = [
  "04eEQhDfAL8l5nt3",
  "05Xd4JtN14983pns",
  "09wFxpacQzvf9jfM",
  "0B2g7aTANObiqPJJ",
  "0BTTVEVWXNyOgXYd",
  "0C2bQ39x8kuhx31p",
  "0EsIYDG0at0TPpPD",
  "0F0IKAPOdWiE755P",
  "0GC9MRUAqxhBzPyA",
  "0M0Lo3dsYft79xNd",
  "0mstmOIucwiN80jb",
  "0mxliw1UgtFdDkU8",
  "0nnJxjVoMK6GVmRS",
  "0oJmiPshaDZD54M8",
  "0PJwXcTrNzNIzGBJ",
  "0RU7ZkgzyvWv8UJG",
  "0TnOAMpokjANBFVk",
  "0U4jE41oGuUWThFX",
  "0VlkBO6ValjaoeEw",
  "0w0AIO9enndfLoko",
  "0wKeoafTJoIbcem8",
  "0wPxI2kqnJ4DoAI8",
  "0XykxsO1fUAZRtPp",
  "0y2qESHWnriH1CyH",
  "0ycVeWWOWgDcGsYC",
  "0YOo8tXUKraccqJl",
  "0ztFbDrgDV2K7yJ1",
  "11yW0nVicWb0fZzo",
  "14ksbtRkMqKUHxfY",
  "18MD6byVC1yKGpXp",
  "18T0wqXpU3OiGrUb",
  "19Ykh6wwZdgIEL2D",
  "1AKMzDtX4nlk6w5I",
  "1ANDs65qm2hR9o55",
  "1bJraW0IwSPm3MVd",
  "1CF7xZmlX0t8QpgP",
  "1ddeGQUlgfQggW6N",
  "1DrcyohjhwcNaRIz",
  "1DvnD0NaGHwHMoml",
  "1eGEsddyKNwtBJFP",
  "1Egt9OiLoKACJHPw",
  "1frqP6ajw0JzkR1o",
  "1gROXVBHMQ8nLxCQ",
  "1ihNtm9HkcOub9Li",
  "1JcOo3LnevDdZlcq",
  "1KCTvPEcpY7ryO34",
  "1KeQpy7eHqi0SFmc",
  "1KSwqj0a2mTz5ZrF",
  "1LlIgMhb3DfoW4qw",
  "1N2AH31jiY6N9TYc",
  "1NMuf7YAebEz6VTD",
  "1ntkA1kLWffNS2xN",
  "1pV0B3MW24cNSOHg",
  "1q1Ce6mM714NrMKf",
  "1si02A2ZNdeNH3yo",
  "1sUjl4nEmh9OHwJz",
  "1t9Z9QMPYhu5gBDV",
  "1TYt4A7YqwaeMUEF",
  "1wpap8yckt96vOoU",
  "1y0sv9lnCIIiOiiT",
  "1Y3dpssxcbHPEkfO",
  "1Y7TMLfxRN6HmCv0",
  "1ZJqBeUSx5hXK3J8",
  "22aAuf1dsGT4uSOi",
  "22tTAaFI1Q33YBGO",
  "24WlaURCbtQyC5qN",
  "25esBUofRVePPAN5",
  "28ZtVybuyptnWzTM",
  "299YJTAQz9R6cfGP",
  "2AjkEyDta2fk44NE",
  "2Bb8z8bR1w5EFHhz",
  "2bnPzTo1hBCSo4rz",
  "2bPYDRuvU70sbgja",
  "2ChLbdjUjjwehaHV",
  "2e0FOizQ3iNfwgMh",
  "2EGeQU9fUQSmO2Te",
  "2eXYJhGolHqOAKaM",
  "2gakTsWOt6sq3pqS",
  "2ihCjEch6BVdv8Yx",
  "2kKhMn9BCAhMem6V",
  "2LC9Ne6SIMXnIdXZ",
  "2lnVocnpd25cUka7",
  "2lo2luOySDGPFCng",
  "2LTXz5STKmTHCESu",
  "2MLfyVlPy09vZK5c",
  "2n2is2NLgWTV1smC",
  "2PhQ92iE2EVNF0ot",
  "2R4fwl2tPwmSwvp1",
  "2tElvyC3TBtGfWsp",
  "2TZUgzYXLM9SzFmX",
  "2uWNSTyOg2IVBcAL",
  "2VBf3b9iHaTY9vlG",
  "2VcSUtyyFnm45353",
  "2VgBUv9MaBwk5qnK",
  "2wfWxhA4oS7bGUFW",
  "2xkeeR99sD9uaqre",
  "2xsQpqvspMC4OjXs",
  "2XYz3V6PILrrvZn6",
  "2y0sOWAIxL640wjB",
  "37guCJ2aCCt3m360"
];

const pngPhotoIds = new Set([
  "0GC9MRUAqxhBzPyA",
  "0M0Lo3dsYft79xNd",
  "0RU7ZkgzyvWv8UJG",
  "0ycVeWWOWgDcGsYC",
  "1DvnD0NaGHwHMoml",
  "1gROXVBHMQ8nLxCQ",
  "1KSwqj0a2mTz5ZrF",
  "1Y7TMLfxRN6HmCv0",
  "22aAuf1dsGT4uSOi",
  "299YJTAQz9R6cfGP",
  "2ChLbdjUjjwehaHV",
  "2e0FOizQ3iNfwgMh",
  "2gakTsWOt6sq3pqS",
  "2LTXz5STKmTHCESu",
  "2PhQ92iE2EVNF0ot",
  "2VcSUtyyFnm45353"
]);

const items = [];
let serial = 1;

if (photoIds.length < cats.length * moods.length) {
  throw new Error("Not enough real cat photo IDs for the full deck.");
}

for (const [mood, moodDescription] of moods) {
  for (const [name, breed, catDescription] of cats) {
    const id = `cat-${String(serial).padStart(3, "0")}`;
    const photoId = photoIds[serial - 1];
    const extension = pngPhotoIds.has(photoId) ? "png" : "jpg";
    items.push({
      id,
      name: `${name} the ${mood} Cat`,
      category: breed,
      description: `${catDescription} ${moodDescription}`,
      image: `/images/cats/${id}.${extension}`,
      imageCredit: "CATAAS",
      imageSource: "https://cataas.com",
      remoteImage: `https://cataas.com/cat/${photoId}`,
      externalPhotoId: photoId,
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
