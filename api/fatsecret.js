export default async function handler(req, res) {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: "No query" });

    // Get OAuth token
    const tokenRes = await fetch("https://oauth.fatsecret.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.FS_CLIENT_ID,
        client_secret: process.env.FS_CLIENT_SECRET,
        scope: "basic"
      })
    });
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) return res.status(500).json({ error: "No token", tokenData });

    // Search foods
    const searchRes = await fetch(
      `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10&language=it&region=IT`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const data = await searchRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
