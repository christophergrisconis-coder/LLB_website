import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";

const caseLawRouter: IRouter = Router();

// Cache the database in memory
let legalDatabase: any[] | null = null;

const getDatabase = () => {
  if (!legalDatabase) {
    const dbPath = path.join(__dirname, "..", "legal_database.json");
    try {
      const data = fs.readFileSync(dbPath, "utf-8");
      legalDatabase = JSON.parse(data);
    } catch (e) {
      console.error("Failed to load legal database", e);
      legalDatabase = [];
    }
  }
  return legalDatabase;
};

caseLawRouter.get("/case-law", (req, res) => {
  const db = getDatabase();
  const query = req.query.q as string;

  if (query) {
    const lowerQuery = query.toLowerCase();
    const results = db.filter((c: any) => 
      c.case_name?.toLowerCase().includes(lowerQuery) ||
      c.summary?.toLowerCase().includes(lowerQuery) ||
      c.primary_topics?.some((t: string) => t.toLowerCase().includes(lowerQuery)) ||
      c.rule_of_law?.toLowerCase().includes(lowerQuery)
    );
    res.json(results);
  } else {
    res.json(db);
  }
});

export default caseLawRouter;
