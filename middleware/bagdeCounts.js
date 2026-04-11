// middleware/badgeCounts.js
import pool from '../config/db.js';

export default async function badgeCounts(req, res, next) {
    if (req.session.user) {
        try {
            const [cartRows] = await pool.query(
                "SELECT COUNT(*) AS count FROM cart WHERE user_id = ?",
                [req.session.user.id]
            );
            const [wishlistRows] = await pool.query(
                "SELECT COUNT(*) AS count FROM wishlist WHERE user_id = ?",
                [req.session.user.id]
            );

            req.session.cartCount = cartRows[0].count;
            req.session.wishlistCount = wishlistRows[0].count;
        } catch (err) {
            console.error('Badge counter middleware error:', err);
        }
    }
    next();
}