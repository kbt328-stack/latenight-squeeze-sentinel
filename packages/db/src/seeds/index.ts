import { seedRave } from "./rave.js";

async function seed() {
  await seedRave();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
