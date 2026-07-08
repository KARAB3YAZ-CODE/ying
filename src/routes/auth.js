import { Router } from 'express';
import { getConfig, saveConfig } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

router.get('/', (req, res) => {
  if (req.session.member) return res.redirect('/notes');
  res.render('lock');
});

router.get('/login', asyncHandler(async (req, res) => {
  if (req.session.member) return res.redirect('/notes');
  const config = await getConfig();
  res.render('login', { members: config.members, error: null });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const config = await getConfig();
  const { name, password } = req.body;
  const member = config.members.find(m => m.name.toLowerCase() === name.toLowerCase());

  if (!member) {
    return res.render('login', { members: config.members, error: 'Kullanıcı bulunamadı!' });
  }

  // First login — set password
  if (!member.password) {
    if (!password || password.length < 3) {
      return res.render('login', { members: config.members, error: 'Şifre en az 3 karakter olmalı!' });
    }
    member.password = password;
    await saveConfig(config);
    req.session.member = member.name;
    return res.redirect('/notes');
  }

  // Normal login — verify password
  if (member.password === password) {
    req.session.member = member.name;
    return res.redirect('/notes');
  }

  res.render('login', { members: config.members, error: 'Yanlış şifre!' });
}));

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

export default router;
