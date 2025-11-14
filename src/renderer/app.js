import { initStudentsSection } from './Students.js';
import { initTeachersSection } from './Teachers.js';
import { initClassesSections } from './ClassesSections.js';
import { initTimetableSection } from './Timetable.js';
import { initSubjectsSection } from './Subjects.js';
import { initFeesSection } from './Fees.js';
import { initExpensesSection } from './Expenses.js';
import { initIncomeSection } from './Income.js';
import { initSalariesSection } from './Salaries.js';
import { initReportsSection } from './Reports.js';
import { initSettingsSection } from './Settings.js';

// Simple helpers available to sections
export function qs(sel, el = document) { return el.querySelector(sel); }
export function qsa(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

// Tabs navigation
qsa('nav.tabs button').forEach(btn => btn.addEventListener('click', () => {
  qsa('nav.tabs button').forEach(b => b.classList.remove('active'));
  qsa('main .tab').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const tabId = btn.dataset.tab;
  const target = qs(`#${tabId}`);
  if (target) target.classList.add('active');

  // When switching to timetable, refresh its dropdowns and grid from latest data
  if (tabId === 'timetable' && typeof window.__sinarRefreshTimetable === 'function') {
    window.__sinarRefreshTimetable();
  }
}));

// Initialize sections
initStudentsSection({ qs, qsa });
initTeachersSection({ qs, qsa });
initClassesSections({ qs, qsa });
initTimetableSection({ qs, qsa });
initSubjectsSection({ qs, qsa });
initFeesSection({ qs, qsa });
initExpensesSection({ qs, qsa });
initIncomeSection({ qs, qsa });
initSalariesSection({ qs, qsa });
initReportsSection({ qs, qsa });
initSettingsSection({ qs, qsa });
