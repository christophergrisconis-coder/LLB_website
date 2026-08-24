import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { ArrowUpRight, ChevronRight, Menu, Search, X, Plus, LogOut, BriefcaseBusiness } from 'lucide-react';
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
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1000&q=85',
    alt: 'Sunlight passing through a quiet courthouse corridor',
    body: 'The most consequential sentence in a contract is often the one nobody stops to explain. We unpack the clauses, deadlines, and definitions that quietly move leverage before a dispute ever reaches the courtroom.',
  },
  {
    id: 'practice',
    section: 'Practice',
    title: 'A better way to build the case file',
    summary: 'Inside the working habits, tools, and rituals that help a legal team turn scattered facts into a clear point of view.',
    author: 'Rafi Sol',
    time: '6 min read',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1000&q=85',
    alt: 'Warm legal workspace with a chair, table, and window light',
    body: 'A case file is not just a container for documents. It is a way of seeing. We look at the working habits and quiet systems that help a legal team turn scattered facts into a point of view that holds.',
  },
  {
    id: 'precedent',
    section: 'Dispatch',
    title: 'When precedent stops being enough',
    summary: 'A field report on the gray areas where judgment, timing, and a well-placed question still make the difference.',
    author: 'Juniper Wells',
    time: '5 min read',
    image: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1000&q=85',
    alt: 'Blue courthouse meeting a rocky shoreline at dusk',
    body: 'Every matter has a point where the rulebook gives way to judgment. We follow the gray areas where timing, context, and one well-placed question still make the difference.',
  },
  {
    id: 'client-note',
    section: 'Notebook',
    title: 'In defense of the careful question',
    summary: 'Why the right question can save a team hours, sharpen a theory, and change the way a client sees the problem.',
    author: 'Owen Hart',
    time: '4 min read',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85',
    alt: 'Textured leather chair and table in a softly lit legal interior',
    body: 'The fast answer closes a door. The careful question opens the file again. It gathers context, pressure points, and the detail that changes the way a client sees the problem. This is not hesitation. It is preparation.',
  },
];

function Header({ onSearch, onArchive }: { onSearch: (trigger: HTMLButtonElement) => void; onArchive: (trigger: HTMLButtonElement) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigateTo = () => setMenuOpen(false);

  return (
    <header className="site-header" data-testid="header-site">
      <a className="brand" href="#top" onClick={navigateTo} data-testid="link-brand">
        <span className="brand-mark">✦</span>
        <span>L.L.B</span>
      </a>
      <nav className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        <a href="#dispatch" onClick={navigateTo} data-testid="link-dispatch">Solutions ⌄</a>
        <a href="#field-notes" onClick={navigateTo} data-testid="link-field-notes">About</a>
        <a href="#archive" onClick={navigateTo} data-testid="link-archive">Blog</a>
        <a href="#letter" onClick={navigateTo} data-testid="link-letter">Support ⌄</a>
      </nav>
      <div className="header-actions">
        <a className="header-cta" href="/start" onClick={navigateTo} data-testid="link-get-started">Get started</a>
        <button className="icon-button" aria-label="Open search" onClick={(event) => onSearch(event.currentTarget)} data-testid="button-open-search">
          <Search size={16} strokeWidth={1.5} />
        </button>
        <button className="icon-button" aria-label="Browse issues" onClick={(event) => onArchive(event.currentTarget)} data-testid="button-open-archive">
          <span className="issue-kicker">01</span>
        </button>
        <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)} data-testid="button-toggle-menu">
          {menuOpen ? <X size={17} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
}

function StoryTrigger({ story, lead = false, side = false, onOpen }: { story: Story; lead?: boolean; side?: boolean; onOpen: (story: Story, trigger: HTMLButtonElement) => void }) {
  const className = lead ? 'lead-story lead-button' : side ? 'side-story side-button' : 'story-row';
  return (
    <button className={className} onClick={(event) => onOpen(story, event.currentTarget)} data-testid={`button-open-story-${story.id}`}>
      {!lead && !side && <span className="story-number">{story.id === 'precedent' ? '04' : '05'}</span>}
      <div className={lead ? undefined : side ? 'thumb image-link' : undefined}>
        {side && <img src={story.image} alt={story.alt} />}
        {lead && (
          <>
            <div className="story-label">{story.section} / 01</div>
            <h2 className="story-title">{story.title}</h2>
            <p className="story-summary">{story.summary}</p>
            <div className="story-meta"><span>{story.author}</span><span>—</span><span className="reading-time">{story.time}</span></div>
          </>
        )}
        {!lead && side && <span className="arrow-flag"><ArrowUpRight size={15} strokeWidth={1.4} /></span>}
      </div>
      {side && (
        <div>
          <div className="story-label">{story.section}</div>
          <h3 className="story-title">{story.title}</h3>
          <div className="story-meta"><span>{story.author}</span><span className="reading-time">{story.time}</span></div>
        </div>
      )}
      {!lead && !side && (
        <>
          <div>
            <div className="story-label">{story.section}</div>
            <h3>{story.title}</h3>
          </div>
          <p>{story.summary}</p>
          <span className="row-arrow"><ArrowUpRight size={19} strokeWidth={1.4} /></span>
        </>
      )}
      {lead && <div className="lead-image image-link"><img src={story.image} alt={story.alt} /><span className="arrow-flag"><ArrowUpRight size={15} strokeWidth={1.4} /></span></div>}
    </button>
  );
}

function Hero() {
  const [, navigate] = useLocation();
  return (
    <section className="hero" id="top" data-testid="section-hero">
      <div className="hero-topline">
      </div>
      <div>
        <h1 className="hero-title reveal">Lawyer<br />s Legal<br /><em>Beef</em></h1>
        <p className="hero-deck reveal delay-1">The all-in-one Progressive Web App (PWA) built specifically for lawyers and legal teams. Streamline case management, legal research, document drafting, client billing, and trial prep in one unified platform.</p>
      </div>
       <div className="hero-footer">
        <div className="scroll-cue"><i /> Keep going</div>
         <div className="hero-action">
            <button className="primary-action" onClick={() => navigate('/start')} data-testid="button-start-workspace">Get started <ArrowUpRight size={16} /></button>
         </div>
      </div>
    </section>
  );
}

type WorkspaceData = {
  user: { name: string; email: string };
  workspace: { id: string; name: string } | null;
  cases: Array<{ id: number; title: string; client: string; status: string; priority: string; nextDeadline: string | null; notes: string | null }>;
};

function Onboarding() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: '', email: '', workspaceName: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not create your workspace.');
      navigate('/workspace');
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setSaving(false); }
  };
  return (
    <main className="workspace-shell onboarding-shell">
      <div className="workspace-grain" />
      <header className="workspace-header"><a className="brand" href="/" data-testid="link-workspace-brand"><span className="brand-mark">✦</span><span>L.L.B</span></a><span className="workspace-kicker">Private workspace / 01</span></header>
      <section className="onboarding-card">
        <p className="eyebrow">Start here</p>
        <h1>Make room<br /><em>for the work.</em></h1>
        <p className="onboarding-copy">Create a private case desk for your team. Your details are used to secure your workspace and bring you back to the right place.</p>
        <form onSubmit={submit} className="onboarding-form">
          <label>Your name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Avery Morgan" data-testid="input-onboarding-name" /></label>
          <label>Work email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="avery@firm.com" data-testid="input-onboarding-email" /></label>
          <label>Workspace name<input required value={form.workspaceName} onChange={e => setForm({ ...form, workspaceName: e.target.value })} placeholder="Morgan & Co." data-testid="input-onboarding-workspace" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="workspace-submit" disabled={saving} type="submit" data-testid="button-create-workspace">{saving ? 'Creating your desk…' : 'Create workspace'} <ArrowUpRight size={17} /></button>
        </form>
        <button className="back-link" onClick={() => navigate('/')} data-testid="button-back-home">← Return to the brief</button>
      </section>
    </main>
  );
}

function Workspace() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseForm, setCaseForm] = useState({ title: '', client: '' });
  const load = async () => {
    try {
      const response = await fetch('/api/workspace', { credentials: 'include' });
      if (response.status === 401) { navigate('/start'); return; }
      if (!response.ok) throw new Error('Could not load your workspace.');
      setData(await response.json());
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load your workspace.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const addCase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch('/api/workspace/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(caseForm) });
    if (response.ok) { setCaseForm({ title: '', client: '' }); setShowCaseForm(false); void load(); }
  };
  const logout = async () => { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); navigate('/'); };
  if (loading) return <main className="workspace-shell workspace-loading"><p>Opening your case desk…</p></main>;
  if (error || !data?.workspace) return <main className="workspace-shell workspace-loading"><p>{error || 'Workspace not found.'}</p><button onClick={() => navigate('/start')}>Start again</button></main>;
  return (
    <main className="workspace-shell">
      <header className="workspace-header"><a className="brand" href="/" data-testid="link-desk-brand"><span className="brand-mark">✦</span><span>L.L.B</span></a><div className="workspace-header-right"><span className="workspace-kicker">{data.user.name} / {data.user.email}</span><button className="logout-button" onClick={logout} data-testid="button-logout"><LogOut size={14} /> Sign out</button></div></header>
      <section className="desk-content">
        <div className="desk-intro"><div><p className="eyebrow">Case desk / 01</p><h1>{data.workspace.name}</h1><p>Keep the facts, next moves, and people in the room.</p></div><button className="desk-add" onClick={() => setShowCaseForm(!showCaseForm)} data-testid="button-add-case"><Plus size={17} /> Add case</button></div>
        {showCaseForm && <form className="quick-case-form" onSubmit={addCase}><input required value={caseForm.title} onChange={e => setCaseForm({ ...caseForm, title: e.target.value })} placeholder="Case or matter name" aria-label="Case title" /><input required value={caseForm.client} onChange={e => setCaseForm({ ...caseForm, client: e.target.value })} placeholder="Client" aria-label="Client" /><button type="submit">Save case <ArrowUpRight size={15} /></button></form>}
        <div className="desk-summary"><div><span>Active matters</span><strong>{data.cases.length.toString().padStart(2, '0')}</strong></div><div><span>Next move</span><strong>Keep context close</strong></div><div><span>Desk status</span><strong><i className="status-dot" /> In motion</strong></div></div>
        <div className="case-list"><div className="case-list-head"><span>Active case files</span><span>Updated now</span></div>{data.cases.map((legalCase, index) => <article className="case-card" key={legalCase.id}><div className="case-index">{String(index + 1).padStart(2, '0')}</div><div className="case-main"><p className="case-client">{legalCase.client}</p><h2>{legalCase.title}</h2><p>{legalCase.notes}</p></div><div className="case-meta"><span>{legalCase.status}</span><span className={legalCase.priority === 'High' ? 'priority-high' : ''}>{legalCase.priority} priority</span><small>Next: {legalCase.nextDeadline}</small></div><BriefcaseBusiness className="case-icon" size={22} strokeWidth={1.2} /></article>)}</div>
      </section>
    </main>
  );
}

function DispatchSection({ onOpen }: { onOpen: (story: Story, trigger: HTMLButtonElement) => void }) {
  return (
    <section className="section dispatch-section" id="dispatch" data-testid="section-dispatch">
      <div className="section-header reveal">
        <div><div className="eyebrow">01 / Solutions</div><h2 className="section-title">The case<br />for clarity.</h2></div>
        <p className="section-intro">A sharper way to move from intake to verdict. Find the thread, keep the context, and keep the whole team in the room.</p>
      </div>
      <div className="dispatch-grid">
        <StoryTrigger story={stories[0]} lead onOpen={onOpen} />
        <div className="side-stories">
          <StoryTrigger story={stories[1]} side onOpen={onOpen} />
          <StoryTrigger story={stories[2]} side onOpen={onOpen} />
        </div>
      </div>
    </section>
  );
}

function QuoteBand() {
  return (
    <section className="quote-band" data-testid="section-quote">
      <div className="quote-wrap reveal">
        <p className="quote-text">“The good lawyer makes the <span>complex clear.</span>”</p>
        <p className="quote-credit">— Lawyers Legal Beef<br />built for the work behind the argument</p>
      </div>
    </section>
  );
}

function FieldNotes() {
  return (
    <section className="section field-section" id="field-notes" data-testid="section-field-notes">
      <div className="section-header reveal">
        <div><div className="eyebrow">02 / About</div><h2 className="section-title">A different<br />kind of practice.</h2></div>
        <p className="section-intro">The best legal work is not hidden in more tabs. It is in the handoff between research, drafting, billing, and the people doing the work.</p>
      </div>
      <div className="field-stage reveal delay-1">
        <div className="field-photo"><img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85" alt="Mountain valley beneath a pale, cloud-filled sky" /></div>
        <p className="field-caption">For every legal team<br />One unified workspace<br />A clearer path through the case</p>
        <div className="field-note">
          <p>“Go where the case becomes a conversation.”</p>
          <small>Practice note no. 006</small>
        </div>
        <span className="field-index">L.L.B — 01 — PRACTICE</span>
      </div>
    </section>
  );
}

function MoreStories({ onOpen }: { onOpen: (story: Story, trigger: HTMLButtonElement) => void }) {
  return (
    <section className="section stories-section" id="more" data-testid="section-more-stories">
      <div className="section-header reveal">
        <div><div className="eyebrow">03 / Blog</div><h2 className="section-title">Keep the<br />edge.</h2></div>
        <p className="section-intro">Practical notes, sharp opinions, and useful questions that keep a legal team one step ahead.</p>
      </div>
      <div className="story-list">
        {stories.slice(3).map((story, index) => (
          <StoryTrigger key={story.id} story={{ ...story, id: index === 0 ? 'precedent' : 'client-note' }} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function ArchiveSection({ onArchive }: { onArchive: (trigger: HTMLButtonElement) => void }) {
  return (
    <section className="section archive-section" id="archive" data-testid="section-archive">
      <div className="reveal">
        <div className="eyebrow">04 / Support</div>
        <h2 className="section-title">Keep the<br />work moving.</h2>
        <p className="section-intro">From first question to final filing, Lawyers Legal Beef keeps your practice moving with the context where you need it.</p>
        <button className="archive-link" onClick={(event) => onArchive(event.currentTarget)} data-testid="button-browse-archive">Explore the platform <ChevronRight size={14} /></button>
      </div>
      <div className="issue-stack reveal delay-1" aria-label="Selected magazine issues">
        <div className="issue-card one"><span className="issue-big">CASE<br /><i>/ FLOW</i></span><span className="issue-name">01 — Case management</span></div>
        <div className="issue-card two"><span className="issue-big">LEGAL<br />RESEARCH</span><span className="issue-name">02 — Find the thread</span></div>
        <div className="issue-card three"><span className="issue-big">TRIAL<br />READY</span><span className="issue-name">03 — Make the argument</span></div>
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setStatus('A real email helps us find you.');
      return;
    }
    setStatus('You are on the list. The next briefing is on its way.');
    setEmail('');
  };
  return (
    <section className="newsletter" id="letter" data-testid="section-newsletter">
      <h2 className="reveal">A better brief<br /><i>changes the case.</i></h2>
      <div className="newsletter-copy reveal delay-1">
        <p>Get practical legal insights, product notes, and sharp takes for modern legal teams. No noise. Just useful signal.</p>
        <form className="newsletter-form" onSubmit={submit}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" aria-label="Email address" data-testid="input-newsletter-email" />
          <button type="submit" aria-label="Join the letter" data-testid="button-submit-newsletter"><ArrowUpRight size={20} strokeWidth={1.4} /></button>
        </form>
        <p className="newsletter-feedback" role="status" data-testid="status-newsletter">{status}</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" data-testid="footer-site">
      <div><a className="brand footer-brand" href="#top" data-testid="link-footer-brand"><span className="brand-mark">✦</span><span>L.L.B</span></a><p className="footer-note">Lawyers Legal Beef — the operating system for the modern legal team.</p></div>
      <nav className="footer-links" aria-label="Footer navigation"><a href="#dispatch" data-testid="link-footer-dispatch">Solutions</a><a href="#field-notes" data-testid="link-footer-field">About</a><a href="#letter" data-testid="link-footer-letter">Support</a></nav>
      <p className="footer-credit">Built for the work / 2025</p>
    </footer>
  );
}

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useFocusTrap(dialogRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
      );

    if (!dialog.contains(document.activeElement)) {
      getFocusableElements()[0]?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [dialogRef]);
}

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.classList.add('overlay-open');
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.classList.remove('overlay-open');
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}

function SearchOverlay({ onClose, onOpen }: { onClose: () => void; onOpen: (story: Story, trigger: HTMLButtonElement) => void }) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stories;
    return stories.filter((story) => `${story.title} ${story.section} ${story.author}`.toLowerCase().includes(term));
  }, [query]);
  useFocusTrap(dialogRef);
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()} data-testid="overlay-search">
      <div ref={dialogRef} className="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title" tabIndex={-1}>
        <button className="close-button" aria-label="Close search" onClick={onClose} data-testid="button-close-search"><X size={16} /></button>
        <p className="panel-kicker">Find your way in</p>
        <h2 className="panel-title" id="search-title">Search the<br />practice.</h2>
        <div className="search-input-wrap"><Search size={17} /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “case”, “briefing”, or a name" aria-label="Search legal insights" data-testid="input-search-stories" /></div>
        <div className="search-results">
          {results.length ? results.map((story) => (
               <button className="search-result" key={story.id} onClick={(event) => { onOpen(story, event.currentTarget); onClose(); }} data-testid={`button-search-result-${story.id}`}>
              <span><span className="search-result-title">{story.title}</span><span className="search-result-meta">{story.section} — {story.author}</span></span>
              <ArrowUpRight size={17} />
            </button>
          )) : <p className="empty-search">No result by that name yet. Try another legal question.</p>}
        </div>
      </div>
    </div>
  );
}

function ArchiveOverlay({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()} data-testid="overlay-archive">
      <div ref={dialogRef} className="archive-panel" role="dialog" aria-modal="true" aria-labelledby="archive-title" tabIndex={-1}>
        <button className="close-button" aria-label="Close archive" onClick={onClose} data-testid="button-close-archive"><X size={16} /></button>
        <p className="panel-kicker">The resource library</p>
        <h2 className="panel-title" id="archive-title">Find the<br />right tool.</h2>
        <div className="archive-grid">
          {['Case management — One source of truth', 'Legal research — Find the thread', 'Document drafting — Move faster', 'Trial prep — Make the argument'].map((issue, index) => (
            <button className="archive-mini" key={issue} onClick={onClose} data-testid={`button-archive-issue-${index + 1}`}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{issue}</span></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReaderOverlay({ story, onClose }: { story: Story; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef);
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()} data-testid="overlay-reader">
      <article ref={dialogRef} className="reader-panel" role="dialog" aria-modal="true" aria-labelledby="reader-title" tabIndex={-1}>
        <button className="close-button" aria-label="Close story" onClick={onClose} data-testid="button-close-reader"><X size={16} /></button>
        <img className="reader-hero" src={story.image} alt={story.alt} />
        <p className="panel-kicker">{story.section}</p>
        <h2 id="reader-title">{story.title}</h2>
        <p className="reader-byline">{story.author} / {story.time}</p>
        <p className="reader-copy">{story.body}</p>
      </article>
    </div>
  );
}

export function Home() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const archiveTriggerRef = useRef<HTMLButtonElement | null>(null);
  const storyTriggerRef = useRef<HTMLButtonElement | null>(null);
  useScrollLock(searchOpen || archiveOpen || selectedStory !== null);

  const restoreFocus = (trigger: HTMLButtonElement | null, fallback?: HTMLButtonElement | null) => {
    const target = trigger?.isConnected ? trigger : fallback?.isConnected ? fallback : null;
    target?.focus();
  };

  useEffect(() => {
    if (!searchOpen) restoreFocus(searchTriggerRef.current);
  }, [searchOpen]);

  useEffect(() => {
    if (!archiveOpen) restoreFocus(archiveTriggerRef.current);
  }, [archiveOpen]);

  useEffect(() => {
    if (!selectedStory) restoreFocus(storyTriggerRef.current, searchTriggerRef.current);
  }, [selectedStory]);

  useEffect(() => {
    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const width = max > 0 ? (window.scrollY / max) * 100 : 0;
      document.documentElement.style.setProperty('--scroll-width', `${width}%`);
      const fieldSection = document.querySelector<HTMLElement>('.field-section');
      const fieldPhoto = document.querySelector<HTMLElement>('.field-photo');
      if (fieldSection && fieldPhoto) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const distance = window.innerHeight / 2 - (fieldSection.getBoundingClientRect().top + fieldSection.offsetHeight / 2);
        fieldPhoto.style.setProperty('--parallax-y', reduced ? '0px' : `${Math.max(-34, Math.min(34, distance * 0.08))}px`);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=3').catch(() => undefined);
    return () => {
      revealObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setArchiveOpen(false);
        setSelectedStory(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="app-shell" data-testid="app-shell">
      <div className="grain" />
      <div className="scroll-progress" style={{ width: 'var(--scroll-width)' }} />
      <Header
        onSearch={(trigger) => { searchTriggerRef.current = trigger; setSearchOpen(true); }}
        onArchive={(trigger) => { archiveTriggerRef.current = trigger; setArchiveOpen(true); }}
      />
      <Hero />
      <DispatchSection onOpen={(story, trigger) => { storyTriggerRef.current = trigger; setSelectedStory(story); }} />
      <QuoteBand />
      <FieldNotes />
      <MoreStories onOpen={(story, trigger) => { storyTriggerRef.current = trigger; setSelectedStory(story); }} />
      <ArchiveSection onArchive={(trigger) => { archiveTriggerRef.current = trigger; setArchiveOpen(true); }} />
      <Newsletter />
      <Footer />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onOpen={(story, trigger) => { storyTriggerRef.current = trigger; setSelectedStory(story); }} />}
      {archiveOpen && <ArchiveOverlay onClose={() => setArchiveOpen(false)} />}
      {selectedStory && <ReaderOverlay story={selectedStory} onClose={() => setSelectedStory(null)} />}
    </main>
  );
}

function SimpleHome() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);
  const featureTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [caseLawQuery, setCaseLawQuery] = useState('');
  const [caseLawFilter, setCaseLawFilter] = useState<'all' | 'state' | 'federal'>('all');
  const submit = (message: string) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(message);
  };
  const features = [
    ['Customizable Legal Brief Creation', "Generate precision-crafted legal briefs in minutes. Access a massive library of customizable templates for pleadings, motions, and discovery demands that automatically format to your jurisdiction's standards."],
    ['Searchable Case Law Database', 'Never lose a precedent again. Access a comprehensive, built-in Case Law Database. Search across millions of records, highlight critical findings, and save specific case laws directly to your active client folders for rapid retrieval.'],
    ['Real-Time Call Transcription (VoIP Integration)', "Connect your Google Voice or business number directly to the PWA. Automatically record and transcribe client calls in real-time. Hands-free, worry-free documentation that instantly syncs to the client's billing and case file."],
    ['Courtroom & Offline PWA Sync', 'Access case files, evidence binders, and schedules offline. Changes and drafted notes sync automatically to the cloud the moment you reconnect to the internet.'],
    ['Secure Client Portal & E-Signatures', 'Provide a white-labeled, encrypted portal for your clients. Securely request documents, share case updates, and collect legally binding e-signatures without relying on third-party software.'],
    ['Time Tracking & Automated Billing', 'Log billable hours passively while you work in the app. Manage trust accounts and send itemized invoices directly through the unified PWA portal.'],
  ];
  const faqs = [
    'What is Lawyers Legal Beef?',
    'How does the Progressive Web App (PWA) benefit my firm?',
    'Is client and case data secure?',
    'Can I access case files while offline in court?',
  ];
  const articleImages = [
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=85',
  ];
  const selectFeature = (index: number) => setActiveFeature(Math.max(0, Math.min(features.length - 1, index)));
  const handleFeatureKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = Math.min(features.length - 1, currentIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = features.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      selectFeature(nextIndex);
      featureTabRefs.current[nextIndex]?.focus();
    }
  };
  const caseLaw = [
    { citation: '494 U.S. 433 (1990)', title: 'McKoy v. North Carolina', source: 'federal', topic: 'Capital sentencing', outcome: 'Defense-favorable', summary: 'The Court rejected North Carolina’s unanimity requirement for mitigating circumstances in capital sentencing, protecting individualized consideration of mitigation.' },
    { citation: '400 U.S. 25 (1970)', title: 'North Carolina v. Alford', source: 'federal', topic: 'Guilty pleas', outcome: 'Defense-favorable', summary: 'An NC-origin plea case recognizing that a defendant may plead guilty while maintaining a claim of innocence when the record supports the plea.' },
    { citation: '363 N.C. 539, 681 S.E.2d 788 (2009)', title: 'State v. Batts', source: 'state', topic: 'Juvenile sentencing', outcome: 'Defense-favorable', summary: 'North Carolina Supreme Court authority addressing the constitutional limits on the harshest sentences for juvenile defendants.' },
    { citation: '345 N.C. 175, 478 S.E.2d 17 (1996)', title: 'State v. Jones', source: 'state', topic: 'Jury instructions', outcome: 'Defense-favorable', summary: 'A North Carolina appellate authority emphasizing the trial court’s duty to give the jury a complete instruction on a supported defense theory.' },
  ] as const;
  const visibleCaseLaw = caseLaw.filter((authority) => {
    const matchesFilter = caseLawFilter === 'all' || authority.source === caseLawFilter;
    const term = caseLawQuery.trim().toLowerCase();
    return matchesFilter && (!term || `${authority.title} ${authority.citation} ${authority.topic} ${authority.summary}`.toLowerCase().includes(term));
  });
  return (
    <main className="full-site" data-testid="app-shell">
      <header className="full-header">
        <div className="full-nav-container">
          <a href="/" className="full-logo" data-testid="link-brand"><span>✦</span> L.L.B</a>
          <nav className="full-nav-links" aria-label="Main navigation">
            <a href="#features">Solutions ⌄</a><a href="#case-law">Case law</a><a href="#about">About</a><a href="#insights">Blog</a><a href="#faq">Support ⌄</a>
          </nav>
          <a href="/start" className="full-primary-button" data-testid="link-get-started">Get started</a>
        </div>
      </header>

      <section className="full-hero" id="top">
        <div className="full-hero-container">
          <div className="full-hero-text">
            <p className="full-eyebrow">Lawyers Legal Beef</p>
            <h1>Lawyers<br /><em>Legal Beef</em></h1>
            <p className="full-lead">The all-in-one Progressive Web App (PWA) built specifically for lawyers and legal teams. Streamline case management, legal research, document drafting, client billing, and trial prep in one unified platform.</p>
            <form className="full-inline-form" onSubmit={submit('Get updates request received.')}>
              <input required type="email" placeholder="Your email address" aria-label="Email address" />
              <button type="submit">Submit</button>
            </form>
            <p className="full-form-note">Get updates</p>
          </div>
          <div className="full-hero-placeholder"><img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1600&q=85" alt="Legal team working together at a modern desk" /></div>
        </div>
      </section>

      <section className="trusted-section" id="about">
        <p className="full-eyebrow">TRUSTED BY 2.5M+ ORGANIZATIONS</p>
        <h2>Trusted by 500+ Top Law Firms &amp; Legal Teams</h2>
        <div className="logo-grid">{['VANCE & PARTNERS', 'NORTHSTAR LAW', 'CIVIC GROUP', 'ARGUMENT', 'COUNSEL CO.'].map((logo) => <div className="logo-placeholder" key={logo}>{logo}</div>)}</div>
      </section>

      <section className="features-section feature-section" id="features">
        <div className="features-header feature-heading"><p className="full-eyebrow">THE PLATFORM</p><h2>One App That Does It All for Law Practices</h2><p>Lawyers Legal Beef replaces disconnected legal software with a single Progressive Web App (PWA). Work seamlessly online or offline from courtroom to desktop.</p></div>
        <div className="features-tabs-layout">
          <div className="feature-visual feature-placeholder"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85" alt="Sleek modern office representing streamlined legal operations" /></div>
          <div className="features-tabs">
            <div className="features-grid" role="tablist" aria-label="Legal platform features">
              {features.map(([title], index) => (
                <button
                  className={`feature-card ${activeFeature === index ? 'active' : ''}`}
                  id={`feature-tab-${index}`}
                  key={title}
                  role="tab"
                  aria-selected={activeFeature === index}
                  aria-controls={`feature-panel-${index}`}
                  tabIndex={activeFeature === index ? 0 : -1}
                  ref={(element) => { featureTabRefs.current[index] = element; }}
                  onClick={() => selectFeature(index)}
                  onKeyDown={(event) => handleFeatureKeyDown(event, index)}
                >
                  <span>0{index + 1}</span>
                  <strong>{title}</strong>
                </button>
              ))}
            </div>
            <article className="feature-panel" id={`feature-panel-${activeFeature}`} role="tabpanel" aria-labelledby={`feature-tab-${activeFeature}`} tabIndex={0}>
              <p className="full-eyebrow">FEATURE 0{activeFeature + 1}</p>
              <h3>{features[activeFeature][0]}</h3>
              <p>{features[activeFeature][1]}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="case-law-section" id="case-law">
        <div className="case-law-heading">
          <div><p className="full-eyebrow">NC AUTHORITY INDEX</p><h2>Find the<br /><em>stronger point.</em></h2></div>
          <p>Start with a tightly scoped index of North Carolina state authority and NC-origin federal decisions with landmark reversals or defense-favorable holdings.</p>
        </div>
        <div className="case-law-tools">
          <label className="case-law-search"><span className="sr-only">Search North Carolina authorities</span><input type="search" value={caseLawQuery} onChange={(event) => setCaseLawQuery(event.target.value)} placeholder="Search citation, issue, or case name" /><span>⌕</span></label>
          <div className="case-law-filters" role="group" aria-label="Filter by jurisdiction">
            {(['all', 'state', 'federal'] as const).map((filter) => <button key={filter} className={caseLawFilter === filter ? 'active' : ''} onClick={() => setCaseLawFilter(filter)}>{filter === 'all' ? 'All NC authority' : filter === 'state' ? 'NC state' : 'NC federal'}</button>)}
          </div>
        </div>
        <div className="case-law-list">
          {visibleCaseLaw.map((authority) => <article className="case-law-card" key={authority.title}>
            <div className="case-law-card-top"><span className="case-law-source">{authority.source === 'state' ? 'North Carolina state' : 'Federal / NC origin'}</span><span className="case-law-outcome">{authority.outcome}</span></div>
            <h3>{authority.title}</h3><p className="case-law-citation">{authority.citation} · {authority.topic}</p><p>{authority.summary}</p>
            <button className="case-law-link" onClick={() => setSubmitted(`Research note saved for ${authority.title}.`)}>Save to case file <ArrowUpRight size={15} /></button>
          </article>)}
          {!visibleCaseLaw.length && <p className="case-law-empty">No authority matches that search. Try a citation, issue, or case name.</p>}
        </div>
        <p className="case-law-disclaimer">Research index only. Confirm current treatment, jurisdiction, and procedural posture in your licensed LexisNexis or official reporter source before relying on any authority.</p>
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
  const [location] = useLocation();
  const page = location === '/' ? <SimpleHome /> :
    location === '/start' ? <Onboarding /> :
    location === '/workspace' ? <Workspace /> :
    <NotFound />;

  return (
    <ErrorBoundary resetKey={location}>{page}</ErrorBoundary>
  );
}

function App() {
  return <Router />;
}

export default App;