// Mongoose validation failures mean the client sent bad data, not that the
// server broke — answer 400 with the schema's own message instead of a
// generic 500 that tells the admin nothing.
// Returns true when it has already sent the response.
module.exports = (res, err) => {
  if (err?.name !== "ValidationError") return false;
  const first = Object.values(err.errors || {})[0];
  res.status(400).json({ message: first?.message || "Invalid input" });
  return true;
};
