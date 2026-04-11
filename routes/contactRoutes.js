import express from 'express';
import { saveFeedback } from '../models/feedbackModel.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Contact form page
router.get('/', (req, res) => {
    res.render('contact', {
        activePage: 'contact',
        session: req.session
        // ✅ flash is already injected by middleware
    });
});
// Handle form submission
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        // Save feedback to DB
        await saveFeedback({ name, email, message });

        // Optional: send email to admin
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: email,
            to: process.env.ADMIN_EMAIL,
            subject: `New Feedback from ${name}`,
            text: message
        });

        // ✅ Success flash message
        req.flash('success', 'Your message has been sent successfully!');
        res.redirect('/contact');
    } catch (err) {
        console.error('Contact form error:', err);

        // ✅ Error flash message
        req.flash('error', 'Something went wrong while sending your message. Please try again.');
        res.redirect('/contact');
    }
});

export default router;