import { Router } from 'express';
import { getLove, saveLove, getConfig } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const APPROVERS = ['Yunus', 'Gizem'];

const CATEGORIES = [
  { key: 'gender', label: 'Kız mı Erkek mi?', writers: ['Yunus', 'İrem', 'Nursene', 'Gizem'] },
  { key: 'teyze', label: 'Teyze Olmak Nasıl Bir His?', writers: ['İrem', 'Nursene'] },
  { key: 'anne', label: 'Anne Olmak Nasıl Bir His?', writers: ['Gizem'] },
  { key: 'baba', label: 'Baba Olmak Nasıl Bir His?', writers: ['Yunus'] },
  { key: 'dusunce', label: 'Ne Düşünüyorsunuz?', writers: ['Yunus', 'İrem', 'Nursene', 'Gizem'] },
];

export default function loveRoutes() {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [love, config] = await Promise.all([getLove(), getConfig()]);
    const member = req.session.member;

    const categories = CATEGORIES.map((cat) => {
      const catEntries = love.entries.filter(e => e.category === cat.key);
      const writtenBy = catEntries.map(e => e.author);
      return {
        key: cat.key,
        label: cat.label,
        writers: cat.writers,
        writtenBy,
        canWrite: cat.writers.includes(member) && !writtenBy.includes(member) && !love.revealed,
        entries: love.revealed ? catEntries : [],
      };
    });

    res.render('love', {
      member,
      photo: config.members.find(m => m.name === member)?.photo || null,
      config,
      approvers: APPROVERS,
      votes: love.votes,
      canVote: APPROVERS.includes(member),
      revealed: love.revealed,
      categories,
    });
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    const love = await getLove();
    res.json({
      revealed: love.revealed,
      votes: love.votes,
      writtenBy: CATEGORIES.map(cat => ({
        key: cat.key,
        writers: cat.writers,
        writtenBy: love.entries.filter(e => e.category === cat.key).map(e => e.author),
      })),
    });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { category, content } = req.body;
    const cat = CATEGORIES.find(c => c.key === category);
    if (!cat || !content || !content.trim() || !cat.writers.includes(req.session.member)) {
      return res.redirect('/love');
    }

    const love = await getLove();
    if (love.revealed) return res.redirect('/love');
    if (love.entries.some(e => e.category === category && e.author === req.session.member)) {
      return res.redirect('/love');
    }

    love.entries.push({
      id: Date.now().toString(36),
      author: req.session.member,
      category,
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
