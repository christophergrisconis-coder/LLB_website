import { useMemo, useState } from "react";
import caseLawData from "@/data/case_law.json";

export default function LegalResearch() {
  const [query, setQuery] = useState("");
  
  const cases = useMemo(() => {
    const raw = (caseLawData as any[]) || [];
    if (!query.trim()) return raw;
    const q = query.toLowerCase();
    return raw.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.citation && c.citation.toLowerCase().includes(q)) ||
        (c.holding && c.holding.toLowerCase().includes(q)) ||
        (c.court && c.court.toLowerCase().includes(q)) ||
        (c.key_principles && c.key_principles.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <h1 className="text-4xl font-light tracking-tight mb-8">Case Law Database</h1>
      
      <div className="mb-8">
        <input 
          type="text" 
          placeholder="Search by title, citation, or holding..."
          className="w-full bg-transparent border border-separator px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="space-y-6">
        {cases?.map((c: any) => (
          <div key={c.id || c.citation} className="border border-separator p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-medium">{c.title}</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {c.year} | {c.court}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mb-4">{c.holding}</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{c.citation}</span>
              <span>•</span>
              <span>{c.practice_area}</span>
            </div>
          </div>
        ))}
        {cases?.length === 0 && (
          <div className="text-muted-foreground">No cases found.</div>
        )}
      </div>
    </div>
  );
}
