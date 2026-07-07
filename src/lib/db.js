import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

async function readLocalJSON(filename) {
  const data = await readFile(join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(data);
}

async function writeLocalJSON(filename, data) {
  await writeFile(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// Vercel's filesystem is read-only at runtime, so when Redis is configured we
// use it as the source of truth and only fall back to the bundled JSON files
// (in data/) for local dev or as a one-time seed on first read.
async function readValue(key, filename) {
  if (!redis) return readLocalJSON(filename);
  const cached = await redis.get(key);
  if (cached) return cached;
  const seed = await readLocalJSON(filename);
  await redis.set(key, seed);
  return seed;
}

async function writeValue(key, filename, data) {
  if (!redis) {
    if (process.env.VERCEL) {
      throw new Error('Redis yapılandırılmamış (UPSTASH_REDIS_REST_URL/TOKEN veya KV_REST_API_URL/TOKEN eksik).');
    }
    return writeLocalJSON(filename, data);
  }
  await redis.set(key, data);
}

export async function getConfig() {
  return readValue('ying:config', 'config.json');
}

export async function saveConfig(config) {
  return writeValue('ying:config', 'config.json', config);
}

export async function getNotes() {
  return readValue('ying:notes', 'notes.json');
}

export async function saveNotes(notes) {
  return writeValue('ying:notes', 'notes.json', notes);
}

export async function getDaily() {
  return readValue('ying:daily', 'daily.json');
}

export async function saveDaily(daily) {
  return writeValue('ying:daily', 'daily.json', daily);
}

export async function getGoals() {
  return readValue('ying:goals', 'goals.json');
}

export async function saveGoals(goals) {
  return writeValue('ying:goals', 'goals.json', goals);
}
