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

    const results = [];

    // USDA
    try {
      const usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=DEMO_KEY`);
      const usdaData = await usdaRes.json();
      (usdaData.foods || []).forEach(f => {
        const cal = Math.round(f.foodNutrients?.find(n => n.nutrientId === 1008)?.value || 0);
        const prot = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1003)?.value || 0) * 10) / 10;
        const carb = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1005)?.value || 0) * 10) / 10;
        const fat = Math.round((f.foodNutrients?.find(n => n.nutrientId === 1004)?.value || 0) * 10) / 10;
        if (cal > 0) results.push({ id: `usda_${f.fdcId}`, name: f.description, brand: f.brandOwner || f.brandName || "", source: "USDA", cal, prot, carb, fat, per100: { cal, prot, carb, fat } });
      });
    } catch(e) {}

    // Open Food Facts
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&lc=it&cc=it`, {
        headers: { "Accept": "application/json", "User-Agent": "AthleteTracker/1.0" }
      });
      const text = await offRes.text();
      const offData = JSON.parse(text);
      (offData.products || []).forEach(p => {
        const n = p.nutriments || {};
        const cal = Math.round(n["energy-kcal_100g"] || (n["energy_100g"] || 0) / 4.184 || 0);
        const prot = Math.round((n.proteins_100g || 0) * 10) / 10;
        const carb = Math.round((n.carbohydrates_100g || 0) * 10) / 10;
        const fat = Math.round((n.fat_100g || 0) * 10) / 10;
        const name = p.product_name_it || p.product_name || p.generic_name || "";
        if (name && cal > 0) results.push({ id: `off_${p.id || p.code}`, name, brand: p.brands || "", source: "Open Food Facts", cal, prot, carb, fat, per100: { cal, prot, carb, fat } });
      });
    } catch(e) {}

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
