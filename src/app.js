import express from 'express';
import session from 'cookie-session';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import dailyRoutes from './routes/daily.js';
import { requireMember } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', join(__dirname, 'views'));

  // private family archive: keep it out of search engines entirely
  app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
  });

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
  app.use('/daily', requireMember, dailyRoutes(upload));

  // safety net: any error passed to next() (e.g. via asyncHandler) ends up
  // here instead of hanging the request or crashing the whole function
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Bir şeyler ters gitti, lütfen tekrar dene.');
  });

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Ying çalışıyor → http://localhost:${PORT}`);
});

export default app;
