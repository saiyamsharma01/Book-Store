import express from 'express';
import {
    getAllBooks,
    getBookById,
    getBooksByCategoryId
} from '../models/bookModel.js';

import {
    getAllCategories,
    getCategoryBySlug,
    getCategoryStats
} from '../models/categoryModel.js';

import { pool } from '../config/db.js';
import db from '../config/db.js';
import { saveFeedback } from '../models/feedbackModel.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// -------------------- Middleware --------------------
function requireLogin(req, res, next) {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }
    next();
}

// -------------------- HOME --------------------
router.get('/', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        const [books] = await pool.query('SELECT * FROM books ORDER BY title LIMIT 8'); // featured books
        res.render('shop/home', { categories, books });
    } catch (err) {
        console.error('Home page error:', err);
        res.status(500).send('Failed to load home page');
    }
});

// -------------------- BOOK DETAIL --------------------
router.get('/book/:id', async (req, res) => {
    try {
        const book = await getBookById(req.params.id);
        if (!book) return res.status(404).render('shop/book_detail', { book: null });
        res.render('shop/book_detail', { book });
    } catch (err) {
        console.error('Book detail error:', err);
        res.status(500).render('shop/book_detail', { book: null, error: 'Failed to load book' });
    }
});

// -------------------- CATEGORY DETAIL --------------------
router.get('/category/:slug', async (req, res) => {
    try {
        const category = await getCategoryBySlug(req.params.slug);
        if (!category) return res.status(404).send('Category not found');

        const books = await getBooksByCategoryId(category.id);
        const categories = await getAllCategories();
        const stats = await getCategoryStats();

        // Merge stats into categories
        const enriched = categories.map(c => {
            const stat = stats.find(s => s.id === c.id);
            return { ...c, book_count: stat?.book_count || 0 };
        });

        res.render('shop/category', { category, books, categories: enriched });
    } catch (err) {
        console.error('Category detail error:', err);
        res.status(500).send('Failed to load category');
    }
});

// -------------------- SEARCH --------------------
router.get('/search', async (req, res) => {
    const q = req.query.q || '';
    try {
        let results = [];
        if (q) {
            const [rows] = await db.query(
                "SELECT * FROM books WHERE title LIKE ? OR author LIKE ?",
                [`%${q}%`, `%${q}%`]
            );
            results = rows;
        }
        res.render('shop/search', { results, q });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).render('shop/search', { results: [], q, error: 'Search failed' });
    }
});

// -------------------- BOOK DETAIL (fallback) --------------------
router.get('/books/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
        const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [bookId]);
        if (rows.length === 0) {
            return res.status(404).render('shop/book_detail', { book: null });
        }
        res.render('shop/book_detail', { book: rows[0] });
    } catch (err) {
        console.error('Book detail error:', err);
        res.status(500).render('shop/book_detail', { book: null, error: 'Failed to load book' });
    }
});

// -------------------- EXPLORE ALL BOOKS WITH PAGINATION --------------------
router.get('/books', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        const [books] = await db.query(
            "SELECT * FROM books ORDER BY title LIMIT ? OFFSET ?",
            [limit, offset]
        );

        const [[{ count }]] = await db.query("SELECT COUNT(*) AS count FROM books");
        const totalPages = Math.ceil(count / limit);

        res.render('shop/books', { books, page, totalPages });
    } catch (err) {
        console.error('Books listing error:', err);
        res.status(500).send('Failed to load books');
    }
});

// -------------------- EXPLORE ALL CATEGORIES --------------------
router.get('/categories', async (req, res) => {
    try {
        const categories = await getAllCategories();
        const stats = await getCategoryStats();

        const enriched = categories.map(c => {
            const stat = stats.find(s => s.id === c.id);
            return { ...c, book_count: stat?.book_count || 0 };
        });

        res.render('shop/categories', { categories: enriched });
    } catch (err) {
        console.error('Categories listing error:', err);
        res.status(500).render('shop/error', {
            message: 'Something went wrong. Please try again later.'
        });
    }
});

// -------------------- CHECKOUT PAGE --------------------
router.get('/checkout', requireLogin, async (req, res) => {
    try {
        const [cart] = await db.query(
            "SELECT c.*, b.title, b.price FROM cart c JOIN books b ON c.book_id = b.id WHERE c.user_id = ?",
            [req.session.user.id]
        );

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const [addresses] = await db.query("SELECT * FROM addresses WHERE user_id = ?", [req.session.user.id]);

        res.render('shop/checkout', { cart, total, addresses });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).send('Failed to load checkout');
    }
});

// -------------------- CHECKOUT POST --------------------
router.post('/checkout', requireLogin, async (req, res) => {
    try {
        // Clear cart items
        await db.query("DELETE FROM cart WHERE user_id = ?", [req.session.user.id]);

        // ✅ Redirect to order_success route
        res.redirect('/cart/order_success');
    } catch (err) {
        console.error('Place order error:', err);
        res.status(500).send('Failed to place order');
    }
});

// -------------------- FEEDBACK --------------------
router.get('/feedback', (req, res) => {
    res.render('feedback', { activePage: 'contact', session: req.session });
});

router.post('/feedback', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await saveFeedback({ name, email, message });

        // Optional: Send email to admin
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: email,
            to: process.env.ADMIN_EMAIL,
            subject: `New Feedback from ${name}`,
            text: message
        });

        req.flash('success', 'Your message has been sent successfully!');
        res.redirect('/feedback');
    } catch (err) {
        console.error('Feedback error:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/feedback');
    }
});

export default router;