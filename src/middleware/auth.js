export function requireMember(req, res, next) {
  if (!req.session.member) {
    return res.redirect('/login');
  }
  next();
}
