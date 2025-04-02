// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const syncAllLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 1, // limit each IP to 3 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    // Set SSE headers manually
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const errorMessage = '⏳ You can sync all products only 1 times every 15 minutes.';
    res.write(`data: FINAL:${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  },
});
