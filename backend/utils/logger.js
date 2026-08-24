const Sentry = require('@sentry/node');
require('dotenv').config();

// Only initialize Sentry if you actually put a DSN link in your .env file
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });
}

const logError = (contextMessage, err) => {
    if (process.env.NODE_ENV !== 'production') {
        // DEVELOPMENT: Print the full raw error and stack trace so you can fix it
        console.error(`❌ [DEV ERROR] ${contextMessage}:`, err);
    } else {
        // PRODUCTION: Hide the raw error to prevent data leaks!
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(err); // Send the secure trace to Sentry dashboard
        }
        // Only print a safe, generic message to the Render server logs
        console.error(`⚠️ [PROD ERROR] ${contextMessage} - (Details sent to Sentry)`);
    }
};

module.exports = { logError };