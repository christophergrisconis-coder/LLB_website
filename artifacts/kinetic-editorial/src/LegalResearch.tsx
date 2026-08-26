import { useMemo, useState } from 'react';
import caseLawData from './legal_database.json';
import { Search, ArrowUpRight } from 'lucide-react';

type CaseRecord = {
  case_name: string;
  citation: string;
  year: number;
  court: string;
  jurisdiction: string;
  primary_topics: string[];
  summary: string;
  rule_of_law: string;
  application_notes?: string;
};

const COURTS = [
  'All Courts','U.S. Supreme Court','4th Circuit Court of Appeals',
  'E.D.N.C.','W.D.N.C.','M.D.N.C.','D.S.C.','E.D. Va.','W.D. Va.',
  'S.D.W.Va.','N.D.W.Va.','D. Md.','N.C. Supreme Court','N.C. Court of Appeals',
  'S.C. Supreme Court','Va. Supreme Court','W.Va. Supreme Court of Appeals','Md. Court of Appeals',
];

export default function LegalResearch({ navigate }: { navigate: (to: string) => void }) {
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'all' | 'state' | 'federal'>('all');
  const [court, setCourt] = useState('All Courts');
  const [saved, setSaved] = useState<string[]>([]);
  const raw = caseLawData as CaseRecord[];

  const cases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return raw.filter((c) => {
      const isFederal = c.jurisdiction?.toLowerCase().includes('federal') || !c.jurisdiction;
      if (jurisdiction === 'state' && isFederal) return false;
      if (jurisdiction === 'federal' && !isFederal) return false;
      if (court !== 'All Courts' && c.court !== court) return false;
      if (!q) return true;
      const haystack = [c.case_name, c.citation, c.court, c.summary, c.rule_of_law, ...(c.primary_topics || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [query, jurisdiction, court, raw]);

  return (
    <div className="lr-page">
      <header className="lr-header">
        <button className="lr-back" onClick={() => navigate('/')}>&#8592; Back to L.L.B</button>
        <p className="full-eyebrow">4TH CIRCUIT &amp; STATE AUTHORITY INDEX</p>
        <h1>Criminal Defense<br /><em>Case Law Database</em></h1>
        <p className="lr-subtitle">{raw.length} defense-favorable precedents spanning the 4th Circuit, NC, VA, SC, WV &amp; MD.</p>
      </header>

      <div className="lr-controls">
        <div className="lr-search-wrap">
          <Search size={18} className="lr-search-icon" />
          <input type="search" className="lr-search" placeholder="Search case name, citation, court, topic, holding…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="lr-filters">
          <div className="lr-pills">
            {(['all', 'federal', 'state'] as const).map((j) => (
              <button key={j} className={`lr-pill${jurisdiction === j ? ' active' : ''}`} onClick={() => setJurisdiction(j)}>
                {j === 'all' ? 'All Jurisdictions' : j === 'federal' ? '4th Circuit & Districts' : 'State Courts'}
              </button>
            ))}
          </div>
          <select className="lr-select" value={court} onChange={(e) => setCourt(e.target.value)}>
            {COURTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="lr-results-count">{cases.length} results{saved.length > 0 && <span className="lr-saved-badge"> · {saved.length} saved</span>}</span>
        </div>
      </div>

      <div className="lr-results">
        {cases.length === 0 ? <p className="lr-empty">No cases match. Try a different citation, court, or keyword.</p> : cases.map((c) => {
          const isFederal = c.jurisdiction?.toLowerCase().includes('federal') || !c.jurisdiction;
          const isSaved = saved.includes(c.case_name);
          return (
            <article className="lr-card" key={c.case_name + c.citation}>
              <div className="lr-card-top">
                <span className={`lr-badge ${isFederal ? 'lr-badge-fed' : 'lr-badge-state'}`}>{isFederal ? '4th Circuit / Federal' : 'State Court'}</span>
                <span className="lr-court-year">{c.court} · {c.year}</span>
              </div>
              <h2 className="lr-case-name">{c.case_name}</h2>
              <p className="lr-citation">{c.citation}{c.primary_topics?.[0] && ` · ${c.primary_topics[0]}`}</p>
              <p className="lr-summary">{c.summary}</p>
              {c.rule_of_law && c.rule_of_law !== c.summary && <p className="lr-rule"><strong>Rule:</strong> {c.rule_of_law}</p>}
              {c.application_notes && <p className="lr-notes"><strong>Application:</strong> {c.application_notes}</p>}
              <button className={`lr-save-btn${isSaved ? ' saved' : ''}`} onClick={() => setSaved((p) => p.includes(c.case_name) ? p : [...p, c.case_name])}>
                {isSaved ? '✓ Saved' : 'Save to case file'} {!isSaved && <ArrowUpRight size={14} />}
              </button>
            </article>
          );
        })}
      </div>
      <p className="lr-disclaimer">Research index only. Confirm current treatment in licensed sources before relying on any authority.</p>
    </div>
  );
}
