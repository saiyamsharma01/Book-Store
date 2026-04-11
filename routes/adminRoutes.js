import express from 'express';
import multer from 'multer';
import slugify from 'slugify';

import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { getAllBooks, getBookById, createBook, updateBook, deleteBook } from '../models/bookModel.js';
import { getAllCategories, deleteCategory, getCategoryStats } from '../models/categoryModel.js';
import pool from '../config/db.js';
import db from '../config/db.js';   // adjust path to your db.js file
const router = express.Router();
const upload = multer({ dest: 'public/uploads/books/' });

// Protect all admin routes
router.use(requireAuth, requireAdmin);

// ======================
// Admin Dashboard
// ======================
// Admin Dashboard
router.get('/', async (req, res) => {
    const [books] = await pool.query('SELECT * FROM books ORDER BY title');
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
    const categoryStats = await getCategoryStats();

    const [orders] = await pool.query(
        `SELECT o.*, u.name AS customer_name, u.email
         FROM orders o
                  JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC LIMIT 5`
    );

    const [users] = await pool.query(
        `SELECT id, name, email, role, created_at 
     FROM users 
     ORDER BY created_at DESC LIMIT 5`
    );

    res.render('admin/dashboard', {
        books,
        categories,
        categoryStats,
        orders,
        users,
        success: req.session.success,
        error: req.session.error
    });

    req.session.success = null;
    req.session.error = null;
});
// ======================
// Admin Search
// ======================
router.get('/search', async (req, res) => {
    const q = req.query.q?.trim();
    if (!q) {
        return res.render('admin/search', { users: [], orders: [], query: '' });
    }

    try {
        // Search users
        const [users] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ?',
            [`%${q}%`, `%${q}%`]
        );

        // Search orders (with address info)
        const [orders] = await pool.query(
            `SELECT o.id, o.created_at, o.total, o.status, o.payment_mode,
                    u.email, u.name AS customer_name,
                    a.street AS street, a.city AS city, a.state AS state, a.zip AS zip
             FROM orders o
                      JOIN users u ON o.user_id = u.id
                      LEFT JOIN addresses a ON o.address_id = a.id
             WHERE CAST(o.id AS CHAR) LIKE ? OR u.email LIKE ? OR u.name LIKE ?
             ORDER BY o.created_at DESC`,
            [`%${q}%`, `%${q}%`, `%${q}%`]
        );

        // Attach items to each order
        for (const order of orders) {
            const [items] = await pool.query(
                `SELECT oi.quantity, b.title
                 FROM order_items oi
                          JOIN books b ON oi.book_id = b.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.render('admin/search', { users, orders, query: q });
    } catch (err) {
        console.error('Admin search error:', err);
        req.session.error = 'Search failed. Please try again.';
        res.redirect('/admin');
    }
});
// ======================
// Categories Management
// ======================
router.get('/categories/new', (req, res) => {
    res.render('admin/category_form', {
        category: null,
        formAction: '/admin/categories'
    });
});

router.get('/categories/:id/edit', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    const category = rows[0];
    res.render('admin/category_form', {
        category,
        formAction: `/admin/categories/${category.id}`
    });
});

router.post('/categories', async (req, res) => {
    const { name } = req.body;
    const slug = slugify(name, { lower: true });
    await pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    req.session.success = 'Category created!';
    res.redirect('/admin');
});

router.post('/categories/:id', async (req, res) => {
    const { name } = req.body;
    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
    req.session.success = 'Category updated!';
    res.redirect('/admin');
});

router.post('/categories/:id/delete', async (req, res) => {
    await deleteCategory(req.params.id);
    req.session.success = 'Category deleted!';
    res.redirect('/admin');
});

// ======================
// Books Management
// ======================
// New book form
router.get('/books/new', async (req, res) => {
    try {
        const categories = await getAllCategories();
        res.render('admin/book_form', { book: null, categories, success: req.flash('success'), error: req.flash('error') });
    } catch (err) {
        console.error('Error loading new book form:', err);
        req.flash('error', 'Failed to load form');
        res.redirect('/admin/books');
    }
});

// Edit book form
router.get('/books/:id/edit', async (req, res) => {
    try {
        const book = await getBookById(req.params.id);
        const categories = await getAllCategories();
        res.render('admin/book_form', { book, categories, success: req.flash('success'), error: req.flash('error') });
    } catch (err) {
        console.error('Error loading edit form:', err);
        req.flash('error', 'Failed to load book');
        res.redirect('/admin/books');
    }
});

// Create book
router.post('/books', upload.single('image'), async (req, res) => {
    try {
        const { title, author, description, price, stock, category_id } = req.body;
        const image = req.file ? `/uploads/books/${req.file.filename}` : null;

        await createBook({ title, author, description, price, stock, image, category_id });

        req.flash('success', 'Book created successfully!');
        res.redirect('/admin/books');
    } catch (err) {
        console.error('Error creating book:', err);
        req.flash('error', 'Failed to create book');
        res.redirect('/admin/books');
    }
});

// Update book
router.post('/books/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, author, description, price, stock, category_id, current_image } = req.body;

        // Defensive parsing
        const image = req.file
            ? `/uploads/books/${req.file.filename}`
            : current_image || null;

        await updateBook(req.params.id, {
            title: title?.trim(),
            author: author?.trim(),
            description: description?.trim(),
            price: parseFloat(price),
            stock: parseInt(stock),
            image,
            category_id: parseInt(category_id)
        });

        // Flash message (one-time)
        req.flash('success', 'Book updated successfully!');
        return res.redirect('/admin/books');
    } catch (err) {
        console.error('Error updating book:', err);
        req.flash('error', 'Failed to update book');
        return res.redirect(`/admin/books/${req.params.id}/edit`);
    }
});

// Delete book
router.post('/books/:id/delete', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        if (!bookId) {
            req.flash('error', 'Invalid book ID');
            return res.redirect('/admin/books');
        }

        await deleteBook(bookId);

        req.flash('success', 'Book deleted successfully!');
        return res.redirect('/admin/books');
    } catch (err) {
        console.error('Error deleting book:', err);
        req.flash('error', 'Failed to delete book');
        return res.redirect('/admin/books');
    }
});
// ======================
// Orders Management
// ======================
// ======================
// Orders Management
// ======================
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.id, o.total, o.status, o.created_at,
                    o.payment_mode, o.razorpay_order_id,
                    o.user_id,
                    u.name AS customer_name, u.email,
                    a.street, a.city, a.state, a.zip
             FROM orders o
                      JOIN users u ON o.user_id = u.id
                      LEFT JOIN addresses a ON o.address_id = a.id
             ORDER BY o.created_at DESC`
        );

        res.render('admin/orders', {
            orders,
            success: req.session.success,
            error: req.session.error,
            activePage: 'orders',
            showAdminNav: true
        });

        req.session.success = null;
        req.session.error = null;
    } catch (err) {
        console.error('Error fetching orders:', err);
        req.session.error = 'Failed to load orders';
        res.redirect('/admin');
    }
});
// Update order status
router.post('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        req.session.success = 'Order status updated!';
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order status:', err);
        req.session.error = 'Failed to update order status';
        res.redirect('/admin/orders');
    }
});

// Delete order
router.post('/orders/:id/delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        req.session.success = 'Order deleted!';
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error deleting order:', err);
        req.session.error = 'Failed to delete order';
        res.redirect('/admin/orders');
    }
});

// ======================
// User Management (basic)
// ======================
// ======================
// Users Management
// ======================

// List all users
// View all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC'
        );
        console.log('Fetched users:', users); // Debug
        res.render('admin/users', {
            users,
            success: req.session.success,
            error: req.session.error,
            activePage: 'users',
            showAdminNav: true
        });
        req.session.success = null;
        req.session.error = null;
    } catch (err) {
        console.error('Error fetching users:', err);
        req.session.error = 'Failed to load users';
        res.redirect('/admin');
    }
});

// Edit user form
router.get('/users/:id/edit', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [req.params.id]
        );
        const user = rows[0];

        if (!user) {
            req.session.error = 'User not found';
            return res.redirect('/admin/users');
        }

        res.render('admin/user_form', {
            user,
            formAction: `/admin/users/${user.id}`,
            activePage: 'users',
            showAdminNav: true,
            success: req.session.success || null,
            error: req.session.error || null
        });

        // clear flash messages after render
        req.session.success = null;
        req.session.error = null;
    } catch (err) {
        console.error('Error loading user for edit:', err);
        req.session.error = 'Failed to load user';
        res.redirect('/admin/users');
    }
});
// Update user
router.post('/users/:id', async (req, res) => {
    const { name, email, role } = req.body;
    try {
        await pool.query(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [name, email, role, req.params.id]
        );
        req.session.success = 'User updated!';
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error updating user:', err);
        req.session.error = 'Failed to update user';
        res.redirect(`/admin/users/${req.params.id}/edit`);
    }
});

// Delete user
router.post('/users/:id/delete', async (req, res) => {
    try {
        const userId = req.params.id;

        // Validate ID
        if (!userId) {
            req.flash('error', 'Invalid user ID');
            return res.redirect('/admin/users');
        }

        // Attempt delete
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            req.flash('error', 'User not found');
        } else {
            req.flash('success', 'User deleted successfully!');
        }

        return res.redirect('/admin/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        req.flash('error', 'Failed to delete user');
        return res.redirect('/admin/users');
    }
});
router.get('/feedbacks', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM feedbacks ORDER BY created_at DESC');

        res.render('admin/feedbacks', {
            feedbacks: rows,
            activePage: 'feedbacks',
            showAdminNav: true, // ✅ ensures admin navbar shows
            session: req.session,
            flash: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (err) {
        console.error('Error loading feedbacks:', err);
        req.flash('error', 'Could not load feedbacks');
        res.redirect('/admin');
    }
});
router.post('/feedbacks/delete/:id', async (req, res) => {
    const feedbackId = req.params.id;
    try {
        await pool.query("DELETE FROM feedbacks WHERE id = ?", [feedbackId]);
        req.flash('success', 'Feedback deleted successfully!');
        res.redirect('/admin/feedbacks');
    } catch (err) {
        console.error('Delete feedback error:', err);
        req.flash('error', 'Failed to delete feedback.');
        res.redirect('/admin/feedbacks');
    }
});
router.get('/books', async (req, res) => {
    try {
        const [books] = await pool.query(
            'SELECT id, title, author, price, stock, image, created_at FROM books ORDER BY created_at DESC'
        );

        res.render('admin/books/index', {
            books,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });
    } catch (err) {
        console.error('Error fetching books:', err);
        req.flash('error', 'Failed to load books');
        res.redirect('/admin/dashboard');
    }
});
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query(
            'SELECT id, name, icon, created_at FROM categories ORDER BY created_at DESC'
        );
        res.render('admin/categories/index', { categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        req.flash('error', 'Failed to load categories');
        res.redirect('/admin/dashboard');
    }
});

export default router;