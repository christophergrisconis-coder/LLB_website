import { useMemo, useState, useEffect, useRef } from 'react';
import caseLawData from './legal_database.json';
import { Search, ArrowUpRight, Lock, ShieldCheck, CheckCircle2, KeyRound, Sparkles, Scale, BookOpen, Clock } from 'lucide-react';

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
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('llb_paid_member') === 'true';
  });
  const [accessCode, setAccessCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'all' | 'state' | 'federal'>('all');
  const [court, setCourt] = useState('All Courts');
  const [saved, setSaved] = useState<string[]>([]);
  const raw = caseLawData as CaseRecord[];

  // Parallax ambient cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('llb_paid_member', isUnlocked ? 'true' : 'false');
  }, [isUnlocked]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x, y });
  };

  const handleUnlockWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accessCode.trim().toLowerCase();
    if (clean === 'admin' || clean === 'pro' || clean === 'premium' || clean === 'llb2026' || clean.length >= 6) {
      setIsUnlocked(true);
      setShowCodeInput(false);
      setAuthError('');
    } else {
      setAuthError('Invalid subscriber license key. Please check your firm credentials.');
    }
  };

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
    <div 
      className="cinematic-shell min-h-screen text-[#f3f4f6]" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Ambient Lighting Orbs with Parallax */}
      <div className="ambient-cinematic-bg pointer-events-none" aria-hidden="true">
        <div 
          className="ambient-orb ambient-orb-primary" 
          style={{ transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 24}px)` }}
        />
        <div 
          className="ambient-orb ambient-orb-secondary" 
          style={{ transform: `translate(${-mousePos.x * 30}px, ${-mousePos.y * 30}px)` }}
        />
        <div className="ambient-film-grain" />
      </div>

      {/* Header & Editorial Hero */}
      <header className="cinematic-header">
        <div className="cinematic-header-top">
          <button className="lr-back" onClick={() => navigate('/')}>
            ← Back to L.L.B
          </button>
          <div className="header-badge-wrap">
            {isUnlocked ? (
              <span className="lr-tag-unlocked"><ShieldCheck size={14} /> Active Pro Member License</span>
            ) : (
              <span className="lr-tag-locked"><Lock size={13} /> Pro &amp; Premium Exclusive Suite</span>
            )}
          </div>
        </div>

        <div className="editorial-hero-banner">
          <p className="magazine-eyebrow">VOLUME 01 / 4TH CIRCUIT &amp; STATE AUTHORITY INDEX</p>
          <h1 className="magazine-headline">
            Criminal Defense<br />
            <em>Case Law Precedent</em>
          </h1>
          <p className="magazine-lead">
            {raw.length} defense-favorable rulings spanning Fourth Amendment suppression, sentencing overturns, probation revocations, and statutory reversals across NC, VA, SC, WV, and MD courts.
          </p>
        </div>
      </header>

      {/* Paywall vs Full Precedent Engine */}
      {!isUnlocked ? (
        <div className="lr-paywall-container">
          <div className="lr-paywall-card">
            <div className="lr-paywall-badge"><Lock size={20} /></div>
            <h2>Member Subscription Required</h2>
            <p className="lr-paywall-desc">
              The full <strong>250 Case Law Authority Database &amp; Precedent Index</strong> is restricted to active <strong>Pro</strong> and <strong>Premium Firm</strong> subscribers.
            </p>

            <div className="lr-paywall-perks">
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>250+ Verified defense-favorable State &amp; Federal holdings</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>Sentencing overturn &amp; probation violation statutes indexed</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>Courtroom PWA offline access with case file export</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>AI motion drafting citation assistant</span></div>
            </div>

            <div className="lr-paywall-actions">
              <button className="full-primary-button lr-upgrade-btn" onClick={() => navigate('/start')}>
                <Sparkles size={16} /> Upgrade to Pro ($71.99/mo)
              </button>
              <button className="lr-signin-btn" onClick={() => setShowCodeInput(!showCodeInput)}>
                <KeyRound size={15} /> Enter Subscriber License Key
              </button>
            </div>

            {showCodeInput && (
              <form className="lr-license-form" onSubmit={handleUnlockWithCode}>
                <input
                  type="text"
                  placeholder="Enter license key (e.g. LLB-PRO-XXXX)"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="lr-license-input"
                  autoFocus
                />
                <button type="submit" className="lr-license-submit">Activate</button>
                {authError && <p className="lr-auth-error">{authError}</p>}
              </form>
            )}
          </div>

          <div className="lr-preview-section">
            <div className="lr-preview-header">
              <p className="full-eyebrow">PREVIEW PRECEDENT (SAMPLE 2 OF 250 CASES)</p>
            </div>
            <div className="lr-results">
              {raw.slice(0, 2).map((c) => (
                <article className="lr-card lr-card-preview" key={c.case_name}>
                  <div className="lr-card-top">
                    <span className="lr-badge lr-badge-fed">{c.court} · {c.year}</span>
                    <span className="lr-preview-pill">Sample Preview</span>
                  </div>
                  <h2 className="lr-case-name">{c.case_name}</h2>
                  <p className="lr-citation">{c.citation}</p>
                  <p className="lr-summary">{c.summary}</p>
                </article>
              ))}
            </div>
            <div className="lr-blurred-curtain">
              <p><Lock size={16} /> 248 additional cases locked behind Pro membership</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="template-dashboard-container">
          <div className="lr-member-banner">
            <div>
              <strong>✓ Pro License Active</strong> — Full 250 Precedent Engine Unlocked.
            </div>
            <button className="lr-lock-btn" onClick={() => setIsUnlocked(false)}>Lock session</button>
          </div>

          <div className="template-filter-bar">
            <div className="template-search-wrap">
              <Search size={18} className="template-search-icon" />
              <input 
                type="search" 
                className="template-search-input" 
                placeholder="Search case name, citation, court, topic, holding…" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
              />
            </div>
            <div className="template-category-pills">
              {(['all', 'federal', 'state'] as const).map((j) => (
                <button 
                  key={j} 
                  className={`template-pill ${jurisdiction === j ? 'active' : ''}`} 
                  onClick={() => setJurisdiction(j)}
                >
                  {j === 'all' ? 'All Jurisdictions' : j === 'federal' ? '4th Circuit & Districts' : 'State Courts'}
                </button>
              ))}
              <select className="lr-select" value={court} onChange={(e) => setCourt(e.target.value)}>
                {COURTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="lr-results-count">{cases.length} results{saved.length > 0 && <span className="lr-saved-badge"> · {saved.length} saved</span>}</span>
            </div>
          </div>

          <div className="lr-results">
            {cases.length === 0 ? (
              <p className="lr-empty">No cases match your query. Try another citation, keyword, or court.</p>
            ) : (
              cases.map((c) => {
                const isFederal = c.jurisdiction?.toLowerCase().includes('federal') || !c.jurisdiction;
                const isSaved = saved.includes(c.case_name);
                return (
                  <article className="lr-card" key={c.case_name + c.citation}>
                    <div className="lr-card-top">
                      <span className={`lr-badge ${isFederal ? 'lr-badge-fed' : 'lr-badge-state'}`}>
                        {isFederal ? '4th Circuit / Federal' : 'State Court'}
                      </span>
                      <span className="lr-court-year">{c.court} · {c.year}</span>
                    </div>
                    <h2 className="lr-case-name">{c.case_name}</h2>
                    <p className="lr-citation">{c.citation}{c.primary_topics?.[0] && ` · ${c.primary_topics[0]}`}</p>
                    <p className="lr-summary">{c.summary}</p>
                    {c.rule_of_law && c.rule_of_law !== c.summary && (
                      <p className="lr-rule"><strong>Rule:</strong> {c.rule_of_law}</p>
                    )}
                    {c.application_notes && (
                      <p className="lr-notes"><strong>Application:</strong> {c.application_notes}</p>
                    )}
                    <button 
                      className={`lr-save-btn ${isSaved ? 'saved' : ''}`} 
                      onClick={() => setSaved((p) => p.includes(c.case_name) ? p : [...p, c.case_name])}
                    >
                      {isSaved ? '✓ Saved to Case File' : 'Save to case file'} {!isSaved && <ArrowUpRight size={14} />}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      <footer className="cinematic-footer">
        <p>L.L.B Research Systems &bull; Research Index Only &bull; Confirm current treatment in licensed citators prior to citation in court.</p>
      </footer>
    </div>
  );
}
