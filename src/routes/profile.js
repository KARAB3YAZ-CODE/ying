import { Router } from 'express';
import { getConfig, saveConfig } from '../lib/db.js';
import { savePhoto } from '../lib/storage.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export default function profileRoutes(upload) {
  const router = Router();

  router.post('/photo', upload.single('photo'), asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) return res.redirect('/notes');

    const config = await getConfig();
    const member = config.members.find(m => m.name === req.session.member);
    if (member) {
      member.photo = await savePhoto(file);
      await saveConfig(config);
    }
    res.redirect('/notes');
  }));

  return router;
}
