export function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.session.error = 'You are not authorized to access admin pages.';
    return res.redirect('/'); // send customers back to their homepage
}