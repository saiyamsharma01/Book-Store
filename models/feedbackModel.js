import db from '../config/db.js';

export async function saveFeedback({ name, email, message }) {
    const [result] = await db.query(
        'INSERT INTO feedbacks (name, email, message) VALUES (?, ?, ?)',
        [name, email, message]
    );
    return result.insertId;
}