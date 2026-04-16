import postgres from 'postgres';

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Never run reset in production');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const sql = postgres(url, { max: 1 });
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql.end();
  console.log('Database reset. Run pnpm db:migrate && pnpm db:seed');
}

reset().catch(err => { console.error(err); process.exit(1); });
