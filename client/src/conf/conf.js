const conf = {
  server_url: String(
    import.meta.env.VITE_SERVER_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000",
  ).replace(/\/$/, ""),
};

export default conf;
