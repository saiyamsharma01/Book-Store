// middleware/errorHandler.js

export default function errorHandler(err, req, res, next) {
    // Log full error details for debugging
    console.error('Global error:', err.stack || err);

    // If headers already sent, delegate to default Express handler
    if (res.headersSent) {
        return next(err);
    }

    // Decide what message to show based on environment
    const isDev = process.env.NODE_ENV === 'development';

    res.status(500).render('errors/500', {
        layout: 'layouts/main',
        message: isDev
            ? err.message || 'Unexpected error occurred.'
            : 'Something went wrong. Please try again later.',
        // Optional: expose stack trace only in development
        stack: isDev ? err.stack : null
    });
}