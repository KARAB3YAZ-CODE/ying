import { Router } from 'express';
import { getNotes, saveNotes, getConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const CATEGORIES = [
  { id: 'cinsiyet', name: 'Kız mı Erkek mi', emoji: '🤰', allowed: ['Yunus', 'İrem', 'Nursene', 'Gizem'] },
  { id: 'teyze', name: 'Teyze Olmak', emoji: '👩‍👧', allowed: ['İrem', 'Nursene'] },
  { id: 'anne', name: 'Anne Olmak', emoji: '👩‍👧‍👦', allowed: ['Gizem'] },
  { id: 'baba', name: 'Baba Olmak', emoji: '👨‍👧‍👦', allowed: ['Yunus'] },
];

export default function notesRoutes(upload) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [notes, config] = await Promise.all([getNotes(), getConfig()]);
    const member = config.members.find(m => m.name === req.session.member);
    const allowedCats = CATEGORIES.filter(c => c.allowed.includes(req.session.member));
    res.render('notes', { notes, member: req.session.member, photo: member?.photo || null, categories: CATEGORIES, allowedCats });
  }));

  router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
    const { content, category } = req.body;
    const file = req.file;

    if ((!content || !content.trim()) && !file) return res.redirect('/notes');

    const cat = CATEGORIES.find(c => c.id === category);
    if (!cat || !cat.allowed.includes(req.session.member)) return res.redirect('/notes');

    const notes = await getNotes();
    const entry = {
      id: Date.now().toString(36),
      author: req.session.member,
      category: cat.id,
      createdAt: new Date().toISOString(),
    };

    if (content && content.trim()) {
      entry.content = content.trim();
    }

    if (file) {
      entry.photo = await savePhoto(file);
    }

    notes.push(entry);
    await saveNotes(notes);
    res.redirect('/notes');
  }));

  router.post('/delete/:id', asyncHandler(async (req, res) => {
    let notes = await getNotes();
    const target = notes.find(n => n.id === req.params.id);
    if (!target || target.author !== req.session.member) return res.redirect('/notes');
    notes = notes.filter(n => n.id !== req.params.id);
    await saveNotes(notes);
    res.redirect('/notes');
  }));

  return router;
}
