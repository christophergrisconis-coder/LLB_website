import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Menu, X, ArrowRight, BookOpen, Shield, Zap, Search, ArrowUpRight, Scale, ChevronRight, Plus, LogOut, BriefcaseBusiness } from 'lucide-react';
import LegalResearch from './LegalResearch';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

type Story = {
  id: string;
  section: string;
  title: string;
  summary: string;
  author: string;
  time: string;
  image: string;
  alt: string;
  body: string;
};

type Navigate = (to: string) => void;

function useLocation(): [string, Navigate] {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const getPath = () => window.location.pathname.replace(new RegExp(`^${basePath}`), '') || '/';
  const [location, setLocation] = useState(getPath);

  useEffect(() => {
    const onPopState = () => setLocation(getPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [basePath]);

  const navigate: Navigate = (to) => {
    const nextPath = `${basePath}${to === '/' ? '/' : to}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
      setLocation(to);
    }
  };

  return [location, navigate];
}

const stories: Story[] = [
  {
    id: 'case-law',
    section: 'Case law',
    title: 'The cases that changed the room',
    summary: 'A sharp briefing on precedent, courtroom strategy, and the decisions every modern legal team should know.',
    author: 'L.L.B. Desk',
    time: '11 min read',
    image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=85',
    alt: 'City courthouse glowing beneath a dark blue night sky',
    body: 'The strongest arguments rarely arrive as isolated moments. They build through precedent, pressure, and the details a busy team can miss. This briefing follows the decisions that changed the room and the practical lessons they leave behind.',
  },
  {
    id: 'briefing',
    section: 'Briefing',
    title: 'What the fine print is really saying',
    summary: 'A plain-English read on the clauses, deadlines, and quiet risks that shape the outcome before anyone enters court.',
    author: 'Nora Bell',
    time: '8 min read',
    image: 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&w=1000&q=85',
    alt: 'Close-up of a signed legal contract',
    body: 'Risk hides in boilerplate. By breaking down standard clauses into their practical impacts, we help practitioners anticipate the friction points that define a settlement before it is ever drafted.',
  },
  {
    id: 'evidence',
    section: 'Evidence',
    title: 'When the record speaks for itself',
    summary: 'Reviewing the exhibits, testimony, and undeniable facts that leave opposing counsel with nowhere to maneuver.',
    author: 'J. Reynolds',
    time: '14 min read',
    image: 'https://images.unsplash.com/photo-1593115057322-e94b77572f20?auto=format&fit=crop&w=1000&q=85',
    alt: 'Stacks of organized legal files in a modern office',
    body: 'Building a record is about eliminating doubt. This piece explores how to structure exhibits, pace testimony, and present facts so clearly that the conclusion feels inevitable.',
  }
];

const articleImages = [
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=85',
];

const faqs = [
  'How frequently is the authority index updated?',
  'Does this replace primary legal research?',
  'Can I export citations directly to my drafts?',
  'What jurisdictions are fully covered?'
];

function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', firm: '', role: '',
    practiceAreas: [] as string[], volume: '',
  });

  const practiceAreas = ['Criminal Defense', 'Civil Litigation', 'Family Law', 'Corporate', 'Personal Injury', 'Other'];
  
  const toggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area]
    }));
  };

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
    else window.location.href = '/workspace';
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-container">
        <a href="/" className="full-logo onboarding-logo"><span>✦</span> L.L.B</a>
        
        <div className="onboarding-progress">
          <div className="progress-bar" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <form className="onboarding-step" onSubmit={next}>
            <p className="full-eyebrow">STEP 1 OF 3</p>
            <h1>Let's set up your profile.</h1>
            <div className="input-group">
              <label>Full Name</label>
              <input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input required type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
            </div>
            <button type="submit" className="full-primary-button">Continue</button>
          </form>
        )}

        {step === 2 && (
          <form className="onboarding-step" onSubmit={next}>
            <p className="full-eyebrow">STEP 2 OF 3</p>
            <h1>Tell us about your practice.</h1>
            <div className="input-group">
              <label>Primary Practice Areas</label>
              <div className="practice-tags">
                {practiceAreas.map(area => (
                  <button type="button" key={area} className={`practice-tag ${formData.practiceAreas.includes(area) ? 'selected' : ''}`} onClick={() => toggleArea(area)}>
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Firm Name</label>
              <input required value={formData.firm} onChange={e => setFormData(f => ({ ...f, firm: e.target.value }))} />
            </div>
            <button type="submit" className="full-primary-button" disabled={formData.practiceAreas.length === 0}>Continue</button>
          </form>
        )}

        {step === 3 && (
          <form className="onboarding-step" onSubmit={next}>
            <p className="full-eyebrow">STEP 3 OF 3</p>
            <h1>How do you handle research?</h1>
            <div className="input-group radio-group">
              <label className="radio-label">
                <input type="radio" name="volume" required onChange={() => setFormData(f => ({...f, volume: 'low'}))} />
                <span>We occasionally pull precedent</span>
              </label>
              <label className="radio-label">
                <input type="radio" name="volume" required onChange={() => setFormData(f => ({...f, volume: 'med'}))} />
                <span>Weekly motion practice</span>
              </label>
              <label className="radio-label">
                <input type="radio" name="volume" required onChange={() => setFormData(f => ({...f, volume: 'high'}))} />
                <span>Heavy appellate & trial load</span>
              </label>
            </div>
            <button type="submit" className="full-primary-button">Enter Workspace</button>
          </form>
        )}
      </div>
    </main>
  );
}

function Workspace() {
  const [activeTab, setActiveTab] = useState('docket');
  
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <a href="/" className="full-logo workspace-logo"><span>✦</span> L.L.B</a>
        <nav className="workspace-nav">
          <button className={activeTab === 'docket' ? 'active' : ''} onClick={() => setActiveTab('docket')}><BriefcaseBusiness size={18} /> Active Docket</button>
          <button className={activeTab === 'research' ? 'active' : ''} onClick={() => setActiveTab('research')}><BookOpen size={18} /> Research</button>
          <button className={activeTab === 'drafts' ? 'active' : ''} onClick={() => setActiveTab('drafts')}><Search size={18} /> Drafts</button>
        </nav>
        <div className="workspace-user">
          <div className="avatar">JD</div>
          <div className="user-details">
            <strong>Jane Doe</strong>
            <span>Vance & Partners</span>
          </div>
          <button className="logout-btn" onClick={() => window.location.href = '/'}><LogOut size={16} /></button>
        </div>
      </aside>
      
      <main className="workspace-main">
        <header className="workspace-header">
          <h1>{activeTab === 'docket' ? 'Active Docket' : activeTab === 'research' ? 'Research & Precedent' : 'Document Drafts'}</h1>
          <button className="full-primary-button btn-sm"><Plus size={16} /> New Matter</button>
        </header>
        
        <div className="workspace-content">
          {activeTab === 'docket' && (
            <div className="docket-grid">
              {[1, 2, 3].map(i => (
                <div key={i} className="docket-card">
                  <div className="docket-status">Pre-Trial</div>
                  <h3>State v. Miller</h3>
                  <p>Hearing in 4 days</p>
                  <div className="docket-actions">
                    <button>View file</button>
                    <button>Upload</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab !== 'docket' && (
            <div className="empty-state">
              <Shield size={48} />
              <h2>No items yet</h2>
              <p>Start a new search or draft to populate this section.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SimpleHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const submit = (msg: string) => (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(msg);
  };

  return (
    <main className="full-site" data-testid="app-shell">
      <header className="full-header">
        <div className="full-nav-container">
          <a href="/" className="full-logo" data-testid="link-brand"><span>✦</span> L.L.B</a>
          <nav className="full-nav-links" aria-label="Main navigation">
            <a href="#features">Solutions ⌄</a><a onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/legal-research'); window.dispatchEvent(new PopStateEvent('popstate')); }} href="/legal-research" style={{cursor:'pointer'}}>Case Database (Pro 🔒)</a><a href="#pricing">Pricing</a><a href="#about">About</a><a href="#insights">Blog</a><a href="#faq">Support ⌄</a>
          </nav>
          <a href="/start" className="full-primary-button" data-testid="link-get-started">Get started</a>
        </div>
      </header>

      <section className="full-hero">
        <div className="full-hero-content">
          <p className="full-eyebrow">LAWYERS LEGAL BEEF</p>
          <h1>The facts are on your side.<br /><em>Make them known.</em></h1>
          <p className="full-hero-sub">L.L.B. integrates intelligent case research, unbreakable document management, and offline PWA access into one platform built strictly for litigation teams.</p>
          <div className="full-hero-actions"><a href="/start" className="full-primary-button">Start your practice</a><a href="#features" className="full-secondary-button">See the platform</a></div>
        </div>
        <div className="full-hero-visual" aria-hidden="true"><div className="full-glass-card mock-ui"><div className="mock-ui-header"><span>L.L.B. Briefing Environment</span></div><div className="mock-ui-body"><div className="mock-line skeleton-title" /><div className="mock-line skeleton-text" /><div className="mock-line skeleton-text short" /></div></div></div>
      </section>

      <section className="features-grid-section" id="features">
        <div className="features-heading"><p className="full-eyebrow">PLATFORM CAPABILITIES</p><h2>Engineered for the courtroom.<br />Ready anywhere.</h2></div>
        <div className="grid-cards">
          <article className="grid-card"><div className="icon-wrapper"><BookOpen size={24} /></div><h3>PWA Offline Sync</h3><p>Access dockets and active briefings in the courthouse, even when the cell towers cut out. Changes sync instantly upon reconnection.</p></article>
          <article className="grid-card"><div className="icon-wrapper"><Shield size={24} /></div><h3>Precedent Engine</h3><p>Cross-reference your arguments against our proprietary, real-time database of State and Federal appellate authority.</p></article>
          <article className="grid-card"><div className="icon-wrapper"><Zap size={24} /></div><h3>Automated Billing</h3><p>Track time organically as you draft. L.L.B. securely translates your workflow into precise, LEDES-compliant invoices.</p></article>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-header pricing-heading"><p className="full-eyebrow">PRICING &amp; PACKAGING</p><h2>Simple Plans for Every Law Practice</h2><div className="pricing-toggle billing-toggle"><button className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annually <span>Save 20%</span></button></div></div>
        <div className="pricing-grid">
          <article className="pricing-card price-card pro-plan"><div className="plan-name full-eyebrow">PRO PLAN</div><p className="plan-ideal">Ideal for solo attorneys &amp; growing legal practices.</p><div className="plan-price">{annual ? '$71.99' : '$89.99'}<small>/monthly</small></div><p className="plan-promo">New users: 10% OFF</p><ul className="plan-features"><li>Complete Case &amp; Docket Management</li><li>Offline Courtroom Document Sync</li><li>Integrated Time Tracking &amp; Client Billing</li></ul><a href="/start" className="btn-pricing full-card-button">Get Pro Plan</a></article>
          <article className="pricing-card price-card premium-plan highlight"><div className="plan-name full-eyebrow">PREMIUM PLAN</div><p className="plan-ideal">For full-service firms.</p><div className="plan-price">{annual ? '$135.99' : '$169.99'}<small>/monthly</small></div><p className="plan-promo">New users: 10% OFF</p><ul className="plan-features"><li>Everything in Pro Plan</li><li>AI Legal Research &amp; Motion Drafting</li><li>Unlimited Automated Legal Templates</li><li>Priority 24/7 Litigation Tech Support</li><li>Advanced Firm Financial Analytics</li></ul><a href="/start" className="btn-pricing full-card-button">Get Premium Plan</a></article>
        </div>
      </section>

      <section className="testimonial-section"><img className="testimonial-avatar" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=85" alt="Marcus Vance, Esq." /><blockquote>“Lawyers Legal Beef cut our firm's administrative overhead in half. Having offline courtroom PWA access, AI research, and billing in one platform is irreplaceable.”</blockquote><p><strong>Marcus Vance, Esq.</strong><br />Senior Litigation Partner, Vance &amp; Partners</p></section>

      <section className="insights-section" id="insights"><div className="insights-heading"><p className="full-eyebrow">FROM THE DESK</p><h2>Legal Tech &amp; PWA Practice Insights</h2></div><div className="article-grid">{['Courtroom PWA Playbook', 'AI Research Acceleration', 'Unified Legal Billing', 'Automated Document Drafting'].map((title, index) => <article className="article-card" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.38), rgba(0,0,0,.82)), url(${articleImages[index]})` }} key={title}><div className="article-card-content"><p className="full-eyebrow">ARTICLE 0{index + 1}</p><h3>{title}</h3><a href="#insights">Read insight →</a></div></article>)}</div></section>

      <section className="faq-section" id="faq">
        <div className="newsletter-card"><p className="full-eyebrow">NEWSLETTER</p><h2>Supercharge your product experience. Launch faster with zero risk.</h2><form className="full-inline-form" onSubmit={submit('You are on the list.') }><input required type="email" placeholder="Your email address" aria-label="Newsletter email" /><button type="submit">Submit</button></form><p className="full-form-note">{submitted || 'Get updates'}</p></div>
        <div className="faq-list"><p className="full-eyebrow">FAQ</p>{faqs.map((question, index) => <div className="faq-item" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><strong>{openFaq === index ? '−' : '+'}</strong></button>{openFaq === index && <p>Lawyers Legal Beef keeps the answer, context, and next move close at every stage of the matter.</p>}</div>)}</div>
      </section>

      <section className="contact-section" id="contact"><div><p className="full-eyebrow">CONTACT</p><h2>Build better legal work.</h2><p>Tell us where your practice is headed.</p><form className="contact-form" onSubmit={submit('Thanks — we will be in touch.')}><input required placeholder="Name" aria-label="Name" /><input required type="email" placeholder="Email" aria-label="Email" /><button type="submit">Submit <ArrowUpRight size={16} /></button></form><p className="full-form-note">{submitted}</p></div><div className="contact-card"><img className="contact-card-image" src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=85" alt="Professional consultant assisting a client" /><div className="contact-card-copy"><p className="full-eyebrow">ADVANCED CREATION STUDIO</p><h3>Chris Grisconis</h3><p>Founder &amp; Owner</p><a href="tel:9809809449">980-980-9449</a></div></div></section>

      <footer className="full-footer"><div><a href="/" className="full-logo">✦ L.L.B</a><p>Interested in partnering with us? <a href="mailto:admnowner@advancedcreationstudio.com">admnowner@advancedcreationstudio.com</a></p></div><div className="footer-link-grid">{['Overview', 'Services', 'Insights', 'Case studies', 'Practice areas', 'LinkedIn', 'Instagram'].map((link) => <a href="#top" key={link}>{link}</a>)}</div></footer>
    </main>
  );
}

function Router() {
  const [location, navigate] = useLocation();
  const page = location === '/' ? <SimpleHome /> :
    location === '/start' ? <Onboarding /> :
    location === '/workspace' ? <Workspace /> :
    location === '/legal-research' ? <LegalResearch navigate={navigate} /> :
    <NotFound />;

  return (
    <ErrorBoundary resetKey={location}>{page}</ErrorBoundary>
  );
}

function App() {
  return <Router />;
}

export default App;
