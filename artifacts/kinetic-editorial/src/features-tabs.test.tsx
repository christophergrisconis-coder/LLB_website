import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App, { Home } from './App';

const featureNames = [
  'Customizable Legal Brief Creation',
  'Searchable Case Law Database',
  'Real-Time Call Transcription (VoIP Integration)',
  'Courtroom & Offline PWA Sync',
  'Secure Client Portal & E-Signatures',
  'Time Tracking & Automated Billing',
];

function renderFeatures() {
  window.history.replaceState({}, '', '/');
  render(<App />);
  return {
    tablist: screen.getByRole('tablist', { name: 'Legal platform features' }),
    tabs: () => screen.getAllByRole('tab'),
    panel: () => screen.getByRole('tabpanel'),
  };
}

function renderEditorialHome() {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  });
  render(<Home />);
}

describe('feature tabs accessibility', () => {
  it('selects the first tab initially and shows its panel', () => {
    const { tabs, panel } = renderFeatures();
    const firstTab = tabs()[0];

    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(panel()).toHaveAttribute('aria-labelledby', firstTab.id);
    expect(within(panel()).getByRole('heading', { level: 3 })).toHaveTextContent(featureNames[0]);
  });

  it('moves selection and focus with arrows, and supports Home and End', async () => {
    const user = userEvent.setup();
    const { tabs, panel } = renderFeatures();
    const firstTab = tabs()[0];

    await user.click(firstTab);
    await user.keyboard('{ArrowRight}');
    expect(tabs()[1]).toHaveFocus();
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(tabs()[2]).toHaveFocus();
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(tabs()[0]).toHaveFocus();
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(tabs()[tabs().length - 1]).toHaveFocus();
    expect(tabs()[tabs().length - 1]).toHaveAttribute('aria-selected', 'true');
    expect(panel()).toHaveAttribute('aria-labelledby', tabs()[tabs().length - 1].id);
    expect(within(panel()).getByRole('heading', { level: 3 })).toHaveTextContent(featureNames.at(-1)!);

    await user.keyboard('{ArrowLeft}');
    expect(tabs()[tabs().length - 2]).toHaveFocus();
  });

  it('keeps the selected tab and visible panel synchronized', async () => {
    const user = userEvent.setup();
    const { tabs, panel } = renderFeatures();

    await user.click(tabs()[3]);

    expect(tabs()[3]).toHaveAttribute('aria-selected', 'true');
    expect(tabs().filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(panel()).toHaveAttribute('id', tabs()[3].getAttribute('aria-controls'));
    expect(panel()).toHaveAttribute('aria-labelledby', tabs()[3].id);
    expect(within(panel()).getByRole('heading', { level: 3 })).toHaveTextContent(featureNames[3]);
  });

  it('does not create horizontal overflow at a narrow viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    const { tablist } = renderFeatures();

    expect(tablist.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth || window.innerWidth);
    expect(tablist.querySelectorAll('button')).toHaveLength(featureNames.length);

    fireEvent(window, new Event('resize'));
  });

  it('returns focus to the control that opened each overlay', async () => {
    const user = userEvent.setup();
    renderEditorialHome();

    const searchTrigger = screen.getByTestId('button-open-search');
    await user.click(searchTrigger);
    await user.click(screen.getByTestId('button-close-search'));
    expect(searchTrigger).toHaveFocus();

    const archiveTrigger = screen.getByTestId('button-open-archive');
    await user.click(archiveTrigger);
    await user.keyboard('{Escape}');
    expect(archiveTrigger).toHaveFocus();

    const storyTrigger = screen.getByTestId('button-open-story-case-law');
    await user.click(storyTrigger);
    await user.click(screen.getByTestId('button-close-reader'));
    expect(storyTrigger).toHaveFocus();
  });

  it('keeps Tab and Shift+Tab within every open overlay', async () => {
    const user = userEvent.setup();
    renderEditorialHome();

    await user.click(screen.getByTestId('button-open-search'));
    const searchDialog = screen.getByRole('dialog', { name: /search thepractice/i });
    const searchFocusables = within(searchDialog).getAllByRole('button');
    searchFocusables.at(-1)!.focus();
    await user.tab();
    expect(searchDialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toBe(searchFocusables[0]);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(searchFocusables.at(-1));
    await user.click(screen.getByTestId('button-close-search'));

    await user.click(screen.getByTestId('button-open-archive'));
    const archiveDialog = screen.getByRole('dialog', { name: /find theright tool/i });
    const archiveFocusables = within(archiveDialog).getAllByRole('button');
    archiveFocusables.at(-1)!.focus();
    await user.tab();
    expect(document.activeElement).toBe(archiveFocusables[0]);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(archiveFocusables.at(-1));
    await user.click(screen.getByTestId('button-close-archive'));

    await user.click(screen.getByTestId('button-open-story-case-law'));
    const readerDialog = screen.getByRole('dialog', { name: /the cases that changed the room/i });
    const readerClose = within(readerDialog).getByRole('button', { name: 'Close story' });
    readerClose.focus();
    await user.tab();
    expect(document.activeElement).toBe(readerClose);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(readerClose);
  });

  it('searches the NC authority index across metadata and summaries', async () => {
    const user = userEvent.setup();
    renderFeatures();

    const search = screen.getByRole('searchbox', { name: 'Search North Carolina authorities' });
    await user.type(search, 'Medicaid');

    expect(screen.getByTestId('case-law-card-pashby-v-delia')).toBeInTheDocument();
    expect(screen.getByTestId('case-law-card-pashby-v-cansler')).toBeInTheDocument();
    expect(screen.queryByTestId('case-law-card-corum-v-university-of-north-carolina')).not.toBeInTheDocument();
  });

  it('filters the authority index by state and federal jurisdiction', async () => {
    const user = userEvent.setup();
    renderFeatures();

    await user.click(screen.getByRole('button', { name: 'NC state' }));
    expect(screen.getByTestId('case-law-card-corum-v-university-of-north-carolina')).toBeInTheDocument();
    expect(screen.queryByTestId('case-law-card-mc-koy-v-north-carolina')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'NC federal' }));
    expect(screen.getByTestId('case-law-card-mc-koy-v-north-carolina')).toBeInTheDocument();
    expect(screen.queryByTestId('case-law-card-corum-v-university-of-north-carolina')).not.toBeInTheDocument();
  });

  it('shows a clear empty state when no authority matches', async () => {
    const user = userEvent.setup();
    renderFeatures();

    await user.type(screen.getByRole('searchbox', { name: 'Search North Carolina authorities' }), 'not-a-real-authority');

    expect(screen.getByText('No authority matches that search. Try a citation, issue, or case name.')).toBeInTheDocument();
  });

  it('renders detailed posture, tags, and provenance for authority records', () => {
    renderFeatures();

    const dogwood = screen.getByTestId('case-law-card-dogwood-development-v-white-oak');
    expect(within(dogwood).getByText(/Review of an appeal dismissed/)).toBeInTheDocument();
    expect(within(dogwood).getByText('Appellate practice')).toBeInTheDocument();
    expect(within(dogwood).getByText('Public repository')).toBeInTheDocument();
    expect(within(dogwood).getByRole('link', { name: /View source/i })).toHaveAttribute('target', '_blank');

    const corum = screen.getByTestId('case-law-card-corum-v-university-of-north-carolina');
    expect(within(corum).getByText('Official source')).toBeInTheDocument();
    expect(within(corum).getByRole('link', { name: /View source/i })).toHaveAttribute('href', 'https://appellate.nccourts.org/opinions/');
  });
});