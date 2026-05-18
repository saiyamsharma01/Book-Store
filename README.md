# 📖 Folio — Premium Editorial Bookstore Management System

<div align="center">
  <img src="https://img.shields.io/badge/Brand-Folio-c2410c?style=for-the-badge" alt="Brand Badge" />
  <img src="https://img.shields.io/badge/Platform-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Badge" />
  <img src="https://img.shields.io/badge/Framework-Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express Badge" />
  <img src="https://img.shields.io/badge/Theme-3--Mode%20Engine-eab308?style=for-the-badge" alt="Theme Switcher Badge" />
</div>

---

**Folio** is a high-end, luxurious full-stack e-commerce and bookstore management platform designed with an editorial, premium, and human-made aesthetic. Built on a powerful **Node.js** and **Express** core, Folio goes beyond a simple shopping cart, offering an immersive, interactive study-lounge experience complete with a multi-mode typography/color system, real-time particle simulations, and a relaxing offline lofi soundtrack controller.

---

## 🌟 The Folio Experience (Visual Highlights)

### 🎭 1. 3-Mode persistent Theme Engine
Folio features a highly sophisticated, screen-flash-prevented preloaded theme engine (`localStorage` integrated in the page `<head>`) that allows readers to match their reading ambient preference:
*   📜 **Custom Literary Cream (Default)**: A rich, beautiful warm-ivory paper background (`#FAF9F5`) paired with soft terracotta accents and deep charcoal typography for a premium, classical editorial vibe.
*   🌃 **Nocturnal Dark Mode**: A deep, high-contrast dark space blue-black background (`#0b0f19`) featuring glowing amber orange highlights (`#f97316`) and ice-blue metadata for comfortable midnight reading.
*   ☀️ **Editorial Light Mode**: A clean, high-contrast flat layout with a pure white background (`#ffffff`), sleek steel-blue accents, and sharp typography.

### 🌌 2. Interactive Audio-Visual Hero Banner
*   ✨ **Theme-Aware Canvas Sparks**: An optimized **HTML5 Canvas particle simulation** is rendered in the homepage hero background. Over 35 glowing firefly particles float and fade at 60fps. The particle colors dynamically morph using a JavaScript `MutationObserver` to perfectly match the active visual theme (Warm Ember in Cream, Radiant Neon-Amber in Dark, and Ice-Blue in Light Mode).
*   🎵 **Cozy Bookstore Lofi Loop**: A high-fidelity, highly compressed offline **Lofi-Chill Hop track (`Psychosoma-Home`)** is embedded locally. Readers can toggle the sound using a glassmorphic floating controller, featuring a pulsing multi-bar equalizer wave visualizer and micro-animated play/pause states.

### 🔐 3. Aesthetic Auth & Shop Portals
*   **Adaptable Cards**: Both the **Login & Signup** cards feature elegant matching border treatments, sienna book badges, and dynamic focus borders that automatically adapt to light, dark, and cream palettes.
*   **Modern Showcase**: The latest arrivals section features high-aspect-ratio hardcover aspect ratios, hover elevations, and graceful entry animations.

---

## 🚀 Core Features

### 👤 Reader/User Features
*   🛒 **Smart Shopping Cart**: Real-time quantity updates, subtotals, and checkout validations.
*   ❤️ **Persisted Wishlist**: Save favorite books and manage items effortlessly.
*   💳 **Secure Payments**: Fully integrated with the **Razorpay API** for seamless mock and production transactions.
*   📦 **Order Tracking**: Keep tabs on previous purchases with automatic order status logs.
*   ✉️ **Support Desk**: Elegant contact and feedback forms with real-time **Nodemailer** integration for support handles.

### 🛠️ Admin Dashboard (Command Center)
*   📚 **Inventory CRUD**: Complete management (Create, Read, Update, Delete) of books, including file uploads via **Multer** for high-resolution book covers.
*   🏷️ **Category Management**: Group and organize books dynamically.
*   📋 **Order Master Control**: View, process, and update shipping details for customer orders globally.
*   👥 **User Auditing**: Monitor registered customer profiles.

---

## 💻 Technical Architecture

*   **Backend Core**: Node.js & Express.js
*   **Database**: Robust MySQL / Emulated SQLite wrapper
*   **View Engine**: Modular EJS (Embedded JavaScript) with preloader EJS layouts
*   **Styling & Design System**: Modern Custom HSL CSS variables, Bootstrap 5 overrides, dynamic transitions, and Outfit/Cormorant Garamond Google Fonts
*   **Authentication**: Express-Session & Cryptographic Bcrypt hashing
*   **Asset Management**: Multer (Cover uploads)
*   **Transactional Mailing**: Nodemailer

---

## 🛠️ Quick Installation & Setup

Follow these simple steps to run the Folio server locally:

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v16.x or higher recommended)
*   [MySQL Server](https://www.mysql.com/) (Optional: codebase also contains database emulation utilities)

### 2. Clone the Repository
```bash
git clone <your-repository-url>
cd Bookstore
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Initialization
1.  Log in to your MySQL terminal or client.
2.  Create a fresh database:
    ```sql
    CREATE DATABASE bookstore;
    ```
3.  Import the structure schema from the SQL dump file:
    ```bash
    mysql -u root -p bookstore < sql/schema.sql
    ```

### 5. Setup Environment Variables
Create a file named `.env` in the root folder and add the following keys:
```env
PORT=4000
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=bookstore
SESSION_SECRET=your_super_secure_session_secret

# Nodemailer Config
EMAIL_USER=support@folio.com
EMAIL_PASS=your_nodemailer_app_password

# Razorpay Config (Keys obtained from Razorpay Dashboard)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_key_secret

# Default Admin Configuration
ADMIN_EMAIL=admin@store.com
ADMIN_EMAIL_PASS=admin123
```

### 6. Launch the Server
Start the development server with live-reloads powered by Nodemon:
```bash
npm run dev
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser and enjoy the ultimate cozy bookstore experience!

---

## 🔒 Default Admin Credentials (For Testing)
To access the Admin Command Center immediately without setting up new users, log in with:
*   **Email**: `admin@store.com`
*   **Password**: `admin123`

---

## 📁 Repository Blueprint

```text
├── app.js            # Express application bootstrapper & middlewares
├── config/           # Database pools and configuration engines
├── middleware/       # Route guards, flash alerts, and CORS controllers
├── models/           # SQL query models and schema interactions
├── public/           # Static Client Assets
│   ├── css/          # Premium 3-theme design stylesheets (style.css)
│   ├── js/           # Dynamic scripts (theme managers, cart updates)
│   ├── sounds/       # High-fidelity local loops (bookstore.mp3)
│   └── uploads/      # Uploaded hardcover book images
├── routes/           # RESTful API and template route directories
├── sql/              # Table schemas and structural setup files
└── views/            # Templating layout modules (EJS views)
```

---

## 📜 Attribution & Licenses
*   **lofi Audio Track**: Provided by Psychosoma (`Psychosoma-Home`), licensed under standard royalty-free public domain terms.
*   **Theme Switcher Script**: Developed with native JavaScript.
*   **Visual Assets**: High-resolution book visual vectors licensed under Creative Commons.

Enjoy reading in our cozy bookstore! ☕📖✨
