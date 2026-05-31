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

    const [usdaRes, offRes] = await Promise.allSettled([
      fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=DEMO_KEY`),
      fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&lc=it&cc=it`)
    ]);

    const results = [];

    if (usdaRes.status === "fulfilled") {
      const usdaData = await usdaRes.value.json();
      (usdaData.foods || []).forEach(f => {
        const cal = Math.round(f.foodNutrients?.find(n => n.nutrientId === 1008)?.value || 0);
        const prot = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1003)?.value || 0) * 10) / 10;
        const carb = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1005)?.value || 0) * 10) / 10;
        const fat = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1004)?.value || 0) * 10) / 10;
        if
