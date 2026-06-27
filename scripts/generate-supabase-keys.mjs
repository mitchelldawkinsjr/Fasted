#!/usr/bin/env node
/**
 * Generate Supabase ANON_KEY and SERVICE_ROLE_KEY from a JWT_SECRET.
 * Usage: node scripts/generate-supabase-keys.mjs <JWT_SECRET>
 */
import crypto from 'crypto';

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

const jwtSecret = process.argv[2];
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('Usage: node scripts/generate-supabase-keys.mjs <JWT_SECRET (32+ chars)>');
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 60 * 60;

const anonKey = signJwt({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret);
const serviceKey = signJwt({ role: 'service_role', iss: 'supabase', iat, exp }, jwtSecret);

console.log(JSON.stringify({ ANON_KEY: anonKey, SERVICE_ROLE_KEY: serviceKey }, null, 2));
