import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const dataPath = path.resolve(__dirname, "../../data/case_law.json");
let cases: any[] = [];
try {
  cases = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
} catch (err) {
  console.error("Failed to load case law json:", err);
}

router.get("/legal-research", (req, res) => {
  try {
    const { q, court, practice_area, limit = "100" } = req.query;
    
    let filtered = cases;
    
    if (court) {
      filtered = filtered.filter(c => c.court === court);
    }
    
    if (practice_area) {
      filtered = filtered.filter(c => c.practice_area === practice_area);
    }
    
    if (q) {
      const qLower = (q as string).toLowerCase();
      filtered = filtered.filter(c => 
        (c.title && c.title.toLowerCase().includes(qLower)) ||
        (c.citation && c.citation.toLowerCase().includes(qLower)) ||
        (c.holding && c.holding.toLowerCase().includes(qLower)) ||
        (c.key_principles && c.key_principles.toLowerCase().includes(qLower))
      );
    }
    
    filtered.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.title.localeCompare(b.title);
    });
    
    const parsedLimit = parseInt(limit as string, 10);
    res.json(filtered.slice(0, parsedLimit));
  } catch (error) {
    console.error("Error querying legal research db:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/legal-research/analytics", (req, res) => {
  try {
    const total_cases = cases.length;
    
    const courts: Record<string, number> = {};
    cases.forEach(c => {
      courts[c.court] = (courts[c.court] || 0) + 1;
    });
    
    const court_breakdown = Object.entries(courts)
      .map(([court, count]) => ({ court, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      total_cases,
      court_breakdown
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
