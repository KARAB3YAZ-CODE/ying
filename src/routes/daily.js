import { Router } from 'express';
import { getDaily, saveDaily, getConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function groupByDate(items) {
  const groups = [];
  const byLabel = {};
  items.slice().reverse().forEach((item) => {
    const label = new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!byLabel[label]) {
      byLabel[label] = { label, items: [] };
      groups.push(byLabel[label]);
    }
    byLabel[label].items.push(item);
  });
  return groups;
}

export default function dailyRoutes(upload) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [daily, config] = await Promise.all([getDaily(), getConfig()]);
    const member = config.members.find(m => m.name === req.session.member);

    const now = Date.now();
    const lastEntryAt = daily.lastEntryAt ? new Date(daily.lastEntryAt).getTime() : null;
    const cooldownUntil = lastEntryAt ? lastEntryAt + COOLDOWN_MS : 0;
    const canWrite = !lastEntryAt || now >= cooldownUntil;
    const msLeft = canWrite ? 0 : cooldownUntil - now;

    res.render('daily', {
      member: req.session.member,
      photo: member?.photo || null,
      config,
      canWrite,
      msLeft,
      lastEntryAuthor: daily.lastEntryAt
        ? daily.entries[daily.entries.length - 1]?.author : null,
      entries: daily.entries,
      groupedEntries: groupByDate(daily.entries),
    });
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    const daily = await getDaily();
    const now = Date.now();
    const lastEntryAt = daily.lastEntryAt ? new Date(daily.lastEntryAt).getTime() : null;
    const cooldownUntil = lastEntryAt ? lastEntryAt + COOLDOWN_MS : 0;
    const canWrite = !lastEntryAt || now >= cooldownUntil;
    const msLeft = canWrite ? 0 : cooldownUntil - now;
    res.json({ canWrite, msLeft, entryCount: daily.entries.length });
  }));

  router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
    const { content } = req.body;
    const file = req.file;

    if ((!content || !content.trim()) && !file) return res.redirect('/daily');

    const daily = await getDaily();
    const now = Date.now();
    const lastEntryAt = daily.lastEntryAt ? new Date(daily.lastEntryAt).getTime() : null;
    const cooldownUntil = lastEntryAt ? lastEntryAt + COOLDOWN_MS : 0;

    if (lastEntryAt && now < cooldownUntil) return res.redirect('/daily');

    const entry = {
      id: Date.now().toString(36),
      author: req.session.member,
      createdAt: new Date().toISOString(),
    };

    if (content && content.trim()) {
      entry.content = content.trim();
    }

    if (file) {
      entry.photo = await savePhoto(file);
    }

    daily.lastEntryAt = new Date().toISOString();
    daily.entries.push(entry);
    await saveDaily(daily);
    res.redirect('/daily');
  }));

  return router;
}