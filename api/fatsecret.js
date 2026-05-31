export default async function handler(req, res) {
  const { query } = req.body || {};
  
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
  const { access_token } = await tokenRes.json();

  // Search foods
  const searchRes = await fetch(
    `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&language=it&region=IT`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const data = await searchRes.json();
  res.json(data);
}
