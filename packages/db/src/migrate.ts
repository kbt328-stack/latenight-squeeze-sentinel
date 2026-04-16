import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const sql = postgres(url, { max: 1 });

  await sql`
    CREATE TABLE IF NOT EXISTS _sentinel_migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const migrationsDir = join(__dirname, 'migrations');
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const applied = await sql`SELECT 1 FROM _sentinel_migrations WHERE name = ${file}`;
    if (applied.length > 0) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }
    console.log(`Applying ${file}...`);
    const content = await readFile(join(migrationsDir, file), 'utf8');
    await sql.unsafe(content);
    await sql`INSERT INTO _sentinel_migrations (name) VALUES (${file})`;
    console.log(`Applied ${file}`);
  }

  await sql.end();
  console.log('Migrations complete.');
}

migrate().catch(err => { console.error(err); process.exit(1); });
