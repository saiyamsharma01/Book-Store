import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../database.sqlite');

let db = null;

async function getDB() {
    if (!db) {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        await db.exec('PRAGMA foreign_keys = ON;');
        
        // Final Comprehensive Schema for SQLite
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'customer',
                avatar TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                description TEXT,
                icon TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                image TEXT,
                category_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                payment_mode TEXT,
                address_id INTEGER,
                razorpay_order_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                label TEXT,
                line1 TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                zip TEXT NOT NULL,
                country TEXT NOT NULL DEFAULT 'India',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS feedbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cart (
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS wishlist (
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                payment_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT,
                method TEXT,
                email TEXT,
                contact TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );

            -- Seed Default Admin
            INSERT OR IGNORE INTO users (id, name, email, password, role)
            VALUES (1, 'Admin', 'admin@store.com', '$2b$10$7R.xO8K.A1K9X6M6X.6.6O', 'admin');
        `);
    }
    return db;
}

const queryWrapper = async (sql, params = []) => {
    const database = await getDB();
    
    // Replace MySQL specific functions and syntax
    let processedSql = sql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
                          .replace(/GREATEST\(/gi, 'MAX(')
                          .replace(/FOR UPDATE/gi, '');

    // Convert ON DUPLICATE KEY UPDATE to SQLite ON CONFLICT
    if (processedSql.includes('ON DUPLICATE KEY UPDATE')) {
        if (processedSql.match(/cart/i)) {
            processedSql = processedSql.replace(/ON DUPLICATE KEY UPDATE quantity = quantity \+ 1/gi, 
                'ON CONFLICT(user_id, book_id) DO UPDATE SET quantity = quantity + 1');
        } else if (processedSql.match(/wishlist/i)) {
            processedSql = processedSql.replace(/ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP/gi, 
                'ON CONFLICT(user_id, book_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP');
        }
    }
    
    const trimmedSql = processedSql.trim().toLowerCase();
    
    if (trimmedSql.startsWith('select') || trimmedSql.startsWith('show') || trimmedSql.startsWith('describe')) {
        const rows = await database.all(processedSql, params);
        return [rows, null];
    } else {
        const result = await database.run(processedSql, params);
        return [{
            insertId: result.lastID,
            affectedRows: result.changes
        }, null];
    }
};

export const pool = {
    query: queryWrapper,
    execute: queryWrapper,
    getConnection: async () => {
        return {
            query: queryWrapper,
            execute: queryWrapper,
            beginTransaction: async () => (await getDB()).exec('BEGIN TRANSACTION'),
            commit: async () => (await getDB()).exec('COMMIT'),
            rollback: async () => (await getDB()).exec('ROLLBACK'),
            release: () => {} 
        };
    }
};

export default pool;
