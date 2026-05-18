import express from 'express';
import pool from '../config/db.js';
import { findByEmail, createUser, updateUser } from '../models/userModel.js';
import multer from 'multer';
import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // app password (not your real Gmail password!)
    }
});
const storage = multer.diskStorage({
    destination: 'public/uploads',
    filename: (req, file, cb) => {
        if (!req.session.user) return cb(new Error('Not logged in'));
        const ext = file.originalname.split('.').pop();
        cb(null, `avatar-${req.session.user.id}.${ext}`);
    }
});
const upload = multer({ storage });
const router = express.Router();

// -------------------- LOGIN & SIGNUP PAGES --------------------
router.get('/login', (req, res) => {
    res.render('auth/login'); // flash messages are already exposed via middleware
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Basic validation
        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/auth/login');
        }

        // Query user by email
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows && rows.length > 0 ? rows[0] : null;

        // Check if user exists and password matches (plain text)
        if (!user || user.password !== password) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Save user in session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // Redirect based on role
        if (user.role === 'admin') {
            req.flash('success', 'Welcome back, Admin!');
            return res.redirect('/admin'); // direct to admin dashboard
        } else {
            req.flash('success', 'Login successful!');
            return res.redirect('/');
        }
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/auth/login');
    }
});

router.get('/signup', (req, res) => {
    res.render('auth/signup', { error: null });
});

// -------------------- PROFILE --------------------
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl; // capture current page
        return res.redirect('/auth/login');
    }

    try {
        // ✅ Always fetch fresh user data from DB
        const [userRows] = await pool.query(
            'SELECT id, name, email, role, avatar FROM users WHERE id = ?',
            [req.session.user.id]
        );
        const user = userRows[0];

        const [addresses] = await pool.query(
            'SELECT * FROM addresses WHERE user_id = ?',
            [user.id]
        );

        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [user.id]
        );

        for (const order of orders) {
            const [items] = await pool.query(
                `SELECT oi.*, b.title, b.price
         FROM order_items oi
         JOIN books b ON oi.book_id = b.id
         WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.render('auth/profile', {
            user,        // ✅ fresh DB user with avatar + name
            addresses,
            orders
        });
    } catch (err) {
        console.error('Profile error:', err);
        req.flash('error', 'Unable to load profile');
        res.redirect('/');
    }
});

router.post('/profile/avatar/remove', async (req, res) => {
    try {
        await pool.query('UPDATE users SET avatar = NULL WHERE id = ?', [req.session.user.id]);

        if (req.session.user) {
            req.session.user.avatar = null; // reset session avatar
        }

        req.flash('success', 'Profile photo removed. ');
        res.redirect('/auth/profile');
    } catch (err) {
        console.error('Error removing avatar:', err);
        req.flash('error', 'Failed to remove profile photo');
        res.redirect('/auth/profile');
    }
});
// -------------------- ADDRESS MANAGEMENT --------------------
router.get('/profile/address/new', (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }
    res.render('auth/new_address');
});

router.get('/profile/address/edit/:id', async (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }

    const [rows] = await pool.query(
        'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.user.id]
    );
    const address = rows[0];

    if (!address) {
        req.session.error = 'Address not found';
        return res.redirect('/auth/profile');
    }

    res.render('auth/edit_address', { address });
});

router.post('/profile/address', async (req, res) => {
    const { street, city, state, zip } = req.body;
    await pool.query(
        'INSERT INTO addresses (street, city, state, zip, user_id) VALUES (?, ?, ?, ?, ?)',
        [street, city, state, zip, req.session.user.id]
    );
    req.session.success = 'Address saved!';
    res.redirect('/auth/profile');
});

router.post('/profile/address/edit/:id', async (req, res) => {
    const { street, city, state, zip } = req.body;
    await pool.query(
        'UPDATE addresses SET street = ?, city = ?, state = ?, zip = ? WHERE id = ? AND user_id = ?',
        [street, city, state, zip, req.params.id, req.session.user.id]
    );
    req.session.success = 'Address updated!';
    res.redirect('/auth/profile');
});

router.post('/profile/address/delete/:id', async (req, res) => {
    await pool.query(
        'DELETE FROM addresses WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.user.id]
    );
    req.session.success = 'Address deleted!';
    res.redirect('/auth/profile');
});

// -------------------- SIGNUP --------------------
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const existing = await findByEmail(email);
    if (existing) return res.render('auth/signup', { error: 'Email already registered' });

    const id = await createUser({ name, email, password, role: 'customer' });
    req.session.user = { id, name, email, role: 'customer' };
    req.session.success = `Welcome, ${name}! Your account was created successfully.`;

    const redirectUrl = req.session.returnTo || '/auth/profile';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

// -------------------- LOGIN --------------------

// -------------------- PROFILE UPDATE --------------------
router.post('/profile/update', async (req, res) => {
    const { name, email } = req.body;
    await updateUser(req.session.user.id, { name, email });
    req.session.user.name = name;
    req.session.user.email = email;
    req.session.success = 'Profile updated successfully.';
    res.redirect('/auth/profile');
});

// -------------------- AVATAR UPLOAD --------------------
router.post('/profile/avatar', upload.single('avatar'), async (req, res) => {
    const filename = req.file.filename;
    await updateUser(req.session.user.id, { avatar: `/uploads/${filename}` });
    req.session.user.avatar = `/uploads/${filename}`;
    req.session.success = 'Profile image updated.';
    res.redirect('/auth/profile');
});

// -------------------- LOGOUT --------------------
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login'); // or wherever your customer login page is
    });
});

// Show forgot password form
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot_password', {
        error: req.session.error,
        success: req.session.success
    });
    req.session.error = null;
    req.session.success = null;
});

// Handle forgot password form submission
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
        return res.render('auth/forgot_password', {
            error: 'Invalid email. No account found.',
            success: null
        });
    }

    const token = Math.random().toString(36).substring(2, 15);
    await pool.query('UPDATE users SET reset_token = ? WHERE id = ?', [token, user.id]);

    const resetLink = `http://localhost:4000/auth/reset-password/${token}`;

    try {
        await transporter.sendMail({
            from: `"Folio Support" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
        <h3>Hello ${user.name},</h3>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you didn’t request this, ignore this email.</p>
      `
        });

        return res.render('auth/forgot_password', {
            error: null,
            success: 'Password reset link sent to your email.'
        });

    } catch (err) {
        console.error('Email error:', err);
        return res.render('auth/forgot_password', {
            error: 'Failed to send email. Please try again.',
            success: null
        });
    }
});
// Show reset password form
// GET: Show reset form
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [token]);
    const user = rows[0];

    if (!user) {
        req.session.error = 'Invalid or expired reset link.';
        return res.redirect('/auth/login');
    }

    res.render('auth/reset_password', { token, error: req.session.error, success: req.session.success });
});

// POST: Handle reset
// Handle reset password form submission
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.session.error = 'Passwords do not match.';
        return res.redirect(`/auth/reset-password/${token}`);
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [token]);
        const user = rows[0];

        if (!user) {
            req.session.error = 'Invalid or expired reset link.';
            return res.redirect('/auth/login');
        }

        // ⚠️ Plain text password (for demo only, not secure)
        await pool.query(
            'UPDATE users SET password = ?, reset_token = NULL WHERE id = ?',
            [password, user.id]
        );

        req.session.success = 'Password updated successfully. Please log in.';
        res.redirect('/auth/login');

    } catch (err) {
        console.error('Reset password POST error:', err);
        req.session.error = 'Something went wrong. Please try again.';
        res.redirect(`/auth/reset-password/${token}`);
    }
});
export default router;