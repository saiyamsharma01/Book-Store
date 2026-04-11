import { pool } from '../config/db.js';

export const getAddressesByUser = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM addresses WHERE user_id = ?', [userId]);
    return rows;
};

export const addAddress = async (userId, { label, line1, city, state, zip }) => {
    await pool.query(
        'INSERT INTO addresses (user_id, label, line1, city, state, zip) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, label, line1, city, state, zip]
    );
};

export const deleteAddress = async (id) => {
    await pool.query('DELETE FROM addresses WHERE id = ?', [id]);
};