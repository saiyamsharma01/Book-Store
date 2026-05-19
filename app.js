import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import session from 'express-session';
import methodOverride from 'method-override';
import flash from 'connect-flash';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

// Middleware
import { badgeCounts, errorHandler, flashMessages } from './middleware/index.js';

const app = express();

// -------------------- Static Files --------------------
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// -------------------- View Engine --------------------
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.join(process.cwd(), 'views'));

// -------------------- Core Middleware --------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboardcat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour
        secure: process.env.NODE_ENV === 'production', // only over HTTPS in production
        httpOnly: true
    }
}));

// -------------------- Flash Middleware --------------------
app.use(flash());          // connect-flash first
app.use(flashMessages);    // then your custom flash middleware

// -------------------- Custom Middleware --------------------
app.use(badgeCounts);

// Ensure activePage is always defined
app.use((req, res, next) => {
    if (typeof res.locals.activePage === 'undefined') {
        res.locals.activePage = '';
    }
    next();
});

// -------------------- Routes --------------------
app.use('/', shopRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/admin', adminRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/payment', paymentRoutes);
app.use('/contact', contactRoutes);

// -------------------- Shortcuts --------------------
app.get('/profile', (req, res) => res.redirect('/auth/profile'));
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/signup', (req, res) => res.redirect('/auth/signup'));
app.get('/logout', (req, res) => res.redirect('/auth/logout'));

// -------------------- Error Handling --------------------

// 404 Handler
app.use((req, res) => {
    res.status(404).render('errors/404', {
        layout: 'layouts/main',
        activePage: '',
        flash: res.locals.flash || { success: [], error: [] },
        message: 'Page not found'
    });
});

// 500 Handler (Global errors)
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);

    const isDev = process.env.NODE_ENV === 'development';

    res.status(500).render('errors/500', {
        layout: 'layouts/main',
        activePage: res.locals.activePage || '',
        flash: res.locals.flash || { success: [], error: [] },
        message: isDev ? err.message : 'Unexpected error occurred',
        stack: isDev ? err.stack : null
    });
});

// Fallback error handler (custom middleware)
app.use(errorHandler);

// -------------------- Server --------------------
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

export default app;