// models/userModel.js
import { pool } from '../config/db.js';

export const findByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
};

export const createUser = async ({ name, email, password, role = 'customer' }) => {
    const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, password, role]
    );
    return result.insertId;
};
export const updateUser = async (id, updates) => {
    const fields = [];
    const values = [];

    if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.email) {
        fields.push('email = ?');
        values.push(updates.email);
    }
    if (updates.avatar) {
        fields.push('avatar = ?');
        values.push(updates.avatar);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(sql, values);
};