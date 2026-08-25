/**
 * caselaw-offline-store.ts
 * ========================
 * High-performance IndexedDB & LocalStorage client for Lawyers Legal Beef PWA.
 * Enables 100% offline courtroom access to 170+ Federal & State case law precedents,
 * holdings, rules of law, key principles, and saved research notes.
 */

export interface CaseAuthority {
  title: string;
  citation: string;
  year: number;
  court: string;
  practice_area: string;
  holding: string;
  key_principles: string;
  rule_of_law: string;
  application_notes?: string;
  related_statutes?: string[];
  primary_topics?: string[];
  status: string;
  lexis_cite?: string;
  category: 'all' | '922g_firearms' | 'rico_conspiracy' | 'drug_trafficking' | 'murder_homicide' | 'constitutional' | 'nc_federal' | 'general_precedent';
  source: 'federal' | 'state';
  isBookmarked?: boolean;
  userNote?: string;
}

const DB_NAME = 'LLB_CaseLaw_DB';
const DB_VERSION = 1;
const STORE_CASES = 'cases';
const STORE_BOOKMARKS = 'bookmarks';
const LOCAL_STORAGE_KEY = 'llb_caselaw_fallback_v1';
const BOOKMARKS_STORAGE_KEY = 'llb_caselaw_bookmarks_v1';

class CaseLawOfflineStore {
  private memoryCache: CaseAuthority[] | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.initIndexedDB();
    }
  }

  private initIndexedDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CASES)) {
            db.createObjectStore(STORE_CASES, { keyPath: 'citation' });
          }
          if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
            db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'citation' });
          }
        };
        req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
        req.onerror = () => resolve(null);
      } catch (err) {
        console.warn('IndexedDB initialization failed, falling back to LocalStorage', err);
        resolve(null);
      }
    });
  }

  public async getCases(): Promise<CaseAuthority[]> {
    if (this.memoryCache && this.memoryCache.length > 0) {
      return this.memoryCache;
    }

    // Try IndexedDB
    const db = await this.dbPromise;
    if (db) {
      const fromDB = await new Promise<CaseAuthority[]>((resolve) => {
        try {
          const tx = db.transaction(STORE_CASES, 'readonly');
          const store = tx.objectStore(STORE_CASES);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      if (fromDB.length > 0) {
        this.memoryCache = fromDB;
        return fromDB;
      }
    }

    // Try LocalStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memoryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // continue to fetch
    }

    // Fetch from bundled JSON payload
    try {
      const res = await fetch('/data/case_law_export.json');
      if (res.ok) {
        const fetched: CaseAuthority[] = await res.json();
        this.saveCasesToOffline(fetched);
        this.memoryCache = fetched;
        return fetched;
      }
    } catch (err) {
      console.warn('Network fetch failed for case law export payload, using empty offline set', err);
    }

    return [];
  }

  public async saveCasesToOffline(cases: CaseAuthority[]): Promise<void> {
    this.memoryCache = cases;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cases));
    } catch (e) {
      console.warn('Could not save cases to localStorage', e);
    }

    const db = await this.dbPromise;
    if (db) {
      try {
        const tx = db.transaction(STORE_CASES, 'readwrite');
        const store = tx.objectStore(STORE_CASES);
        cases.forEach((item) => store.put(item));
      } catch (err) {
        console.warn('Error saving cases to IndexedDB', err);
      }
    }
  }

  public async filterCases(
    query: string,
    category: string,
    jurisdiction: string
  ): Promise<CaseAuthority[]> {
    const allCases = await this.getCases();
    const q = query.trim().toLowerCase();

    return allCases.filter((c) => {
      const matchesCategory =
        category === 'all' || c.category === category || (category === '922g_firearms' && c.category === '922g_firearms');
      const matchesJurisdiction =
        jurisdiction === 'all' ||
        (jurisdiction === 'federal' && c.source === 'federal') ||
        (jurisdiction === 'state' && c.source === 'state');

      if (!matchesCategory || !matchesJurisdiction) return false;
      if (!q) return true;

      return (
        c.title.toLowerCase().includes(q) ||
        c.citation.toLowerCase().includes(q) ||
        c.holding.toLowerCase().includes(q) ||
        c.key_principles.toLowerCase().includes(q) ||
        c.court.toLowerCase().includes(q) ||
        c.practice_area.toLowerCase().includes(q) ||
        (c.rule_of_law && c.rule_of_law.toLowerCase().includes(q))
      );
    });
  }

  public getBookmarks(): string[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public toggleBookmark(citation: string): boolean {
    const bookmarks = this.getBookmarks();
    const idx = bookmarks.indexOf(citation);
    let isBookmarked = false;

    if (idx >= 0) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push(citation);
      isBookmarked = true;
    }

    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }

    return isBookmarked;
  }
}

export const offlineCaseLawStore = new CaseLawOfflineStore();
