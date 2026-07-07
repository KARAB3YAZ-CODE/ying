import { Router } from 'express';
import { getLove, saveLove, getConfig } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const APPROVERS = ['Yunus', 'Gizem'];

export default function loveRoutes() {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [love, config] = await Promise.all([getLove(), getConfig()]);
    const member = req.session.member;
    const writtenBy = love.entries.map(e => e.author);

    res.render('love', {
      member,
      photo: config.members.find(m => m.name === member)?.photo || null,
      config,
      approvers: APPROVERS,
      votes: love.votes,
      canVote: APPROVERS.includes(member),
      revealed: love.revealed,
      writtenBy,
      alreadyWrote: writtenBy.includes(member),
      entries: love.revealed ? love.entries : [],
    });
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    const love = await getLove();
    res.json({
      revealed: love.revealed,
      votes: love.votes,
      writtenBy: love.entries.map(e => e.author),
    });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) return res.redirect('/love');

    const love = await getLove();
    if (love.revealed) return res.redirect('/love');
    if (love.entries.some(e => e.author === req.session.member)) return res.redirect('/love');

    love.entries.push({
      id: Date.now().toString(36),
      author: req.session.member,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });

    await saveLove(love);
    res.redirect('/love');
  }));

  router.post('/vote', asyncHandler(async (req, res) => {
    if (!APPROVERS.includes(req.session.member)) return res.redirect('/love');

    const love = await getLove();
    if (love.revealed) return res.redirect('/love');

    const member = req.session.member;
    if (love.votes.includes(member)) {
      love.votes = love.votes.filter(v => v !== member);
    } else {
      love.votes.push(member);
    }

    if (APPROVERS.every(a => love.votes.includes(a))) {
      love.revealed = true;
    }

    await saveLove(love);
    res.redirect('/love');
  }));

  return router;
}
