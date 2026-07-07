import { Router } from 'express';
import { getNotes, saveNotes, getConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export default function notesRoutes(upload) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [notes, config] = await Promise.all([getNotes(), getConfig()]);
    const member = config.members.find(m => m.name === req.session.member);
    res.render('notes', { notes, member: req.session.member, photo: member?.photo || null });
  }));

  router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
    const { content } = req.body;
    const file = req.file;

    if (!file) return res.redirect('/notes');

    const notes = await getNotes();
    const entry = {
      id: Date.now().toString(36),
      author: req.session.member,
      createdAt: new Date().toISOString(),
      photo: await savePhoto(file),
    };

    if (content && content.trim()) {
      entry.content = content.trim();
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
