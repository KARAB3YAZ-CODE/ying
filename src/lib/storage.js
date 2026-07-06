import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'public', 'uploads');

function randomFilename(originalname) {
  const ext = originalname.split('.').pop();
  return Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
}

// Vercel's filesystem is read-only at runtime, so when Blob storage is
// configured we upload there; otherwise (local dev) we write to disk like before.
export async function savePhoto(file) {
  const filename = randomFilename(file.originalname);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob.url;
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(join(UPLOADS_DIR, filename), file.buffer);
  return '/uploads/' + filename;
}
