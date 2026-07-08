import { Router } from 'express';
import { getDaily, saveDaily, getConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const MEMBERS = ['Yunus', 'İrem', 'Nursene', 'Gizem'];

function normalize(daily) {
  if (!daily.rounds) daily.rounds = [];
  if (!daily.activeRound) daily.activeRound = null;
  return daily;
}

async function getOrCreateActiveRound(daily) {
  if (daily.activeRound) {
    const found = daily.rounds.find(r => r.id === daily.activeRound && !r.revealed);
    if (found) return found;
  }
  // Create new round
  const round = {
    id: Date.now().toString(36),
    startDate: new Date().toISOString(),
    revealed: false,
    revealedAt: null,
    entries: [],
    approvedBy: [],
  };
  daily.rounds.push(round);
  daily.activeRound = round.id;
  await saveDaily(daily);
  return round;
}

function entryStatus(round) {
  const written = {};
  round.entries.forEach(e => { written[e.author] = true; });
  return MEMBERS.map(m => ({
    name: m,
    wrote: !!written[m],
    approved: round.approvedBy.includes(m),
  }));
}

export default function dailyRoutes(upload) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [raw, config] = await Promise.all([getDaily(), getConfig()]);
    const daily = normalize(raw);
    const member = config.members.find(m => m.name === req.session.member);
    const round = await getOrCreateActiveRound(daily);

    const myEntry = round.entries.find(e => e.author === req.session.member);
    const status = entryStatus(round);

    res.render('daily', {
      member: req.session.member,
      photo: member?.photo || null,
      config,
      round,
      myEntry,
      status,
      allApproved: round.approvedBy.length >= MEMBERS.length,
      totalMembers: MEMBERS.length,
      previousRounds: daily.rounds.filter(r => r.revealed).reverse(),
    });
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    const daily = normalize(await getDaily());
    const round = await getOrCreateActiveRound(daily);
    res.json({
      status: entryStatus(round),
      allApproved: round.approvedBy.length >= MEMBERS.length,
      revealed: round.revealed,
      id: round.id,
    });
  }));

  router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
    const { content } = req.body;
    const file = req.file;

    if ((!content || !content.trim()) && !file) return res.redirect('/daily');

    const daily = normalize(await getDaily());
    const round = await getOrCreateActiveRound(daily);
    const author = req.session.member;

    // Check if already wrote this round
    if (round.entries.find(e => e.author === author)) return res.redirect('/daily');

    const entry = {
      author,
      createdAt: new Date().toISOString(),
    };

    if (content && content.trim()) {
      entry.content = content.trim();
    }

    if (file) {
      entry.photo = await savePhoto(file);
    }

    round.entries.push(entry);

    // Auto-approve when writing
    if (!round.approvedBy.includes(author)) {
      round.approvedBy.push(author);
    }

    // Check if all approved → reveal
    if (round.approvedBy.length >= MEMBERS.length) {
      round.revealed = true;
      round.revealedAt = new Date().toISOString();
    }

    await saveDaily(daily);
    res.redirect('/daily');
  }));

  router.post('/approve', asyncHandler(async (req, res) => {
    const daily = normalize(await getDaily());
    const round = await getOrCreateActiveRound(daily);
    const author = req.session.member;

    // Must have written first
    if (!round.entries.find(e => e.author === author)) return res.redirect('/daily');

    if (!round.approvedBy.includes(author)) {
      round.approvedBy.push(author);
    }

    if (round.approvedBy.length >= MEMBERS.length) {
      round.revealed = true;
      round.revealedAt = new Date().toISOString();
    }

    await saveDaily(daily);
    res.redirect('/daily');
  }));

  return router;
}
