import { Router } from 'express';
import { getDaily, saveDaily, getConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

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
    const myPending = daily.pending.filter(p => p.author === req.session.member);

    res.render('daily', {
      member: req.session.member,
      photo: member?.photo || null,
      config,
      pendingCount: daily.pending.length,
      votes: daily.votes,
      myPending,
      revealed: daily.revealed,
      groupedRevealed: groupByDate(daily.revealed),
    });
  }));

  router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
    const { content } = req.body;
    const file = req.file;

    if ((!content || !content.trim()) && !file) return res.redirect('/daily');

    const daily = await getDaily();
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

    daily.pending.push(entry);
    await saveDaily(daily);
    res.redirect('/daily');
  }));

  router.post('/delete/:id', asyncHandler(async (req, res) => {
    const daily = await getDaily();
    const target = daily.pending.find(p => p.id === req.params.id);
    if (!target || target.author !== req.session.member) return res.redirect('/daily');
    daily.pending = daily.pending.filter(p => p.id !== req.params.id);
    await saveDaily(daily);
    res.redirect('/daily');
  }));

  router.post('/vote', asyncHandler(async (req, res) => {
    const [daily, config] = await Promise.all([getDaily(), getConfig()]);
    if (daily.pending.length === 0) return res.redirect('/daily');

    const member = req.session.member;
    if (daily.votes.includes(member)) {
      daily.votes = daily.votes.filter(v => v !== member);
    } else {
      daily.votes.push(member);
    }

    const allVoted = config.members.every(m => daily.votes.includes(m.name));
    if (allVoted) {
      daily.revealed = daily.revealed.concat(daily.pending);
      daily.pending = [];
      daily.votes = [];
    }

    await saveDaily(daily);
    res.redirect('/daily');
  }));

  return router;
}
