import { Router } from 'express';
import { getDaily, getGoals, getPersonalNotes, getLove, getNotes } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const ADMIN_PASSWORD = 'yuhan1453ts';

export default function adminRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    if (req.session.isAdmin) return res.redirect(`${req.baseUrl}/panel`);
    res.render('admin-login', { error: null, base: req.baseUrl });
  });

  router.post('/', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      return res.redirect(`${req.baseUrl}/panel`);
    }
    res.render('admin-login', { error: 'Yanlış şifre', base: req.baseUrl });
  });

  router.post('/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect(req.baseUrl);
  });

  router.get('/panel', asyncHandler(async (req, res) => {
    if (!req.session.isAdmin) return res.redirect(req.baseUrl);

    const [notes, daily, goals, personal, love] = await Promise.all([
      getNotes(),
      getDaily(),
      getGoals(),
      getPersonalNotes(),
      getLove(),
    ]);

    res.render('admin-panel', { base: req.baseUrl, notes, daily, goals, personal, love });
  }));

  return router;
}
