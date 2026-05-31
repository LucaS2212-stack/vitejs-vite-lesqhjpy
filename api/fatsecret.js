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

    const searchRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=DEMO_KEY`
    );
    const data = await searchRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
