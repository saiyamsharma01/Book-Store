// models/bookModel.js
import { pool } from '../config/db.js';

export const getAllBooks = async () => {
    const [rows] = await pool.query(
        `SELECT b.*, c.name AS category_name
     FROM books b LEFT JOIN categories c ON b.category_id = c.id
     ORDER BY b.created_at DESC`
    );
    return rows;
};

export const getBooksByCategoryId = async (categoryId) => {
    const [rows] = await pool.query('SELECT * FROM books WHERE category_id = ?', [categoryId]);
    return rows;
};

export const getBookById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
    return rows[0] || null;
};

export const createBook = async (book) => {
    const { title, author, description, price, stock, image, category_id } = book;
    const [result] = await pool.query(
        `INSERT INTO books (title, author, description, price, stock, image, category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, author, description, price, stock, image, category_id || null]
    );
    return result.insertId;
};

export const updateBook = async (id, book) => {
    const { title, author, description, price, stock, image, category_id } = book;
    await pool.query(
        `UPDATE books SET title=?, author=?, description=?, price=?, stock=?, image=?, category_id=?
     WHERE id=?`,
        [title, author, description, price, stock, image, category_id || null, id]
    );
};

export const deleteBook = async (id) => {
    await pool.query('DELETE FROM books WHERE id = ?', [id]);
};