export default async function handler(req, res) {
  try {
    let query = "";
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      query = body?.query || "";
    } else {
      query = req.query?.q || "";
    }
    
    if (!query) return res.status(400).json({ error: "No query" });

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
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(500).json({ error: "No token" });

    const searchRes = await fetch(
      `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const data = await searchRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
