// HTML-escape untrusted values before interpolating them into email HTML.
// Names, addresses, bios and support messages are user-supplied and land in
// raw template strings, so anything with markup in it must be neutered first.
const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char]);

module.exports = escapeHtml;
