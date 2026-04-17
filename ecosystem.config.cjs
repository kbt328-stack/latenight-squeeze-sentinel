require('dotenv').config({ path: '/root/squeeze-sentinel/.env' });

module.exports = {
  apps: [
    { name: 'ingest-structural',   script: 'node', args: '--import tsx/esm ingestion/structural.ts',   cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
    { name: 'ingest-setup',        script: 'node', args: '--import tsx/esm ingestion/setup.ts',        cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
    { name: 'ingest-trigger',      script: 'node', args: '--import tsx/esm ingestion/trigger.ts',      cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
    { name: 'ingest-squeeze',      script: 'node', args: '--import tsx/esm ingestion/squeeze.ts',      cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
    { name: 'ingest-distribution', script: 'node', args: '--import tsx/esm ingestion/distribution.ts', cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
    { name: 'scoring-runner',      script: 'node', args: '--import tsx/esm scoring/runner.ts',         cwd: '/root/squeeze-sentinel/workers', interpreter: 'none', env: process.env },
  ]
}
