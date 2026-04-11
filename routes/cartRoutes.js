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

// -------------------- CART --------------------

// Show cart
router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [rows] = await pool.query(
            `SELECT c.book_id, c.quantity,
                    b.title, b.author, b.price, b.image, b.stock
             FROM cart c
                      JOIN books b ON c.book_id = b.id
             WHERE c.user_id = ?`,
            [userId]
        );
        res.render('cart/index', { cart: rows });
    } catch (err) {
        console.error('Cart view error:', err);
        req.session.error = 'Failed to load cart';
        res.redirect('/');
    }
});

// Add to cart (POST)
router.post('/add/:id', requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;

    try {
        await pool.query(
            "INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
            [userId, bookId]
        );
        req.session.success = 'Book added to cart!';
        res.redirect('/cart');
    } catch (err) {
        console.error('Cart add error:', err);
        req.session.error = 'Failed to add to cart';
        res.redirect('/cart');
    }
});

// Add to cart (GET) - for quick links
router.post('/cart/add', requireLogin, async (req, res) => {
    const userId = req.session.user.id;   // ✅ use session.user.id consistently
    const { bookId } = req.body;

    try {
        // 1. Check if book exists and has stock
        const [[book]] = await pool.query(
            "SELECT id, stock FROM books WHERE id = ?",
            [bookId]
        );

        if (!book) {
            return res.json({ error: 'Book not found.' });
        }

        if (book.stock <= 0) {
            return res.json({ error: 'Out of stock.' });
        }

        // 2. Check if item already in cart
        const [[cartItem]] = await pool.query(
            "SELECT quantity FROM cart WHERE user_id = ? AND book_id = ?",
            [userId, bookId]
        );

        if (cartItem) {
            // 3. Prevent exceeding stock
            if (cartItem.quantity >= book.stock) {
                return res.json({ error: 'Cannot add more than available stock.' });
            }

            await pool.query(
                "UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND book_id = ?",
                [userId, bookId]
            );
        } else {
            // 4. Insert new cart item with quantity = 1
            await pool.query(
                "INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, 1)",
                [userId, bookId]
            );
        }

        return res.json({ success: 'Item added to cart!' });
    } catch (err) {
        console.error('Cart add error:', err);
        return res.json({ error: 'Failed to add item.' });
    }
});
// Update cart (increase/decrease/remove)
router.post('/update', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const action = req.body.action;

    if (!action || typeof action !== 'string' || !action.includes('-')) {
        req.session.error = 'Invalid cart action';
        return res.redirect('/cart');
    }

    try {
        const [type, bookId] = action.split('-');

        if (type === 'increase') {
            // ✅ Check current cart quantity and book stock
            const [[cartItem]] = await pool.query(
                "SELECT quantity FROM cart WHERE user_id = ? AND book_id = ?",
                [userId, bookId]
            );
            const [[book]] = await pool.query(
                "SELECT stock FROM books WHERE id = ?",
                [bookId]
            );

            if (!book) {
                req.session.error = 'Book not found';
                return res.redirect('/cart');
            }

            if (cartItem && cartItem.quantity < book.stock) {
                await pool.query(
                    "UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND book_id = ?",
                    [userId, bookId]
                );
                req.session.success = 'Cart updated!';
            } else {
                req.session.error = 'Cannot exceed available stock';
            }

        } else if (type === 'decrease') {
            await pool.query(
                "UPDATE cart SET quantity = GREATEST(quantity - 1, 1) WHERE user_id = ? AND book_id = ?",
                [userId, bookId]
            );
            req.session.success = 'Cart updated!';

        } else if (type === 'remove') {
            await pool.query(
                "DELETE FROM cart WHERE user_id = ? AND book_id = ?",
                [userId, bookId]
            );
            req.session.success = 'Item removed from cart!';
        }

        res.redirect('/cart');
    } catch (err) {
        console.error('Cart update error:', err);
        req.session.error = 'Failed to update cart';
        res.redirect('/cart');
    }
});

// -------------------- CHECKOUT --------------------


// -------------------- CHECKOUT PREVIEW --------------------
// -------------------- CHECKOUT PREVIEW --------------------
router.get('/checkout', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [cart] = await pool.query(
            `SELECT c.book_id, c.quantity, b.title, b.price, b.image
             FROM cart c
                      JOIN books b ON c.book_id = b.id
             WHERE c.user_id = ?`,
            [userId]
        );

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const [addresses] = await pool.query('SELECT * FROM addresses WHERE user_id = ?', [userId]);

        res.render('cart/checkout', { cart, total, addresses });
    } catch (err) {
        console.error('Checkout preview error:', err);
        req.flash('error', 'Failed to load checkout');
        res.redirect('/cart');
    }
});
router.post('/checkout', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    let { payment_mode, address_id } = req.body;
    payment_mode = payment_mode ? payment_mode.toUpperCase() : null;

    if (!['COD', 'RAZORPAY'].includes(payment_mode)) {
        return res.redirect('/cart/checkout');
    }

    try {
        const [[address]] = await pool.query(
            "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
            [address_id, userId]
        );
        if (!address) {
            req.flash('error', 'Invalid address selected.');
            return res.redirect('/cart/checkout');
        }

        const [cart] = await pool.query(
            `SELECT c.book_id, c.quantity, b.title, b.price, b.stock
             FROM cart c
             JOIN books b ON c.book_id = b.id
             WHERE c.user_id = ?`,
            [userId]
        );

        if (cart.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // ✅ COD flow
        if (payment_mode === 'COD') {
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                const [orderResult] = await conn.query(
                    'INSERT INTO orders (user_id, total, status, payment_mode, address_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    [userId, total, 'confirmed', 'COD', address_id]
                );
                const dbOrderId = orderResult.insertId;

                let failedItem = null;
                for (const item of cart) {
                    await conn.query(
                        'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [dbOrderId, item.book_id, item.quantity, item.price]
                    );

                    const [updateResult] = await conn.query(
                        'UPDATE books SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [item.quantity, item.book_id, item.quantity]
                    );

                    if (updateResult.affectedRows === 0) {
                        failedItem = item.title;
                        break;
                    }
                }

                if (failedItem) {
                    await conn.rollback();
                    req.flash('error', `Not enough stock for "${failedItem}".`);
                    return res.redirect('/cart');
                }

                await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);
                await conn.commit();

                console.log("COD order committed successfully, orderId:", dbOrderId);

                return res.redirect('/cart/order_success');  // ✅ correct redirect
            } catch (err) {
                await conn.rollback();
                console.error('COD order error:', err);
                req.flash('error', 'Failed to place COD order');
                res.redirect('/cart/checkout');
            } finally {
                conn.release();
            }
        }

        // ✅ Razorpay flow
        if (payment_mode === 'RAZORPAY') {
            return res.render('cart/razorpay_checkout', { cart, total, address_id, payment_mode });
        }

    } catch (err) {
        console.error('Checkout error:', err);
        req.flash('error', 'Failed to place order');
        res.redirect('/cart/checkout');
    }
});
router.post('/orders/confirm', requireLogin, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const userId = req.session.user.id;
        const { address_id, payment_mode } = req.body;

        if (payment_mode !== 'RAZORPAY') {
            await conn.rollback();
            req.flash('error', 'Invalid flow for COD');
            return res.redirect('/cart/checkout');
        }

        const [cart] = await conn.query(
            `SELECT c.book_id, c.quantity, b.title, b.price, b.stock
             FROM cart c
             JOIN books b ON c.book_id = b.id
             WHERE c.user_id = ?
             FOR UPDATE`,
            [userId]
        );

        if (cart.length === 0) {
            await conn.rollback();
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const [orderResult] = await conn.query(
            'INSERT INTO orders (user_id, total, status, payment_mode, address_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, total, 'confirmed', 'RAZORPAY', address_id]
        );
        const dbOrderId = orderResult.insertId;

        let failedItem = null;
        for (const item of cart) {
            await conn.query(
                'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)',
                [dbOrderId, item.book_id, item.quantity, item.price]
            );

            const [updateResult] = await conn.query(
                'UPDATE books SET stock = stock - ? WHERE id = ? AND stock >= ?',
                [item.quantity, item.book_id, item.quantity]
            );

            if (updateResult.affectedRows === 0) {
                failedItem = item.title;
                break;
            }
        }

        if (failedItem) {
            await conn.rollback();
            req.flash('error', `Stock update failed for "${failedItem}".`);
            return res.redirect('/cart');
        }

        await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);
        await conn.commit();

        return res.redirect('/cart/order_success');  // ✅ redirect instead of JSON
    } catch (err) {
        console.error('Order confirm error:', err);
        await conn.rollback();
        req.flash('error', 'Failed to confirm Razorpay order');
        res.redirect('/cart/checkout');
    } finally {
        conn.release();
    }
});
router.get('/order_success', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (orders.length === 0) {
            req.flash('error', 'No recent order found.');
            return res.redirect('/cart');
        }

        const order = orders[0];
        const [items] = await pool.query(
            `SELECT oi.*, b.title, b.image
             FROM order_items oi
             JOIN books b ON oi.book_id = b.id
             WHERE oi.order_id = ?`,
            [order.id]
        );

        res.render('cart/order_success', {
            orderId: order.id,
            total: order.total,
            cart: items,
            payment_mode: order.payment_mode
        });
    } catch (err) {
        console.error('Order success error:', err);
        req.flash('error', 'Unable to load order success page');
        res.redirect('/cart');
    }
});
// -------------------- ORDER HISTORY --------------------
// -------------------- ORDER HISTORY --------------------
router.get('/history', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [orders] = await pool.query(
            `SELECT o.id AS order_id, o.total, o.status, o.payment_mode, o.address_id, o.created_at,
                    p.payment_id, p.method, p.amount, p.status AS payment_status
             FROM orders o
                      LEFT JOIN payments p ON o.id = p.order_id
             WHERE o.user_id = ?
             ORDER BY o.created_at DESC`,
            [userId]
        );

        for (const order of orders) {
            const [items] = await pool.query(
                `SELECT oi.id AS order_item_id, oi.quantity, oi.price, b.title, b.image
                 FROM order_items oi
                          JOIN books b ON oi.book_id = b.id
                 WHERE oi.order_id = ?`,
                [order.order_id]
            );
            order.items = items;
        }

        res.render('orders/orders', { layout: 'layouts/main', orders });
    } catch (err) {
        console.error('Order history error:', err);
        req.flash('error', 'Failed to load orders');
        res.redirect('/');
    }
});


// -------------------- MOVE TO WISHLIST --------------------

// Move single cart item to wishlist
router.post('/move-to-wishlist/:id', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const bookId = req.params.id;

    if (!bookId) {
        req.session.error = 'Invalid book ID';
        return res.redirect('/cart');
    }

    try {
        await pool.query("DELETE FROM cart WHERE user_id = ? AND book_id = ?", [userId, bookId]);

        await pool.query(
            "INSERT INTO wishlist (user_id, book_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
            [userId, bookId]
        );

        req.session.success = 'Book moved to wishlist!';
        res.redirect('/cart');
    } catch (err) {
        console.error('Move to wishlist error:', err);
        req.session.error = 'Failed to move book to wishlist';
        res.redirect('/cart');
    }
});
// Move all cart items to wishlist
router.post('/move-all-to-wishlist', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        // Get all cart items
        const [items] = await pool.query(
            "SELECT book_id FROM cart WHERE user_id = ?",
            [userId]
        );

        if (items.length === 0) {
            req.session.error = 'Your cart is empty';
            return res.redirect('/cart');
        }

        // Insert each into wishlist
        for (const item of items) {
            await pool.query(
                "INSERT INTO wishlist (user_id, book_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
                [userId, item.book_id]
            );
        }

        // Clear cart
        await pool.query("DELETE FROM cart WHERE user_id = ?", [userId]);

        req.session.success = 'All cart items moved to wishlist!';
        res.redirect('/wishlist');
    } catch (err) {
        console.error('Move all to wishlist error:', err);
        req.session.error = 'Failed to move cart items to wishlist';
        res.redirect('/cart');
    }
});
// Show order success page
// -------------------- ORDER SUCCESS --------------------
// router.get('/cart/order_success', requireLogin, async (req, res) => {
//     const userId = req.session.user.id;
//
//     try {
//         // Get the most recent order for this user
//         const [orders] = await pool.query(
//             'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
//             [userId]
//         );
//
//         if (orders.length === 0) {
//             req.flash('error', 'No recent order found.');
//             return res.redirect('/cart');
//         }
//
//         const order = orders[0];
//
//         // Fetch items for that order
//         const [items] = await pool.query(
//             `SELECT oi.*, b.title, b.image
//              FROM order_items oi
//                       JOIN books b ON oi.book_id = b.id
//              WHERE oi.order_id = ?`,
//             [order.id]   // ✅ use "id" if your orders PK is "id"
//         );
//
//         res.render('cart/order_success', {
//             orderId: order.id,       // ✅ match your schema
//             total: order.total,
//             cart: items,
//             payment_mode: order.payment_mode
//         });
//     } catch (err) {
//         console.error('Order success error:', err);
//         req.flash('error', 'Unable to load order success page');
//         res.redirect('/cart');
//     }
// });
export default router;