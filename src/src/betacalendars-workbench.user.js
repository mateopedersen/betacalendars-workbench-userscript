// ==UserScript==
// @name         Beta Calendars Workbench — Grid Inspector, Print Lab & Local Planner
// @namespace    https://www.betacalendars.com/
// @version      1.0.0
// @description  Adds calendar geometry inspection, ISO week diagnostics, local planning, print controls, accessibility tools, navigation and offline exports to BetaCalendars.com.
// @author       Pedersen Mateo
// @license      MIT
// @homepageURL  https://github.com/mateopedersen/betacalendars-workbench-userscript
// @supportURL   https://github.com/mateopedersen/betacalendars-workbench-userscript/issues
// @match        https://www.betacalendars.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/* Beta Calendars Workbench: self-contained, offline-first, and deliberately readable. */
(function betaCalendarsWorkbench() {
  'use strict';

  const STORE = 'betacalendars.workbench.v1';
  const PREFS = 'betacalendars.workbench.settings.v1';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const RESOURCES = [
    { label: 'Beta Calendars', url: 'https://www.betacalendars.com/', group: 'Main' },
    { label: 'Monthly Calendar', url: 'https://www.betacalendars.com/monthly-calendar', group: 'Monthly' },
    { label: 'Blank Calendar', url: 'https://www.betacalendars.com/blank-calendar', group: 'Monthly' },
    { label: 'Monthly Planner', url: 'https://www.betacalendars.com/monthly-planner', group: 'Planning' },
    { label: 'Weekly Calendar', url: 'https://www.betacalendars.com/weekly-calendar', group: 'Planning' },
    { label: 'Weekly Planner', url: 'https://www.betacalendars.com/weekly-planner', group: 'Planning' },
    ...MONTHS.map((month, index) => ({ label: `${month} Calendar`, url: `https://www.betacalendars.com/${month.toLowerCase()}-calendar.html`, group: 'Months', month: index + 1 }))
  ];
  const DEFAULTS = { weekStart: 'monday', outside: true, fixedRows: false, weekNumbers: false, theme: 'system', contrast: false, largeText: false, underline: false, reducedMotion: 'system', openNewTab: false, paper: 'A4', orientation: 'portrait', margin: 'normal', showLauncher: true, shortcuts: true, date: todayCivil(), month: todayCivil().month, year: todayCivil().year };

  function leapYear(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
  function daysInMonth(year, month) {
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) return 0;
    return [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }
  function validDate(date) { return Boolean(date && Number.isInteger(date.year) && date.year >= 1 && date.year <= 9999 && Number.isInteger(date.month) && Number.isInteger(date.day) && date.day >= 1 && date.day <= daysInMonth(date.year, date.month)); }
  function utcDate(year, month, day) { const date = new Date(0); date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(year, month - 1, day); return date; }
  function dayOfWeek(year, month, day) { return utcDate(year, month, day).getUTCDay(); }
  function dayOfYear(year, month, day) { return Math.round((utcDate(year, month, day) - utcDate(year, 1, 1)) / 86400000) + 1; }
  function addDays(date, amount) { const result = utcDate(date.year, date.month, date.day); result.setUTCDate(result.getUTCDate() + amount); return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() }; }
  function compareDates(a, b) { return Math.sign(utcDate(a.year, a.month, a.day) - utcDate(b.year, b.month, b.day)); }
  function dateText(date) { return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`; }
  function isoWeek(date) {
    const utc = utcDate(date.year, date.month, date.day);
    const isoDay = (utc.getUTCDay() + 6) % 7 + 1;
    utc.setUTCDate(utc.getUTCDate() + 4 - isoDay);
    const year = utc.getUTCFullYear();
    const firstThursday = utcDate(year, 1, 4);
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - ((firstThursday.getUTCDay() + 6) % 7 + 1));
    const week = 1 + Math.round((utc - firstThursday) / 604800000);
    return { year, week, weekday: isoDay, text: `${year}-W${String(week).padStart(2, '0')}` };
  }
  function monthGrid(year, month, weekStart = 'monday', fixedRows = false) {
    const first = dayOfWeek(year, month, 1);
    const startDay = weekStart === 'sunday' ? 0 : 1;
    const leading = (first - startDay + 7) % 7;
    const naturalRows = Math.ceil((leading + daysInMonth(year, month)) / 7);
    const rows = fixedRows ? 6 : naturalRows;
    const start = addDays({ year, month, day: 1 }, -leading);
    return { year, month, weekStart, firstWeekday: first, leading, naturalRows, rows, cells: Array.from({ length: rows * 7 }, (_, index) => addDays(start, index)) };
  }
  function inspect(date) {
    if (!validDate(date)) throw new RangeError('Choose a valid date.');
    const dow = dayOfWeek(date.year, date.month, date.day);
    const iso = isoWeek(date);
    const mondayColumn = (dow + 6) % 7;
    return { date: dateText(date), weekday: WEEKDAYS[dow], ordinal: dayOfYear(date.year, date.month, date.day), monthDays: daysInMonth(date.year, date.month), monthRemaining: daysInMonth(date.year, date.month) - date.day, quarter: Math.floor((date.month - 1) / 3) + 1, leap: leapYear(date.year), isoYear: iso.year, isoWeek: iso.week, isoDay: iso.weekday, mondayColumn, sundayColumn: dow };
  }
  function todayCivil() { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }; }
  function readSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS) || '{}') }; } catch { return { ...DEFAULTS }; } }
  function saveSettings(settings) { localStorage.setItem(PREFS, JSON.stringify(settings)); }
  function readNotes() { try { const data = JSON.parse(localStorage.getItem(STORE) || '{"schema":1,"notes":[]}'); return Array.isArray(data.notes) ? data.notes.filter(note => validDate(note.date) && typeof note.title === 'string') : []; } catch { return []; } }
  function saveNotes(notes) { localStorage.setItem(STORE, JSON.stringify({ schema: 1, notes })); }
  function escapeCsv(value) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function csvExport(notes) { return ['date,title,category,status', ...notes.map(note => [dateText(note.date), note.title, note.category || '', note.done ? 'complete' : 'open'].map(escapeCsv).join(','))].join('\r\n'); }
  function validateImport(value) {
    let parsed;
    try { parsed = typeof value === 'string' ? JSON.parse(value) : value; } catch { throw new Error('That file is not valid JSON.'); }
    if (!parsed || parsed.schema !== 1 || !Array.isArray(parsed.notes)) throw new Error('Expected a Workbench JSON export with schema 1 and a notes list.');
    if (parsed.notes.length > 5000) throw new Error('The import contains too many notes (limit: 5,000).');
    return parsed.notes.map(note => {
      if (!validDate(note.date) || typeof note.title !== 'string' || note.title.length > 500) throw new Error('An imported note has an invalid date or title.');
      return { id: crypto.randomUUID(), date: { ...note.date }, title: note.title, category: String(note.category || '').slice(0, 80), priority: ['low', 'normal', 'high'].includes(note.priority) ? note.priority : 'normal', done: Boolean(note.done) };
    });
  }
  function pageContext() {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return { type: 'homepage' };
    if (path.includes('blank-calendar')) return { type: 'blank calendar' };
    if (path.includes('monthly-planner')) return { type: 'monthly planner' };
    if (path.includes('monthly-calendar')) return { type: 'monthly calendar' };
    if (path.includes('weekly-planner')) return { type: 'weekly planner' };
    if (path.includes('weekly-calendar')) return { type: 'weekly calendar' };
    const slug = path.match(/\/([a-z]+)-calendar\.html$/)?.[1];
    const month = MONTHS.findIndex(item => item.toLowerCase() === slug) + 1;
    const evidence = `${document.title} ${document.querySelector('main h1, h1')?.textContent || ''}`;
    const year = Number(evidence.match(/\b(20\d{2})\b/)?.[1]) || null;
    if (month) return { type: 'specific month', month, year };
    if (/calendar|planner/i.test(evidence)) return { type: 'calendar or planner page' };
    return { type: 'other Beta Calendars page' };
  }
  function validation(year, month, weekStart) {
    const grid = monthGrid(year, month, weekStart);
    const actualDates = grid.cells.filter(date => date.month === month).map(date => date.day);
    const expected = daysInMonth(year, month);
    const firstCorrect = dayOfWeek(year, month, 1) === grid.firstWeekday;
    const details = [
      ['Correct days in month', actualDates.length === expected],
      ['All dates present', actualDates.length === expected && actualDates.every((day, index) => day === index + 1)],
      ['No duplicate date', new Set(actualDates).size === actualDates.length],
      ['Sequential dates', grid.cells.every((date, index) => index === 0 || compareDates(addDays(grid.cells[index - 1], 1), date) === 0)],
      ['Weekday continuity', grid.cells.every((date, index) => dayOfWeek(date.year, date.month, date.day) === (index + (weekStart === 'monday' ? 1 : 0)) % 7)],
      ['Leading cells correct', grid.leading === ((grid.firstWeekday - (weekStart === 'sunday' ? 0 : 1) + 7) % 7)],
      ['Row count between 4 and 6', grid.naturalRows >= 4 && grid.naturalRows <= 6],
      ['Correct first weekday', firstCorrect],
      ['Correct last weekday', dayOfWeek(year, month, expected) === grid.cells.findLast(date => date.month === month).day % 7 + dayOfWeek(year, month, expected) - dayOfWeek(year, month, expected)]
    ];
    details[8][1] = grid.cells.filter(date => date.month === month).at(-1)?.day === expected;
    return { grid, details, passed: details.every(item => item[1]) };
  }

  function boot() {
    if (window.top !== window.self || document.getElementById('bcw-root')) return;
    const context = pageContext();
    const settings = readSettings();
    let notes = readNotes();
    let activeTab = 'Overview';
    let focusedBeforeOpen = null;
    const host = document.createElement('div'); host.id = 'bcw-root';
    Object.assign(host.style, { position: 'fixed', inset: 'auto 18px 18px auto', zIndex: '2147483000' });
    document.documentElement.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = CSS;
    shadow.append(style);
    const launcher = el('button', 'bcw-launcher', 'BC'); launcher.type = 'button'; launcher.setAttribute('aria-label', 'Open Beta Calendars Workbench'); launcher.setAttribute('aria-expanded', 'false'); shadow.append(launcher);
    const panel = el('section', 'bcw-panel'); panel.setAttribute('aria-label', 'Beta Calendars Workbench'); panel.hidden = true; shadow.append(panel);
    const dialog = el('div', 'bcw-dialog-backdrop'); dialog.hidden = true; dialog.setAttribute('role', 'presentation'); shadow.append(dialog);
    const printStyle = document.createElement('style'); printStyle.id = 'bcw-print-style'; shadow.append(printStyle);
    let printTimer;

    function render() {
      panel.replaceChildren();
      const header = el('header', 'bcw-header');
      const brand = el('div'); const eyebrow = el('div', 'bcw-eyebrow', 'BETA CALENDARS'); const title = el('h1', '', 'Workbench'); brand.append(eyebrow, title);
      const actions = el('div', 'bcw-header-actions'); const paletteButton = button('Ctrl/⌘ + Shift + K', () => openPalette()); paletteButton.setAttribute('aria-label', 'Open command palette'); const closeButton = button('×', closePanel); closeButton.setAttribute('aria-label', 'Close Workbench'); actions.append(paletteButton, closeButton); header.append(brand, actions);
      const contextBar = el('div', 'bcw-context'); contextBar.append(el('span', '', `Page: ${context.type}`)); contextBar.append(el('span', '', context.month ? `${MONTHS[context.month - 1]}${context.year ? ` ${context.year}` : ''}` : `${MONTHS[settings.month - 1]} ${settings.year}`));
      const tabs = el('nav', 'bcw-tabs'); tabs.setAttribute('aria-label', 'Workbench sections');
      const names = ['Overview', 'Month Grid', 'Date Inspector', 'ISO Week', 'Planner', 'Print Lab', 'Validation', 'Resources', 'Settings'];
      names.forEach(name => { const tab = button(name, () => { activeTab = name; render(); }); tab.setAttribute('aria-current', activeTab === name ? 'page' : 'false'); tabs.append(tab); });
      const body = el('main', 'bcw-body'); body.append(renderTab());
      panel.append(header, contextBar, tabs, body);
      panel.classList.toggle('bcw-dark', settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches));
      panel.classList.toggle('bcw-contrast', settings.contrast); panel.classList.toggle('bcw-large', settings.largeText); panel.classList.toggle('bcw-underline', settings.underline); panel.classList.toggle('bcw-reduce', settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches));
    }
    function renderTab() {
      switch (activeTab) {
        case 'Month Grid': return monthPanel();
        case 'Date Inspector': return datePanel();
        case 'ISO Week': return isoPanel();
        case 'Planner': return plannerPanel();
        case 'Print Lab': return printPanel();
        case 'Validation': return validationPanel();
        case 'Resources': return resourcesPanel();
        case 'Settings': return settingsPanel();
        default: return overviewPanel();
      }
    }
    function overviewPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Calendar engineering, in your browser'), el('p', 'bcw-muted', 'Inspect month geometry, check ISO boundaries, plan locally, and prepare clean print layouts. Calculations work offline.'));
      const cards = el('div', 'bcw-cards');
      [['Month Grid', `${monthGrid(settings.year, settings.month, settings.weekStart).naturalRows} natural rows`], ['Date Inspector', dateText(settings.date)], ['ISO Week', isoWeek(settings.date).text], ['Planner', `${notes.length} local notes`]].forEach(([name, value]) => { const card = button('', () => { activeTab = name; render(); }); card.className = 'bcw-card'; card.append(el('strong', '', name), el('span', '', value)); cards.append(card); }); wrap.append(cards);
      const quick = el('div', 'bcw-row'); quick.append(button('Previous month', () => shiftMonth(-1)), button('Current month', () => setMonth(todayCivil().year, todayCivil().month)), button('Next month', () => shiftMonth(1))); wrap.append(quick);
      const quickActions = el('div', 'bcw-row'); quickActions.append(button('Open Print Lab', () => { activeTab = 'Print Lab'; render(); }), button('Run validation', () => { activeTab = 'Validation'; render(); }), button('⌘/Ctrl + Shift + K commands', openPalette)); wrap.append(quickActions);
      const privacy = el('p', 'bcw-callout', 'Planner notes stay in this browser. No calendar data is sent to a server.'); wrap.append(privacy);
      const page = el('section', 'bcw-page-diagnostics'); page.append(el('h3', '', 'Page diagnostics')); page.append(el('p', '', `Detected page type: ${context.type}${context.month ? ` · ${MONTHS[context.month - 1]}` : ''}${context.year ? ` ${context.year}` : ''}`));
      const year = context.year || settings.year; const month = context.month || settings.month; const geom = monthGrid(year, month, settings.weekStart); page.append(el('p', '', `Expected calendar geometry: ${WEEKDAYS[dayOfWeek(year, month, 1)]} start · ${daysInMonth(year, month)} days · ${geom.naturalRows} natural rows (${settings.weekStart}-first).`)); wrap.append(page);
      return wrap;
    }
    function monthPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Month Grid Inspector'), el('p', 'bcw-muted', 'Compare natural four-, five-, or six-row layouts. This independent grid does not replace the page calendar.'));
      const controls = el('div', 'bcw-controls'); const monthSelect = select(MONTHS.map((name, i) => [i + 1, name]), settings.month, value => { settings.month = Number(value); saveSettings(settings); render(); }); const yearInput = input(String(settings.year), 'number', value => { const year = Number(value); if (year >= 1 && year <= 9999) { settings.year = year; saveSettings(settings); render(); } }); yearInput.min = '1'; yearInput.max = '9999';
      controls.append(field('Month', monthSelect), field('Year', yearInput), field('Week starts', select([['monday', 'Monday'], ['sunday', 'Sunday']], settings.weekStart, value => { settings.weekStart = value; saveSettings(settings); render(); })), field('Layout', select([['natural', 'Natural rows'], ['fixed', 'Fixed 6 rows']], settings.fixedRows ? 'fixed' : 'natural', value => { settings.fixedRows = value === 'fixed'; saveSettings(settings); render(); })), field('Outside dates', select([['show', 'Show'], ['hide', 'Hide']], settings.outside ? 'show' : 'hide', value => { settings.outside = value === 'show'; saveSettings(settings); render(); })), field('Week numbers', select([['off', 'Off'], ['iso', 'ISO']], settings.weekNumbers ? 'iso' : 'off', value => { settings.weekNumbers = value === 'iso'; saveSettings(settings); render(); })));
      wrap.append(controls, gridView(settings.year, settings.month)); const result = validation(settings.year, settings.month, settings.weekStart); wrap.append(el('p', result.passed ? 'bcw-pass' : 'bcw-fail', `${result.passed ? 'PASS' : 'FAIL'} · ${result.grid.naturalRows} natural rows · ${result.grid.leading} leading day${result.grid.leading === 1 ? '' : 's'}`)); return wrap;
    }
    function gridView(year, month) {
      const grid = monthGrid(year, month, settings.weekStart, settings.fixedRows); const wrap = el('div', 'bcw-grid-wrap'); const table = el('table', 'bcw-grid'); const caption = el('caption', '', `${MONTHS[month - 1]} ${year} · ${settings.weekStart}-first · ${grid.rows} rows`); table.append(caption);
      const head = el('thead'); const headerRow = el('tr'); if (settings.weekNumbers) headerRow.append(el('th', '', 'Wk')); const dayNames = settings.weekStart === 'monday' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; dayNames.forEach(name => headerRow.append(el('th', '', name))); head.append(headerRow); table.append(head);
      const body = el('tbody'); for (let row = 0; row < grid.rows; row++) { const tr = el('tr'); const weekDate = grid.cells[row * 7]; if (settings.weekNumbers) tr.append(el('th', 'bcw-weekno', String(isoWeek(weekDate).week))); for (let col = 0; col < 7; col++) { const date = grid.cells[row * 7 + col]; const td = el('td'); const cell = button(String(date.day), () => { settings.date = date; saveSettings(settings); activeTab = 'Date Inspector'; render(); }); cell.className = 'bcw-day'; cell.setAttribute('aria-label', `${WEEKDAYS[dayOfWeek(date.year, date.month, date.day)]}, ${MONTHS[date.month - 1]} ${date.day}, ${date.year}`); if (date.month !== month && !settings.outside) cell.textContent = ''; else if (date.month !== month) cell.classList.add('bcw-outside'); if (date.date && notes.some(note => dateText(note.date) === dateText(date))) cell.append(el('span', 'bcw-note-dot', '•')); if (dateText(date) === dateText(todayCivil())) cell.classList.add('bcw-today'); td.append(cell); tr.append(td); } body.append(tr); }
      table.append(body); wrap.append(table); const actions = el('div', 'bcw-row'); actions.append(button('Previous month', () => shiftMonth(-1)), button('Today', () => { const date = todayCivil(); setMonth(date.year, date.month); settings.date = date; }), button('Next month', () => shiftMonth(1))); wrap.append(actions); return wrap;
    }
    function datePanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Civil Date Inspector'), el('p', 'bcw-muted', 'Gregorian date arithmetic uses UTC-based civil days, so the selected date does not shift with your timezone.'));
      const dateInput = input(dateText(settings.date), 'date', value => { const [year, month, day] = value.split('-').map(Number); const date = { year, month, day }; if (validDate(date)) { settings.date = date; settings.month = month; settings.year = year; saveSettings(settings); render(); } }); dateInput.value = dateText(settings.date); wrap.append(field('Choose a date', dateInput));
      const result = inspect(settings.date); const list = el('dl', 'bcw-facts'); [['Gregorian date', `${result.date} · ${result.weekday}`], ['Day of year', `${result.ordinal} of ${leapYear(settings.date.year) ? 366 : 365}`], ['Days in month', result.monthDays], ['Days remaining in month', result.monthRemaining], ['Quarter', `Q${result.quarter}`], ['Leap year', result.leap ? 'Yes' : 'No'], ['ISO week', `${result.isoYear}-W${String(result.isoWeek).padStart(2, '0')}`], ['ISO weekday', result.isoDay], ['Monday-first column', result.mondayColumn + 1], ['Sunday-first column', result.sundayColumn + 1]].forEach(([term, value]) => { list.append(el('dt', '', term), el('dd', '', String(value))); }); wrap.append(list); return wrap;
    }
    function isoPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'ISO Week Lab'), el('p', 'bcw-muted', 'ISO week-years can differ from calendar years near New Year. Week 1 is the week containing the first Thursday.'));
      const iso = isoWeek(settings.date); wrap.append(el('p', 'bcw-big-value', `${iso.year}-W${String(iso.week).padStart(2, '0')}-${iso.weekday}`), el('p', '', `Calendar year ${settings.date.year} · ISO week-year ${iso.year} · ISO weekday ${iso.weekday}`));
      const explorer = el('section', 'bcw-page-diagnostics'); explorer.append(el('h3', '', 'Boundary Explorer'));
      const yearInput = input(String(settings.year), 'number', value => { const year = Number(value); if (year > 0 && year < 10000) { settings.year = year; saveSettings(settings); render(); } }); yearInput.min = '1'; yearInput.max = '9999'; explorer.append(field('Year', yearInput));
      const table = el('table', 'bcw-simple-table'); [['Dec 28', { year: settings.year, month: 12, day: 28 }], ['Jan 4', { year: settings.year + 1, month: 1, day: 4 }]].forEach(([label, date]) => { const row = el('tr'); const week = isoWeek(date); [label, dateText(date), WEEKDAYS[dayOfWeek(date.year, date.month, date.day)], `${week.year}-W${String(week.week).padStart(2, '0')}`].forEach(value => row.append(el('td', '', String(value)))); table.append(row); }); explorer.append(table); wrap.append(explorer); return wrap;
    }
    function plannerPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Local Planner'), el('p', 'bcw-callout', 'Planner notes stay in this browser. They are not uploaded or synchronized.'));
      const form = el('form', 'bcw-note-form'); const date = input(dateText(settings.date), 'date'); const title = input('', 'text'); title.maxLength = 500; title.required = true; title.placeholder = 'What do you need to remember?'; const category = input('', 'text'); category.maxLength = 80; category.placeholder = 'Category (optional)'; const priority = select([['low', 'Low priority'], ['normal', 'Normal priority'], ['high', 'High priority']], 'normal', () => {}); const submit = button('Add note'); submit.type = 'submit'; form.append(field('Date', date), field('Note', title), field('Category', category), field('Priority', priority), submit); form.addEventListener('submit', event => { event.preventDefault(); const [year, month, day] = date.value.split('-').map(Number); const noteDate = { year, month, day }; if (!validDate(noteDate) || !title.value.trim()) return; notes.push({ id: crypto.randomUUID(), date: noteDate, title: title.value.trim(), category: category.value.trim(), priority: priority.value, done: false }); saveNotes(notes); render(); }); wrap.append(form);
      const list = el('div', 'bcw-note-list'); if (!notes.length) list.append(el('p', 'bcw-muted', 'No notes yet. Add one above; it will stay on this device and browser.'));
      notes.slice().sort((a, b) => compareDates(a.date, b.date)).forEach(note => { const card = el('article', 'bcw-note'); const check = el('input'); check.type = 'checkbox'; check.checked = note.done; check.setAttribute('aria-label', `Mark ${note.title} complete`); check.addEventListener('change', () => { note.done = check.checked; saveNotes(notes); render(); }); const content = el('div'); content.append(el('strong', note.done ? 'bcw-complete' : '', note.title), el('p', 'bcw-muted', `${dateText(note.date)}${note.category ? ` · ${note.category}` : ''} · ${note.priority} priority`)); const remove = button('Delete', () => { notes = notes.filter(item => item.id !== note.id); saveNotes(notes); render(); }); card.append(check, content, remove); list.append(card); }); wrap.append(list);
      const actions = el('div', 'bcw-row'); actions.append(button('Export JSON', () => download('beta-calendars-notes.json', JSON.stringify({ schema: 1, notes }, null, 2), 'application/json')), button('Export CSV', () => download('beta-calendars-notes.csv', csvExport(notes), 'text/csv'))); const importInput = el('input'); importInput.type = 'file'; importInput.accept = 'application/json,.json'; importInput.setAttribute('aria-label', 'Import planner notes'); importInput.addEventListener('change', async () => { try { const imported = validateImport(await importInput.files[0].text()); notes = [...notes, ...imported]; saveNotes(notes); render(); } catch (error) { alert(error.message); } }); actions.append(field('Import JSON', importInput), button('Delete all notes', () => { if (confirm('Delete all local planner notes from this browser?')) { notes = []; saveNotes(notes); render(); } })); wrap.append(actions); return wrap;
    }
    function printPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Print Lab'), el('p', 'bcw-muted', 'Print settings apply temporarily and are removed when the print dialog closes. Estimates do not control printer hardware.'));
      const settingsRow = el('div', 'bcw-controls'); settingsRow.append(field('Paper', select([['A4', 'A4'], ['Letter', 'US Letter']], settings.paper, value => update('paper', value))), field('Orientation', select([['portrait', 'Portrait'], ['landscape', 'Landscape']], settings.orientation, value => update('orientation', value))), field('Margins', select([['compact', 'Compact'], ['normal', 'Normal'], ['wide', 'Wide']], settings.margin, value => update('margin', value))), field('Month', select(MONTHS.map((name, i) => [i + 1, name]), settings.month, value => update('month', Number(value))))); wrap.append(settingsRow);
      const blank = el('div', 'bcw-controls');
      const blankOptions = { weekdays: true, notes: true, adjacent: settings.outside, strongBorders: false };
      blank.append(field('Blank month title', input('', 'text', value => { const previewTitle = shadow.querySelector('.bcw-blank-title'); if (previewTitle) previewTitle.textContent = value; })), field('Show weekday names', toggle('Weekday names', true, checked => { blankOptions.weekdays = checked; previewGrid(); })), field('Notes section', toggle('Notes area', true, checked => { blankOptions.notes = checked; previewGrid(); })), field('Adjacent dates', toggle('Adjacent dates', settings.outside, checked => { blankOptions.adjacent = checked; previewGrid(); })), field('High contrast borders', toggle('Strong borders', false, checked => { blankOptions.strongBorders = checked; previewGrid(); }))); wrap.append(blank);
      const preview = el('section', 'bcw-print-preview'); preview.append(el('h3', 'bcw-blank-title', `${MONTHS[settings.month - 1]} ${settings.year}`)); const previewArea = el('div', 'bcw-preview-area'); preview.append(previewArea);
      function previewGrid() { previewArea.replaceChildren(gridView(settings.year, settings.month)); previewArea.querySelectorAll('.bcw-grid thead').forEach(head => { head.hidden = !blankOptions.weekdays; }); previewArea.querySelectorAll('.bcw-day.bcw-outside').forEach(cell => { if (!blankOptions.adjacent) cell.textContent = ''; }); preview.classList.toggle('bcw-strong-borders', blankOptions.strongBorders); if (blankOptions.notes) previewArea.append(el('div', 'bcw-writing-area', 'Notes')); }
      previewGrid(); const metrics = el('div', 'bcw-page-diagnostics'); const width = settings.paper === 'A4' ? (settings.orientation === 'portrait' ? 210 : 297) : (settings.orientation === 'portrait' ? 216 : 279); const height = settings.paper === 'A4' ? (settings.orientation === 'portrait' ? 297 : 210) : (settings.orientation === 'portrait' ? 279 : 216); const margins = { compact: 6, normal: 12, wide: 20 }[settings.margin]; const geom = monthGrid(settings.year, settings.month, settings.weekStart); const cellRatio = ((width - 2 * margins) / 7) / ((height - 2 * margins) / (geom.rows + 2) * 0.72); metrics.append(el('h3', '', 'Page estimate')); metrics.append(el('p', '', `Page ${width} × ${height} mm · usable ${(width - 2 * margins).toFixed(0)} × ${(height - 2 * margins).toFixed(0)} mm · ${geom.rows} calendar rows · cell ratio about ${cellRatio.toFixed(2)}.`)); metrics.append(el('p', 'bcw-muted', geom.rows === 6 ? 'Six calendar rows may leave less writing space.' : 'The selected geometry leaves room for writing.')); wrap.append(metrics, preview, button('Print this calendar', printCalendar)); return wrap;
    }
    function validationPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Calendar Validation'), el('p', 'bcw-muted', 'Independent Gregorian regression matrix for 2027. Compare Monday-first and Sunday-first natural geometry.'));
      const table = el('table', 'bcw-simple-table'); const head = el('tr'); ['Month', 'First weekday', 'Days', 'Mon rows', 'Sun rows', 'Checks'].forEach(label => head.append(el('th', '', label))); table.append(head);
      MONTHS.forEach((name, index) => { const month = index + 1; const monday = validation(2027, month, 'monday'); const sunday = validation(2027, month, 'sunday'); const row = el('tr'); [name, WEEKDAYS[dayOfWeek(2027, month, 1)], daysInMonth(2027, month), monday.grid.naturalRows, sunday.grid.naturalRows, monday.passed && sunday.passed ? 'PASS' : 'FAIL'].forEach(value => row.append(el('td', '', String(value)))); table.append(row); }); wrap.append(table);
      const active = validation(settings.year, settings.month, settings.weekStart); const report = el('ul', 'bcw-checks'); active.details.forEach(([label, pass]) => { const item = el('li', pass ? 'bcw-pass' : 'bcw-fail', `${pass ? 'PASS' : 'FAIL'} · ${label}`); report.append(item); }); wrap.append(el('h3', '', `Selected month: ${MONTHS[settings.month - 1]} ${settings.year}`), report); return wrap;
    }
    function resourcesPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Resource Navigator'), el('p', 'bcw-muted', 'Optional links to relevant Beta Calendars pages. Links open only after you choose one.'));
      for (const group of ['Main', 'Monthly', 'Planning', 'Months']) { const section = el('section', 'bcw-resource-section'); section.append(el('h3', '', group === 'Main' ? 'Beta Calendars' : group)); const list = el('div', 'bcw-resource-list'); RESOURCES.filter(item => item.group === group).forEach(item => { const link = el('a', 'bcw-resource-link', item.label); link.href = item.url; if (settings.openNewTab) { link.target = '_blank'; link.rel = 'noopener noreferrer'; } list.append(link); }); section.append(list); wrap.append(section); }
      return wrap;
    }
    function settingsPanel() {
      const wrap = el('div'); wrap.append(el('h2', '', 'Settings'), el('p', 'bcw-muted', 'Preferences are stored locally in this browser.'));
      const list = el('div', 'bcw-settings-list'); list.append(field('Week starts', select([['monday', 'Monday'], ['sunday', 'Sunday']], settings.weekStart, value => update('weekStart', value))), field('Theme', select([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme, value => update('theme', value))), field('Reduced motion', select([['system', 'System preference'], ['on', 'On'], ['off', 'Off']], settings.reducedMotion, value => update('reducedMotion', value))), field('Resource links', select([['same', 'Open in this tab'], ['new', 'Open in a new tab']], settings.openNewTab ? 'new' : 'same', value => update('openNewTab', value === 'new'))));
      [['High contrast', 'contrast'], ['Larger text', 'largeText'], ['Underline links', 'underline'], ['Floating launcher', 'showLauncher'], ['Keyboard shortcuts', 'shortcuts']].forEach(([label, key]) => list.append(field(label, toggle(label, settings[key], checked => update(key, checked))))); wrap.append(list);
      wrap.append(button('Reset settings', () => { if (confirm('Reset Workbench settings in this browser?')) { Object.assign(settings, DEFAULTS); saveSettings(settings); render(); } })); return wrap;
    }
    function openPanel() { focusedBeforeOpen = shadow.activeElement; panel.hidden = false; launcher.hidden = true; launcher.setAttribute('aria-expanded', 'true'); render(); panel.querySelector('button')?.focus(); }
    function closePanel() { panel.hidden = true; launcher.hidden = !settings.showLauncher; launcher.setAttribute('aria-expanded', 'false'); dialog.hidden = true; printStyle.textContent = ''; document.getElementById('bcw-print-global')?.remove(); if (focusedBeforeOpen?.isConnected) focusedBeforeOpen.focus(); else if (!launcher.hidden) launcher.focus(); }
    function openTab(name) { activeTab = name; if (panel.hidden) openPanel(); else render(); }
    function setMonth(year, month) { settings.year = year; settings.month = month; settings.date = { year, month, day: Math.min(settings.date.day, daysInMonth(year, month)) }; saveSettings(settings); render(); }
    function shiftMonth(amount) { let year = settings.year; let month = settings.month + amount; if (month < 1) { month = 12; year -= 1; } if (month > 12) { month = 1; year += 1; } if (year > 0 && year < 10000) setMonth(year, month); }
    function update(key, value) { settings[key] = value; saveSettings(settings); if (key === 'showLauncher') launcher.hidden = panel.hidden && !value; render(); }
    function printCalendar() { const margin = { compact: '6mm', normal: '12mm', wide: '20mm' }[settings.margin]; const globalPrint = document.createElement('style'); globalPrint.id = 'bcw-print-global'; globalPrint.textContent = `@page{size:${settings.paper} ${settings.orientation};margin:${margin}}@media print{body>*:not(#bcw-root){display:none!important}#bcw-root{position:static!important;inset:auto!important;width:100%!important;height:auto!important}}`; document.head.append(globalPrint); printStyle.textContent = `@media print{:host{position:static!important;inset:auto!important}.bcw-panel{display:block!important;position:static!important;width:100%!important;height:auto!important;max-height:none!important;box-shadow:none!important;border:0!important;border-radius:0!important}.bcw-header,.bcw-context,.bcw-tabs,.bcw-page-diagnostics,.bcw-controls,.bcw-row,.bcw-launcher,.bcw-print-preview~button{display:none!important}.bcw-body{overflow:visible!important;padding:0!important}.bcw-grid{width:100%!important;border-collapse:collapse!important}.bcw-grid td,.bcw-grid th{border:1px solid #111!important;height:23mm!important;color:#111!important;background:#fff!important}.bcw-print-preview{display:block!important}.bcw-print-preview h3{display:block!important}.bcw-writing-area{min-height:25mm!important}.bcw-strong-borders .bcw-grid td{border-width:2px!important}}`; activeTab = 'Print Lab'; render(); window.addEventListener('afterprint', () => { printStyle.textContent = ''; globalPrint.remove(); }, { once: true }); clearTimeout(printTimer); printTimer = setTimeout(() => { printStyle.textContent = ''; globalPrint.remove(); }, 60000); window.print(); }
    function openPalette() {
      dialog.replaceChildren(); dialog.hidden = false; const box = el('section', 'bcw-palette'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Command palette'); const search = input('', 'search'); search.placeholder = 'Search commands…'; search.setAttribute('aria-label', 'Search commands'); const results = el('div', 'bcw-command-results'); box.append(search, results); dialog.append(box);
      const commands = [['Open Month Grid', () => openTab('Month Grid')], ['Inspect Current Date', () => { settings.date = todayCivil(); settings.month = settings.date.month; settings.year = settings.date.year; openTab('Date Inspector'); }], ['Jump to Month', () => openTab('Month Grid')], ['Previous Month', () => { shiftMonth(-1); openTab('Month Grid'); }], ['Next Month', () => { shiftMonth(1); openTab('Month Grid'); }], ['Current Month', () => { const date = todayCivil(); setMonth(date.year, date.month); openTab('Month Grid'); }], ['Toggle Monday/Sunday Week Start', () => update('weekStart', settings.weekStart === 'monday' ? 'sunday' : 'monday')], ['Open Print Lab', () => openTab('Print Lab')], ['Open Planner', () => openTab('Planner')], ['Run Calendar Validation', () => openTab('Validation')], ['Export Notes', () => download('beta-calendars-notes.json', JSON.stringify({ schema: 1, notes }, null, 2), 'application/json')], ['Open Resources', () => openTab('Resources')], ['Toggle High Contrast', () => update('contrast', !settings.contrast)], ['Close Workbench', closePanel]];
      let selected = 0; function draw() { results.replaceChildren(); const filtered = commands.filter(([label]) => label.toLowerCase().includes(search.value.toLowerCase())); if (selected >= filtered.length) selected = 0; filtered.forEach(([label, run], index) => { const item = button(label, () => { dialog.hidden = true; run(); }); item.className = `bcw-command${index === selected ? ' bcw-selected' : ''}`; results.append(item); }); }
      search.addEventListener('input', () => { selected = 0; draw(); }); search.addEventListener('keydown', event => { const length = results.querySelectorAll('button').length; if (event.key === 'ArrowDown') { event.preventDefault(); selected = (selected + 1) % Math.max(length, 1); draw(); } else if (event.key === 'ArrowUp') { event.preventDefault(); selected = (selected - 1 + Math.max(length, 1)) % Math.max(length, 1); draw(); } else if (event.key === 'Enter') { event.preventDefault(); results.querySelectorAll('button')[selected]?.click(); } else if (event.key === 'Escape') { dialog.hidden = true; launcher.focus(); } }); dialog.addEventListener('click', event => { if (event.target === dialog) dialog.hidden = true; }, { once: true }); draw(); search.focus();
    }

    launcher.addEventListener('click', openPanel);
    shadow.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.hidden) { dialog.hidden = true; launcher.focus(); } else if (event.key === 'Escape' && !panel.hidden) closePanel(); else if (event.key === 'Tab' && !panel.hidden && dialog.hidden) { const focusable = [...panel.querySelectorAll('button,input,select,a,[tabindex="0"]')].filter(item => !item.disabled && item.offsetParent !== null); if (focusable.length && event.shiftKey && shadow.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); } else if (focusable.length && !event.shiftKey && shadow.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); } } });
    window.addEventListener('keydown', event => { if (settings.shortcuts && (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') { event.preventDefault(); if (panel.hidden) openPanel(); openPalette(); } });
    launcher.hidden = !settings.showLauncher; render();
  }

  function el(tag, className = '', text = '') { const node = document.createElement(tag); if (className) node.className = className; if (text !== '') node.textContent = String(text); return node; }
  function button(text, action) { const node = el('button', 'bcw-button', text); node.type = 'button'; node.addEventListener('click', action); return node; }
  function input(value, type, onInput) { const node = el('input'); node.type = type; node.value = value; if (onInput) node.addEventListener(type === 'date' || type === 'number' ? 'change' : 'input', () => onInput(node.value)); return node; }
  function select(options, value, onChange) { const node = el('select'); options.forEach(([key, label]) => { const option = el('option', '', label); option.value = String(key); node.append(option); }); node.value = String(value); node.addEventListener('change', () => onChange(node.value)); return node; }
  function field(label, control) { const wrap = el('label', 'bcw-field'); wrap.append(el('span', '', label), control); return wrap; }
  function toggle(label, checked, onChange) { const inputNode = el('input'); inputNode.type = 'checkbox'; inputNode.checked = checked; inputNode.addEventListener('change', () => onChange?.(inputNode.checked)); inputNode.setAttribute('aria-label', label); return inputNode; }
  function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = el('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

  const CSS = `:host{all:initial;color-scheme:light dark;font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}.bcw-launcher{border:0;border-radius:50%;width:54px;height:54px;background:#1459a6;color:#fff;font-weight:800;font-size:17px;box-shadow:0 4px 18px #0004;cursor:pointer}.bcw-panel{position:fixed;right:0;bottom:0;width:min(760px,calc(100vw - 28px));height:min(790px,calc(100vh - 28px));background:#f7f9fc;color:#17212f;border:1px solid #c8d1dc;border-radius:18px;box-shadow:0 20px 75px #0005;display:flex;flex-direction:column;overflow:hidden}.bcw-dark{background:#141b24;color:#edf3fa;border-color:#3b4857}.bcw-header{display:flex;align-items:center;justify-content:space-between;padding:17px 20px 10px}.bcw-eyebrow{font-size:10px;letter-spacing:.14em;font-weight:800;color:#4379b1}.bcw-header h1{font-size:22px;margin:2px 0 0}.bcw-header-actions,.bcw-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bcw-button,.bcw-tabs button{font:inherit;border:1px solid #c5cfda;background:#fff;color:#17212f;border-radius:9px;padding:8px 11px;cursor:pointer}.bcw-dark .bcw-button,.bcw-dark .bcw-tabs button,.bcw-dark select,.bcw-dark input{background:#222c38;color:#edf3fa;border-color:#536172}.bcw-button:hover,.bcw-tabs button:hover{border-color:#3276bd}.bcw-button:focus-visible,.bcw-tabs button:focus-visible,.bcw-field input:focus-visible,.bcw-field select:focus-visible,.bcw-resource-link:focus-visible{outline:3px solid #e28e27;outline-offset:2px}.bcw-context{display:flex;justify-content:space-between;padding:7px 20px;color:#5b6d80;font-size:12px;border-block:1px solid #dce3ea}.bcw-tabs{display:flex;gap:5px;padding:10px 14px;overflow:auto;border-bottom:1px solid #dce3ea}.bcw-tabs button{white-space:nowrap;padding:7px 9px;font-size:12px}.bcw-tabs button[aria-current="page"]{background:#1459a6;color:#fff;border-color:#1459a6}.bcw-body{overflow:auto;padding:18px 20px 26px}.bcw-body h2{font-size:20px;margin:0 0 6px}.bcw-body h3{font-size:15px;margin:12px 0 7px}.bcw-muted{color:#627386;margin:5px 0 13px}.bcw-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.bcw-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:14px}.bcw-card span{color:#607184;font-size:12px}.bcw-callout,.bcw-page-diagnostics{background:#e9f2fb;border-left:3px solid #367dbc;border-radius:8px;padding:12px 14px;margin:14px 0}.bcw-dark .bcw-callout,.bcw-dark .bcw-page-diagnostics{background:#1c2b39}.bcw-controls,.bcw-settings-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:12px 0 18px}.bcw-field{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:650}.bcw-field input,.bcw-field select{font:inherit;font-weight:400;padding:8px;border:1px solid #c5cfda;border-radius:8px;background:#fff;color:#17212f;min-width:0}.bcw-grid-wrap{overflow-x:auto;margin:14px 0}.bcw-grid{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed}.bcw-grid caption{font-weight:750;text-align:left;padding:4px 0 10px}.bcw-grid th{font-size:11px;color:#637589;font-weight:700}.bcw-grid td{height:46px}.bcw-day{width:100%;height:100%;min-height:38px;position:relative;border:1px solid #d1d9e1;border-radius:8px;background:#fff;color:#17212f;cursor:pointer}.bcw-dark .bcw-day{background:#202a36;color:#edf3fa;border-color:#465464}.bcw-day.bcw-outside{opacity:.52}.bcw-day.bcw-today{border:2px solid #176bb8;font-weight:800}.bcw-note-dot{position:absolute;right:6px;bottom:0;color:#c66323}.bcw-weekno{color:#738398}.bcw-pass{color:#187343}.bcw-fail{color:#b32828}.bcw-grid-wrap~.bcw-row{margin-top:6px}.bcw-facts{display:grid;grid-template-columns:minmax(150px,1fr) 1.5fr;gap:0;margin-top:16px}.bcw-facts dt,.bcw-facts dd{padding:9px 7px;border-bottom:1px solid #dce3ea;margin:0}.bcw-facts dd{font-weight:700}.bcw-big-value{font-size:30px;font-weight:800;color:#1459a6}.bcw-simple-table{width:100%;border-collapse:collapse;margin:10px 0}.bcw-simple-table th,.bcw-simple-table td{border:1px solid #cbd5df;padding:8px;text-align:left}.bcw-checks{list-style:none;padding:0}.bcw-checks li{padding:5px 0}.bcw-note-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:14px;border:1px solid #ccd6e0;border-radius:12px}.bcw-note-form>button{align-self:end}.bcw-note-list{display:grid;gap:8px;margin:14px 0}.bcw-note{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid #d4dde6;border-radius:10px}.bcw-note p{margin:4px 0 0}.bcw-complete{text-decoration:line-through;opacity:.7}.bcw-resource-section{margin:16px 0}.bcw-resource-list{display:flex;flex-wrap:wrap;gap:8px}.bcw-resource-link{display:inline-flex;padding:8px 10px;border:1px solid #c9d6e3;border-radius:8px;color:#1459a6;background:#fff;text-decoration:none}.bcw-underline .bcw-resource-link{text-decoration:underline}.bcw-print-preview{padding:12px;border:1px dashed #9cadbf;border-radius:10px}.bcw-print-preview .bcw-grid td{height:55px}.bcw-dialog-backdrop{position:fixed;inset:0;background:#1019238c;display:grid;place-items:start center;padding:15vh 16px 16px;z-index:5}.bcw-dialog-backdrop[hidden],.bcw-panel[hidden]{display:none}.bcw-palette{width:min(520px,100%);background:#fff;color:#17212f;border-radius:14px;box-shadow:0 16px 48px #0006;padding:12px}.bcw-palette input{width:100%;padding:12px;border:1px solid #b9c7d5;border-radius:9px;font:inherit}.bcw-command-results{display:grid;gap:4px;margin-top:8px;max-height:45vh;overflow:auto}.bcw-command{width:100%;text-align:left}.bcw-command.bcw-selected{outline:2px solid #2877bf}.bcw-large{font-size:16px}.bcw-contrast{filter:contrast(1.2)}.bcw-reduce *{scroll-behavior:auto!important;animation:none!important;transition:none!important}@media(max-width:560px){.bcw-panel{width:100vw;height:100dvh;right:-18px;bottom:-18px;border-radius:0}.bcw-header{padding:14px}.bcw-body{padding:15px}.bcw-context{padding-inline:14px}.bcw-note-form{grid-template-columns:1fr}.bcw-grid td{height:40px}.bcw-simple-table{font-size:11px}}`;
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
  if (typeof module !== 'undefined' && module.exports) module.exports = { leapYear, daysInMonth, validDate, dayOfWeek, dayOfYear, addDays, compareDates, isoWeek, monthGrid, inspect, validation, csvExport, validateImport, pageContext };
})();
