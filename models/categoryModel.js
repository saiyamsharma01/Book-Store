import { pool } from '../config/db.js';

export const getAllCategories = async () => {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    return rows;
};

export const getCategoryById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
};

export const createCategory = async ({ name, description, icon, slug }) => {
    await pool.query(
        'INSERT INTO categories (name, description, icon, slug) VALUES (?, ?, ?, ?)',
        [name, description, icon, slug]
    );
};

export const updateCategory = async (id, { name, description, icon, slug }) => {
    await pool.query(
        'UPDATE categories SET name = ?, description = ?, icon = ?, slug = ? WHERE id = ?',
        [name, description, icon, slug, id]
    );
};

export const deleteCategory = async (id) => {
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
};

export const getCategoryStats = async () => {
    const [rows] = await pool.query(`
    SELECT c.id, c.name, COUNT(b.id) AS book_count
    FROM categories c
    LEFT JOIN books b ON b.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
    return rows;
};
export const getCategoryBySlug = async (slug) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0];
};