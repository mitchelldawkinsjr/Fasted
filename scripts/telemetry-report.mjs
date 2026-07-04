#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const TABLE = 'telemetry_events';
const LEVELS = new Set(['error', 'warning', 'info']);

function parseArgs(argv) {
  const options = {
    limit: 25,
    hours: undefined,
    level: undefined,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }
      i += 1;
      return value;
    };

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit') {
      options.limit = Number.parseInt(readValue(), 10);
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
    } else if (arg === '--hours') {
      options.hours = Number.parseFloat(readValue());
    } else if (arg.startsWith('--hours=')) {
      options.hours = Number.parseFloat(arg.slice('--hours='.length));
    } else if (arg === '--level') {
      options.level = readValue();
    } else if (arg.startsWith('--level=')) {
      options.level = arg.slice('--level='.length);
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 500) {
    throw new Error('--limit must be an integer from 1 to 500');
  }
  if (options.hours !== undefined && (!Number.isFinite(options.hours) || options.hours <= 0)) {
    throw new Error('--hours must be a positive number');
  }
  if (options.level && !LEVELS.has(options.level)) {
    throw new Error('--level must be one of: error, warning, info');
  }

  return options;
}

function printUsage() {
  console.log(`Usage:
  SUPABASE_URL=https://api.example.com \\
  SUPABASE_SERVICE_ROLE_KEY=... \\
  npm run telemetry:report -- [--limit 25] [--hours 24] [--level error] [--json]
`);
}

function env(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

function truncate(value, maxLength = 160) {
  const text = String(value ?? '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function formatContext(context) {
  if (!context || Object.keys(context).length === 0) return '';
  return truncate(JSON.stringify(context), 240);
}

try {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = client
    .from(TABLE)
    .select('created_at, reported_at, level, message, context, path, user_agent, user_id')
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.level) {
    query = query.eq('level', options.level);
  }
  if (options.hours !== undefined) {
    const since = new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (options.json) {
    console.log(JSON.stringify(data ?? [], null, 2));
  } else if (!data || data.length === 0) {
    console.log('No telemetry events found.');
  } else {
    for (const event of data) {
      console.log(
        `[${event.created_at}] ${String(event.level).toUpperCase()} ${truncate(event.message)}`,
      );
      if (event.path) console.log(`  path: ${event.path}`);
      if (event.user_id) console.log(`  user: ${event.user_id}`);
      const context = formatContext(event.context);
      if (context) console.log(`  context: ${context}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
