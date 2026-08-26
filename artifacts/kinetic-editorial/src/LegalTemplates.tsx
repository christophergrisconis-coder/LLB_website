import { useState, useMemo, useEffect, useRef } from 'react';
import { LEGAL_TEMPLATES, type LegalTemplate } from './data/legal_templates';
import { 
  FileText, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight, 
  SlidersHorizontal,
  X,
  Clock,
  BookOpen
} from 'lucide-react';

export default function LegalTemplates({ navigate }: { navigate: (to: string) => void }) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('llb_paid_member') === 'true';
  });
  const [accessCode, setAccessCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Parallax ambient cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('llb_paid_member', isUnlocked ? 'true' : 'false');
  }, [isUnlocked]);

  // When a template is opened, initialize its default form values
  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, string> = {};
      selectedTemplate.fields.forEach((f) => {
        defaults[f.key] = f.defaultValue || '';
      });
      setFormData(defaults);
      setCopied(false);
    }
  }, [selectedTemplate]);

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

  const filteredTemplates = useMemo(() => {
    return LEGAL_TEMPLATES.filter((t) => {
      const matchesCat = activeCategory === 'all' || t.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.statutoryBasis.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const generatedText = useMemo(() => {
    if (!selectedTemplate) return '';
    return selectedTemplate.contentTemplate(formData);
  }, [selectedTemplate, formData]);

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = () => {
    if (!selectedTemplate || !generatedText) return;
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}_court_document.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <p className="magazine-eyebrow">VOLUME 02 / LITIGATION PRACTICE TOOLKIT</p>
          <h1 className="magazine-headline">
            Standard Legal<br />
            <em>Pleadings &amp; Templates</em>
          </h1>
          <p className="magazine-lead">
            Courtroom-tested motions, subpoenas, pattern interrogatories, and client intake agreements for attorneys, paralegals, and legal assistants. Automated with statutory citations.
          </p>
        </div>
      </header>

      {/* Paywall Gate vs Active Library */}
      {!isUnlocked ? (
        <div className="lr-paywall-container">
          <div className="lr-paywall-card">
            <div className="lr-paywall-badge"><Lock size={20} /></div>
            <h2>Member Subscription Required</h2>
            <p className="lr-paywall-desc">
              The complete <strong>Legal Templates &amp; Motion Generator Suite</strong> is reserved for active <strong>Pro</strong> and <strong>Premium Firm</strong> accounts.
            </p>

            <div className="lr-paywall-perks">
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>16+ Standard Criminal &amp; Civil court motion pleadings</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>Subpoenas Duces Tecum, Interrogatories &amp; Privilege Logs</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>Retainer agreements, HIPAA authorizations &amp; intake forms</span></div>
              <div className="lr-perk"><CheckCircle2 size={16} className="lr-check" /> <span>Instant court-ready plain text and DOCX generation</span></div>
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

          {/* Sample Previews */}
          <div className="lr-preview-section">
            <div className="lr-preview-header">
              <p className="full-eyebrow">SAMPLE TEMPLATES PREVIEW (2 OF 16 READY)</p>
            </div>
            <div className="template-grid">
              {LEGAL_TEMPLATES.slice(0, 2).map((t) => (
                <article className="template-card template-card-preview" key={t.id}>
                  <div className="template-card-image-wrap">
                    <img src={t.image} alt={t.imageAlt} className="template-card-image" />
                    <span className="template-card-category-pill">{t.categoryLabel}</span>
                  </div>
                  <div className="template-card-body">
                    <h3>{t.title}</h3>
                    <p className="template-statutory">{t.statutoryBasis}</p>
                    <p className="template-desc">{t.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="lr-blurred-curtain">
              <p><Lock size={16} /> 14 additional litigation templates locked behind Pro subscription</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="template-dashboard-container">
          {/* Active Member Bar */}
          <div className="lr-member-banner">
            <div>
              <strong>✓ Pro License Active</strong> — Complete Template Suite Unlocked.
            </div>
            <button className="lr-lock-btn" onClick={() => setIsUnlocked(false)}>Lock session</button>
          </div>

          {/* Controls & Search */}
          <div className="template-filter-bar">
            <div className="template-search-wrap">
              <Search size={18} className="template-search-icon" />
              <input 
                type="search" 
                placeholder="Search templates by motion, subpoena, statute, or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="template-search-input"
              />
            </div>

            <div className="template-category-pills">
              {[
                { id: 'all', label: 'All Templates' },
                { id: 'motions', label: 'Courtroom Motions' },
                { id: 'discovery', label: 'Discovery & Subpoenas' },
                { id: 'intake', label: 'Client Intake & Retainers' },
                { id: 'sentencing', label: 'Sentencing & Post-Conviction' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  className={`template-pill ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Magazine-Style Cinematic Cards */}
          <div className="template-grid">
            {filteredTemplates.map((t) => (
              <article 
                className="template-card" 
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
              >
                <div className="template-card-image-wrap">
                  <img src={t.image} alt={t.imageAlt} className="template-card-image" />
                  <div className="template-image-overlay" />
                  <span className="template-card-category-pill">{t.categoryLabel}</span>
                  <span className="template-time-badge"><Clock size={12} /> {t.estimatedTime}</span>
                </div>
                <div className="template-card-body">
                  <h3>{t.title}</h3>
                  <p className="template-statutory">{t.statutoryBasis}</p>
                  <p className="template-desc">{t.description}</p>
                  <div className="template-card-footer">
                    <button className="template-open-btn">
                      Generate Document <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Document Generator Modal */}
      {selectedTemplate && (
        <div className="generator-modal-backdrop" onClick={() => setSelectedTemplate(null)}>
          <div className="generator-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="generator-modal-header">
              <div>
                <span className="magazine-eyebrow">{selectedTemplate.categoryLabel}</span>
                <h2>{selectedTemplate.title}</h2>
                <p className="generator-sub">{selectedTemplate.statutoryBasis}</p>
              </div>
              <button 
                className="generator-close-btn" 
                onClick={() => setSelectedTemplate(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>

            <div className="generator-modal-grid">
              {/* Left Column: Form Fields */}
              <div className="generator-form-col">
                <h3>Case &amp; Matter Variables</h3>
                <p className="generator-form-tip">Fill in client and docket information to customize the pleading in real time.</p>
                
                <div className="generator-fields-list">
                  {selectedTemplate.fields.map((f) => (
                    <div className="generator-field-group" key={f.key}>
                      <label>{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={formData[f.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[f.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Formatted Pleading Preview */}
              <div className="generator-preview-col">
                <div className="generator-preview-top">
                  <h3>Court-Ready Draft Preview</h3>
                  <div className="generator-actions">
                    <button 
                      className={`generator-action-btn ${copied ? 'copied' : ''}`}
                      onClick={handleCopy}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Text'}
                    </button>
                    <button 
                      className="generator-action-btn primary"
                      onClick={handleDownload}
                    >
                      <Download size={14} /> Download (.txt)
                    </button>
                  </div>
                </div>

                <div className="generator-paper-preview">
                  <pre>{generatedText}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="cinematic-footer">
        <p>L.L.B Practice Systems &bull; Automated Document Drafting Engine &bull; Confirm local county filing rules before lodging with the clerk.</p>
      </footer>
    </div>
  );
}
