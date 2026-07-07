import { Router } from 'express';
import { getGoals, saveGoals, getConfig } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const CATEGORIES = [
  { key: 'm6', label: '6 Ay Sonra', months: 6 },
  { key: 'y1', label: '1 Yıl Sonra', months: 12 },
  { key: 'y2', label: '2 Yıl Sonra', months: 24 },
  { key: 'y5', label: '5 Yıl Sonra', months: 60 },
  { key: 'y10', label: '10 Yıl Sonra', months: 120 },
];

function unlockDate(epoch, months) {
  const d = new Date(epoch);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isUnlocked(epoch, months) {
  return Date.now() >= unlockDate(epoch, months).getTime();
}

function daysUntil(date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function goalsRoutes() {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [goals, config] = await Promise.all([getGoals(), getConfig()]);
    const member = config.members.find(m => m.name === req.session.member);

    const categories = CATEGORIES.map((cat) => {
      const unlockAt = unlockDate(goals.epoch, cat.months);
      const unlocked = isUnlocked(goals.epoch, cat.months);
      const catEntries = goals.entries.filter(e => e.category === cat.key);
      const writtenBy = catEntries.map(e => e.author);

      return {
        key: cat.key,
        label: cat.label,
        unlocked,
        unlockDateLabel: unlockAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        daysLeft: unlocked ? 0 : daysUntil(unlockAt),
        writtenBy,
        alreadyWrote: writtenBy.includes(req.session.member),
        entries: unlocked ? catEntries : [],
      };
    });

    res.render('goals', {
      member: req.session.member,
      photo: member?.photo || null,
      config,
      categories,
    });
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    const goals = await getGoals();
    const summary = CATEGORIES.map((cat) => {
      const catEntries = goals.entries.filter(e => e.category === cat.key);
      return {
        key: cat.key,
        unlocked: isUnlocked(goals.epoch, cat.months),
        writtenBy: catEntries.map(e => e.author),
      };
    });
    res.json(summary);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { category, content } = req.body;
    const cat = CATEGORIES.find(c => c.key === category);
    if (!cat || !content || !content.trim()) return res.redirect('/goals');

    const goals = await getGoals();
    const alreadyWrote = goals.entries.some(e => e.category === category && e.author === req.session.member);
    if (alreadyWrote) return res.redirect('/goals');

    goals.entries.push({
      id: Date.now().toString(36),
      author: req.session.member,
      category,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });

    await saveGoals(goals);
    res.redirect('/goals');
  }));

  return router;
}
