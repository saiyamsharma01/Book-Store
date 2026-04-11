// middleware/flashMessages.js
export default function flashMessages(req, res, next) {
    // Always expose user + session
    res.locals.user = req.session?.user || null;
    res.locals.session = req.session || {};

    // Ensure flash arrays are always defined
    const successMessages = req.flash?.('success') || [];
    const errorMessages = req.flash?.('error') || [];
    const infoMessages = req.flash?.('info') || [];   // optional extra category

    res.locals.flash = {
        success: Array.isArray(successMessages) ? successMessages : [],
        error: Array.isArray(errorMessages) ? errorMessages : [],
        info: Array.isArray(infoMessages) ? infoMessages : [] // optional
    };

    next();
}