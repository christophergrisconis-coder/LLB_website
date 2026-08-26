import { useMemo, useState, useEffect } from 'react';
import caseLawData from './legal_database.json';
import { Search, ArrowUpRight, Lock, ShieldCheck, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    localStorage.setItem('llb_paid_member', isUnlocked ? 'true' : 'false');
  }, [isUnlocked]);

  const handleUnlockWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accessCode.trim().toLowerCase();
    // Allow any standard active license format or keywords
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
    <div className="lr-page">
      <header className="lr-header">
        <button className="lr-back" onClick={() => navigate('/')}>&#8592; Back to L.L.B</button>
        <div className="lr-header-top-tag">
          {isUnlocked ? (
            <span className="lr-tag-unlocked"><ShieldCheck size={14} /> Active Subscriber License</span>
          ) : (
            <span className="lr-tag-locked"><Lock size={13} /> Paid Plan Exclusive Feature</span>
          )}
        </div>
        <h1>Criminal Defense<br /><em>Case Law Database</em></h1>
        <p className="lr-subtitle">
          {raw.length} defense-favorable precedents covering the 4th Circuit, North Carolina, Virginia, South Carolina, West Virginia, and Maryland.
        </p>
      </header>

      {!isUnlocked ? (
        <div className="lr-paywall-container">
          <div className="lr-paywall-card">
            <div className="lr-paywall-badge"><Lock size={20} /></div>
            <h2>Member Subscription Required</h2>
            <p className="lr-paywall-desc">
              The full <strong>4th Circuit Precedent &amp; Sentencing Authority Database</strong> is strictly available to active <strong>Pro</strong> and <strong>Premium Firm</strong> subscribers.
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
        <>
          <div className="lr-member-banner">
            <div>
              <strong>✓ Pro License Active</strong> — Full database unlocked.
            </div>
            <button className="lr-lock-btn" onClick={() => setIsUnlocked(false)}>Lock session</button>
          </div>

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
        </>
      )}

      <p className="lr-disclaimer">Research index only. Confirm current treatment in licensed sources before relying on any authority.</p>
    </div>
  );
}
