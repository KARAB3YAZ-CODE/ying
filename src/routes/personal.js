import { Router } from 'express';
import { getPersonalNotes, savePersonalNotes, getConfig } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const AUTHOR = 'Yunus';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function personalRoutes() {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [data, config] = await Promise.all([getPersonalNotes(), getConfig()]);
    const member = req.session.member;
    const photo = config.members.find(m => m.name === member)?.photo || null;
    const today = todayStr();

    if (member === AUTHOR) {
      const recipients = config.members.filter(m => m.name !== AUTHOR);
      const sent = data.entries
        .map(e => ({ ...e, unlocked: e.unlockDate <= today }))
        .sort((a, b) => (a.unlockDate < b.unlockDate ? -1 : 1));

      return res.render('personal', { member, photo, isAuthor: true, recipients, sent });
    }

    const mine = data.entries.filter(e => e.to === member);
    const unlocked = mine.filter(e => e.unlockDate <= today).sort((a, b) => (a.unlockDate < b.unlockDate ? 1 : -1));
    const locked = mine.filter(e => e.unlockDate > today).sort((a, b) => (a.unlockDate < b.unlockDate ? -1 : 1));

    res.render('personal', { member, photo, isAuthor: false, unlocked, locked });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    if (req.session.member !== AUTHOR) return res.redirect('/personal');

    const { to, content, unlockDate } = req.body;
    const config = await getConfig();
    const validRecipient = config.members.some(m => m.name === to && m.name !== AUTHOR);
    if (!validRecipient || !content || !content.trim() || !unlockDate) return res.redirect('/personal');

    const data = await getPersonalNotes();
    data.entries.push({
      id: Date.now().toString(36),
      to,
      content: content.trim(),
      unlockDate,
      createdAt: new Date().toISOString(),
    });

    await savePersonalNotes(data);
    res.redirect('/personal');
  }));

  router.post('/delete/:id', asyncHandler(async (req, res) => {
    if (req.session.member !== AUTHOR) return res.redirect('/personal');

    const data = await getPersonalNotes();
    data.entries = data.entries.filter(e => e.id !== req.params.id);
    await savePersonalNotes(data);
    res.redirect('/personal');
  }));

  return router;
}
