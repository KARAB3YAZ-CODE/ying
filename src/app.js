import express from 'express';
import session from 'cookie-session';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import { requireMember } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const upload = multer({
    storage: multer.diskStorage({
      destination: join(__dirname, 'public', 'uploads'),
      filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(join(__dirname, 'public')));
  app.use(session({
    name: 'ying',
    secret: 'ying-secret-key-2026',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  }));

  app.use(authRoutes);
  app.use('/notes', requireMember, notesRoutes(upload));

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Ying çalışıyor → http://localhost:${PORT}`);
});

export default app;
