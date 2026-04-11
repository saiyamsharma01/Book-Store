# 📚 BookStore Management System

A comprehensive, full-stack Bookstore Management System built with **Node.js**, **Express**, and **MySQL**. This application provides a complete e-commerce experience for buying books, featuring a robust admin panel, secure payment integration, and a sleek user interface.

## 🚀 Key Features

### 👤 User Features
- **Modern UI:** Clean and responsive design using Bootstrap and custom CSS.
- **Authentication:** Secure signup, login, and profile management using `bcrypt` for password hashing.
- **Shop & Search:** Browse books by category, search functionality, and slug-based SEO-friendly URLs.
- **Shopping Cart:** Add/remove items, manage quantities, and real-time total calculation.
- **Wishlist:** Save your favorite books for later.
- **Secure Payments:** Integrated with **Razorpay** for seamless transactions.
- **Order History:** View past orders and track their status.
- **Contact & Support:** Built-in contact form for user inquiries.
- **Email Notifications:** Automatic emails via `nodemailer` for order confirmations and support.

### 🛠️ Admin Features (Dashboard)
- **Inventory Management:** Full CRUD operations for books (Add, Edit, Delete).
- **Category Management:** Organize books into logical categories.
- **Order Tracking:** View and manage all user orders.
- **File Management:** Upload book covers and media using `multer`.
- **User Management:** Monitor registered users.

---

## 💻 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **View Engine:** EJS (Embedded JavaScript) with EJS Layouts
- **Styling:** Bootstrap 5, Vanilla CSS
- **Authentication:** express-session, bcrypt
- **Payments:** Razorpay API
- **File Uploads:** Multer
- **Emailing:** Nodemailer

---

## 🛠️ Installation & Setup

Follow these steps to get the project running locally:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MySQL](https://www.mysql.com/)
- [Razorpay Account](https://razorpay.com/) (For API keys)

### 2. Clone the Repository
```bash
git clone <repository-url>
cd Bookstore
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Configuration
1. Login to your MySQL server.
2. Create a new database: `CREATE DATABASE bookstore;`
3. Import the schema found in `sql/schema.sql` or use the latest dump in the `dumps/` directory:
   ```bash
   mysql -u root -p bookstore < sql/schema.sql
   ```

### 5. Environment Variables
Create a `.env` file in the root directory (refer to the existing structure):
```env
PORT=4000
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=bookstore
SESSION_SECRET=your_random_secret

# Email Config (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Razorpay Config
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret

# Admin Access
ADMIN_EMAIL=your_email@gmail.com
ADMIN_EMAIL_PASS=your_app_password
```

### 6. Run the Application
Start the server in development mode:
```bash
npm run dev
```
The application will be accessible at `http://localhost:4000`.

---

## 📁 Project Structure

```text
├── app.js            # Main entry point
├── routes/           # Express route handlers
├── views/            # EJS templates (layout, shop, admin, auth, errors)
├── public/           # Static assets (CSS, JS, Images, Uploads)
├── models/           # Database interaction logic
├── middleware/       # Custom middleware (auth, flash, etc.)
├── config/           # DB connection config
├── sql/              # Database schema files
└── .env              # Environment variables
```

---

## 🔒 Security Features
- **Password Hashing:** Uses `bcrypt` with salt rounds.
- **Session Security:** Managed with `express-session` and `helmet` for HTTP headers.
- **Error Handling:** Centralized middleware for catching 404 and 500 errors.
- **Input Sanitization:** URL encoding and JSON parsing middleware.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is for educational purposes. Feel free to use and modify it.
