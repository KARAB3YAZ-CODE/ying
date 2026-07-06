import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

export async function readJSON(filename) {
  const data = await readFile(join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(data);
}

export async function writeJSON(filename, data) {
  await writeFile(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

export async function getConfig() {
  return readJSON('config.json');
}

export async function saveConfig(config) {
  return writeJSON('config.json', config);
}

export async function getNotes() {
  return readJSON('notes.json');
}

export async function saveNotes(notes) {
  return writeJSON('notes.json', notes);
}
