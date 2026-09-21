/**
 * Caps how often one IP can hit an endpoint: slows password guessing and form
 * spam. Counts live in memory.
 * ponytail: per-process counters; fine on one Render instance. Move to Redis
 * (or express-rate-limit with a shared store) if the backend ever scales out.
 */
function rateLimit({ max, windowMs, message = "Too many attempts. Please wait a few minutes and try again." }) {
  const hits = new Map();

  // Drop finished windows so the map doesn't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    if (req.method === "OPTIONS") return next();
    const key = `${req.ip}|${req.baseUrl}${req.path}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
}

module.exports = rateLimit;
