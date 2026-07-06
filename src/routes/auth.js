import { Router } from 'express';
import { getConfig } from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  if (req.session.member) return res.redirect('/notes');
  res.render('lock');
});

router.get('/login', async (req, res) => {
  if (req.session.member) return res.redirect('/notes');
  const config = await getConfig();
  res.render('login', { members: config.members, error: null });
});

router.post('/login', async (req, res) => {
  const config = await getConfig();
  const { name, password } = req.body;
  const member = config.members.find(
    m => m.name.toLowerCase() === name.toLowerCase() && m.password === password
  );
  if (member) {
    req.session.member = member.name;
    return res.redirect('/notes');
  }
  res.render('login', { members: config.members, error: 'Yanlış şifre!' });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

export default router;
