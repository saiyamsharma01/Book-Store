import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pool from '../config/db.js';
import dotenv from 'dotenv';

// Ensure env variables are loaded even in ESM hoisted imports
dotenv.config();

const RAZOR_KEY = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
const RAZOR_SECRET = process.env.RAZORPAY_SECRET || 'dummy_secret';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    console.warn('⚠️ Warning: Missing Razorpay credentials in .env. Payment features will be disabled.');
}

const router = express.Router();

// Razorpay instance with fallbacks to prevent crash
const razorpay = new Razorpay({
    key_id: RAZOR_KEY,
    key_secret: RAZOR_SECRET,
});

/**
 * Create Razorpay order
 */
router.post('/create-order', async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID) {
            return res.status(400).json({ success: false, error: 'Payment gateway not configured' });
        }
        
        const { total } = req.body;
        if (!total) return res.status(400).json({ success: false, error: 'Missing total' });

        const options = {
            amount: total * 100, 
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (err) {
        console.error('Error creating Razorpay order:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * Verify Razorpay payment
 */
router.post('/verify-payment', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, address_id } = req.body;
        const userId = req.session.user.id;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !address_id) {
            await conn.rollback();
            return res.status(400).json({ success: false, error: 'Missing Razorpay fields' });
        }

        const expectedSignature = crypto.createHmac('sha256', RAZOR_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            await conn.rollback();
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status === 'captured') {
            const [cart] = await conn.query(
                `SELECT c.book_id, c.quantity, b.title, b.price, b.stock
                 FROM cart c
                 JOIN books b ON c.book_id = b.id
                 WHERE c.user_id = ?`,
                [userId]
            );

            if (cart.length === 0) {
                await conn.rollback();
                return res.json({ success: false, message: 'Cart is empty' });
            }

            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const [orderResult] = await conn.query(
                'INSERT INTO orders (user_id, total, status, payment_mode, address_id, razorpay_order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [userId, total, 'confirmed', 'RAZORPAY', address_id, razorpay_order_id]
            );
            const dbOrderId = orderResult.insertId;

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
                    await conn.rollback();
                    return res.json({ success: false, message: `Stock update failed for "${item.title}".` });
                }
            }

            await conn.query(
                `INSERT INTO payments (order_id, payment_id, amount, currency, method, email, contact, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [dbOrderId, payment.id, payment.amount / 100, payment.currency, payment.method, payment.email, payment.contact, payment.status]
            );

            await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);

            await conn.commit();
            res.json({ success: true, status: 'confirmed', orderId: dbOrderId });
        } else {
            await conn.rollback();
            res.json({ success: false, status: payment.status });
        }
    } catch (err) {
        console.error('Payment verification error:', err);
        await conn.rollback();
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

export default router;