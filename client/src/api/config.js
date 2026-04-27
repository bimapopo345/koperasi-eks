export const API_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    "http://localhost:5000",
).replace(/\/$/, "");
