import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Middleware to require login and remember original URL
function requireLogin(req, res, next) {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl; // save where user came from
        return res.redirect('/auth/login');
    }
    next();
}

// -------------------- VIEW WISHLIST --------------------
router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [rows] = await pool.query(
            `SELECT w.book_id, b.title, b.author, b.price, b.image
             FROM wishlist w
                      JOIN books b ON w.book_id = b.id
             WHERE w.user_id = ?`,
            [userId]
        );
        res.render('wishlist/index', { wishlist: rows });
    } catch (err) {
        console.error('Wishlist view error:', err);
        res.status(500).send('Failed to load wishlist');
    }
});

// -------------------- ADD TO WISHLIST --------------------
router.get('/add/:id', requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;

    try {
        await pool.query(
            "INSERT INTO wishlist (user_id, book_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
            [userId, bookId]
        );

        // If user came from a book or home page, send them back there
        const redirectUrl = req.session.returnTo || '/wishlist';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Wishlist add error:', err);
        res.status(500).send('Failed to add to wishlist');
    }
});

// -------------------- REMOVE FROM WISHLIST --------------------
router.post('/remove/:id', requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;

    try {
        await pool.query("DELETE FROM wishlist WHERE user_id = ? AND book_id = ?", [userId, bookId]);
        res.redirect('/wishlist');
    } catch (err) {
        console.error('Wishlist remove error:', err);
        res.status(500).send('Failed to remove from wishlist');
    }
});
// Move item from wishlist to cart
router.post('/move-to-cart/:id', requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;

    try {
        // Remove from wishlist
        await pool.query("DELETE FROM wishlist WHERE user_id = ? AND book_id = ?", [userId, bookId]);

        // Add to cart (or increase quantity if already exists)
        await pool.query(
            "INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
            [userId, bookId]
        );

        req.session.success = 'Book moved to cart!';
        res.redirect('/cart');
    } catch (err) {
        console.error('Move to cart error:', err);
        req.session.error = 'Failed to move book to cart';
        res.redirect('/wishlist');
    }
});
// Move all wishlist items to cart
router.post('/move-all-to-cart', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        // Get all wishlist items
        const [items] = await pool.query(
            "SELECT book_id FROM wishlist WHERE user_id = ?",
            [userId]
        );

        if (items.length === 0) {
            req.session.error = 'Your wishlist is empty';
            return res.redirect('/wishlist');
        }

        // Insert each into cart
        for (const item of items) {
            await pool.query(
                "INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
                [userId, item.book_id]
            );
        }

        // Clear wishlist
        await pool.query("DELETE FROM wishlist WHERE user_id = ?", [userId]);

        req.session.success = 'All wishlist items moved to cart!';
        res.redirect('/cart');
    } catch (err) {
        console.error('Move all to cart error:', err);
        req.session.error = 'Failed to move wishlist items to cart';
        res.redirect('/wishlist');
    }
});

export default router;