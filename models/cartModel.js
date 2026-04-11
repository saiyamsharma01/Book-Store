// models/cartModel.js
export const addToCart = (req, book, qty = 1) => {
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find((i) => i.id === book.id);
    if (existing) existing.quantity += qty;
    else req.session.cart.push({ id: book.id, title: book.title, price: book.price, quantity: qty });
};

export const removeFromCart = (req, id) => {
    if (!req.session.cart) return;
    req.session.cart = req.session.cart.filter((i) => i.id !== id);
};

export const clearCart = (req) => {
    req.session.cart = [];
};

export const cartTotal = (req) => {
    const cart = req.session.cart || [];
    return cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
};