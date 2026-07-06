import { Router } from 'express';
import { getConfig, saveConfig } from '../lib/db.js';

export default function profileRoutes(upload) {
  const router = Router();

  router.post('/photo', upload.single('photo'), async (req, res) => {
    const file = req.file;
    if (!file) return res.redirect('/notes');

    const config = await getConfig();
    const member = config.members.find(m => m.name === req.session.member);
    if (member) {
      member.photo = '/uploads/' + file.filename;
      await saveConfig(config);
    }
    res.redirect('/notes');
  });

  return router;
}
