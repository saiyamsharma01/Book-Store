// models/orderModel.js
import { pool } from '../config/db.js';

export const createOrder = async (userId, items, total) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [orderRes] = await conn.query(
            'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
            [userId, total, 'paid']
        );
        const orderId = orderRes.insertId;

        for (const item of items) {
            await conn.query(
                'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price]
            );
            await conn.query('UPDATE books SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
        }

        await conn.commit();
        return orderId;
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

export const getOrdersByUser = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows;
};
export const getOrdersWithItems = async (userId) => {
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id=?', [userId]);
    for (const order of orders) {
        const [items] = await pool.query('SELECT * FROM order_items WHERE order_id=?', [order.id]);
        order.items = items;
    }
    return orders;
};
