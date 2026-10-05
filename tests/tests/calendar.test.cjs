const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/betacalendars-workbench.user.js');

test('Gregorian leap-year and month-length rules', () => {
  assert.equal(core.leapYear(1900), false);
  assert.equal(core.leapYear(2000), true);
  assert.equal(core.leapYear(2027), false);
  assert.equal(core.leapYear(2028), true);
  assert.equal(core.leapYear(2100), false);
  assert.equal(core.leapYear(2400), true);
  assert.equal(core.daysInMonth(2028, 2), 29);
  assert.equal(core.daysInMonth(2027, 2), 28);
  assert.equal(core.daysInMonth(2027, 13), 0);
});

test('UTC civil date arithmetic and weekday stay timezone independent', () => {
  assert.equal(core.dayOfWeek(2027, 8, 1), 0);
  assert.deepEqual(core.addDays({ year: 2027, month: 12, day: 31 }, 1), { year: 2028, month: 1, day: 1 });
  assert.deepEqual(core.addDays({ year: 2027, month: 1, day: 1 }, -1), { year: 2026, month: 12, day: 31 });
  assert.equal(core.dayOfYear(2028, 12, 31), 366);
  assert.equal(core.validDate({ year: 2027, month: 2, day: 29 }), false);
  assert.equal(core.validDate({ year: 2000, month: 2, day: 29 }), true);
});

test('ISO week-year boundaries', () => {
  assert.deepEqual(core.isoWeek({ year: 2021, month: 1, day: 1 }), { year: 2020, week: 53, weekday: 5, text: '2020-W53' });
  assert.deepEqual(core.isoWeek({ year: 2027, month: 1, day: 1 }), { year: 2026, week: 53, weekday: 5, text: '2026-W53' });
  assert.equal(core.isoWeek({ year: 2027, month: 8, day: 1 }).weekday, 7);
});

test('month grids use natural 4/5/6 row geometry and week-start differences', () => {
  assert.equal(core.monthGrid(2027, 2, 'monday').naturalRows, 4);
  assert.equal(core.monthGrid(2027, 2, 'sunday').naturalRows, 5);
  assert.equal(core.monthGrid(2027, 8, 'monday').naturalRows, 6);
  assert.equal(core.monthGrid(2027, 8, 'sunday').naturalRows, 5);
  assert.equal(core.monthGrid(2027, 2, 'monday', true).cells.length, 42);
});

test('all 2027 month geometry rows match the independently specified matrix', () => {
  const monday = [5, 4, 5, 5, 6, 5, 5, 6, 5, 5, 5, 5];
  const sunday = [6, 5, 5, 5, 6, 5, 5, 5, 5, 6, 5, 5];
  const weekdays = [5, 1, 1, 4, 6, 2, 4, 0, 3, 5, 1, 3];
  for (let month = 1; month <= 12; month += 1) {
    assert.equal(core.dayOfWeek(2027, month, 1), weekdays[month - 1]);
    assert.equal(core.monthGrid(2027, month, 'monday').naturalRows, monday[month - 1]);
    assert.equal(core.monthGrid(2027, month, 'sunday').naturalRows, sunday[month - 1]);
    assert.equal(core.validation(2027, month, 'monday').passed, true, `Monday-first month ${month}`);
    assert.equal(core.validation(2027, month, 'sunday').passed, true, `Sunday-first month ${month}`);
  }
});

test('inspector returns civil, ISO, and grid-column diagnostics', () => {
  assert.deepEqual(core.inspect({ year: 2027, month: 8, day: 1 }), { date: '2027-08-01', weekday: 'Sunday', ordinal: 213, monthDays: 31, monthRemaining: 30, quarter: 3, leap: false, isoYear: 2027, isoWeek: 30, isoDay: 7, mondayColumn: 6, sundayColumn: 0 });
  assert.throws(() => core.inspect({ year: 2027, month: 2, day: 29 }), /valid date/);
});

test('CSV export quotes commas, quotes, and newlines', () => {
  const text = core.csvExport([{ date: { year: 2027, month: 1, day: 3 }, title: 'Plan, "review"\nnext', category: 'Work', done: false }]);
  assert.equal(text, 'date,title,category,status\r\n2027-01-03,"Plan, ""review""\nnext",Work,open');
});

test('JSON import validates and normalizes only planner fields', () => {
  const notes = core.validateImport({ schema: 1, notes: [{ date: { year: 2027, month: 2, day: 28 }, title: '<script>alert(1)</script>', category: 'x', priority: 'high', done: true }] });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, '<script>alert(1)</script>');
  assert.equal(notes[0].priority, 'high');
  assert.equal(notes[0].done, true);
  assert.throws(() => core.validateImport({ schema: 9, notes: [] }), /schema 1/);
  assert.throws(() => core.validateImport({ schema: 1, notes: [{ date: { year: 2027, month: 2, day: 29 }, title: 'x' }] }), /invalid date/);
});
