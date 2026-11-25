import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateISO,
  parseDateISO,
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getMonthCalendarGrid,
  formatGermanDate,
  SHIFT_TYPES,
  EVENT_CATEGORIES,
  CalendarStorage,
  ShiftManager,
  EventManager,
  generateSampleData
} from '../js/calendar-core.js';

test('Date utilities: formatDateISO and parseDateISO', () => {
  assert.equal(formatDateISO(2026, 10, 25), '2026-11-25');
  assert.equal(formatDateISO(2026, 0, 1), '2026-01-01');

  const parsed = parseDateISO('2026-11-25');
  assert.deepEqual(parsed, { year: 2026, month: 10, day: 25 });

  assert.equal(parseDateISO('invalid'), null);
  assert.equal(parseDateISO(''), null);
});

test('Date utilities: getDaysInMonth handles leap years and month lengths', () => {
  assert.equal(getDaysInMonth(2024, 1), 29); // Feb in leap year
  assert.equal(getDaysInMonth(2025, 1), 28); // Feb non-leap
  assert.equal(getDaysInMonth(2026, 10), 30); // Nov
  assert.equal(getDaysInMonth(2026, 11), 31); // Dec
});

test('Date utilities: getFirstWeekdayOfMonth returns Monday=0 to Sunday=6', () => {
  // 2026-11-01 was a Sunday -> 6
  assert.equal(getFirstWeekdayOfMonth(2026, 10), 6);
  // 2026-06-01 is a Monday -> 0
  assert.equal(getFirstWeekdayOfMonth(2026, 5), 0);
});

test('Date utilities: getMonthCalendarGrid produces 35 or 42 cells starting with Monday', () => {
  const gridNov2026 = getMonthCalendarGrid(2026, 10, '2026-11-25');
  assert.equal(gridNov2026.length % 7, 0);
  assert.ok(gridNov2026.length === 35 || gridNov2026.length === 42);

  // Check today marker
  const todayCell = gridNov2026.find(c => c.dateStr === '2026-11-25');
  assert.ok(todayCell);
  assert.equal(todayCell.isToday, true);
  assert.equal(todayCell.isCurrentMonth, true);

  // First cell should be Monday
  const firstCell = gridNov2026[0];
  const firstParsed = parseDateISO(firstCell.dateStr);
  const firstDayOfWeek = (new Date(firstParsed.year, firstParsed.month, firstParsed.day).getDay() + 6) % 7;
  assert.equal(firstDayOfWeek, 0); // Monday
});

test('Date utilities: formatGermanDate formats dates with German names', () => {
  const formatted = formatGermanDate('2026-11-25');
  assert.equal(formatted, 'Mittwoch, 25. November 2026');
});

test('ShiftManager: set, get, remove, and monthly stats', () => {
  const storage = new CalendarStorage();
  const shiftMgr = new ShiftManager(storage);

  shiftMgr.setShift('2026-11-01', 'frueh');
  shiftMgr.setShift('2026-11-02', 'spaet');
  shiftMgr.setShift('2026-11-03', 'nacht');
  shiftMgr.setShift('2026-11-04', 'urlaub');
  shiftMgr.setShift('2026-11-05', 'frei');

  assert.equal(shiftMgr.getShift('2026-11-01').id, 'frueh');
  assert.equal(shiftMgr.getShift('2026-11-02').name, 'Spätschicht');
  assert.equal(shiftMgr.getShift('2026-11-03').short, 'N');
  assert.equal(shiftMgr.getShift('2026-11-04').textColor, '#6ee7b7');
  assert.equal(shiftMgr.getShift('2026-11-05').name, 'Frei');
  assert.equal(shiftMgr.getShift('2026-11-06'), null);

  // Test stats calculation for November 2026
  const stats = shiftMgr.getShiftStatsForMonth(2026, 10);
  assert.equal(stats.frueh, 1);
  assert.equal(stats.spaet, 1);
  assert.equal(stats.nacht, 1);
  assert.equal(stats.urlaub, 1);
  assert.equal(stats.frei, 1);
  assert.equal(stats.totalWorkingDays, 3); // Früh + Spät + Nacht

  // Test deletion
  shiftMgr.deleteShift('2026-11-01');
  assert.equal(shiftMgr.getShift('2026-11-01'), null);
});

test('EventManager: add, update, delete, sorting, and search/filter', () => {
  const storage = new CalendarStorage();
  const eventMgr = new EventManager(storage);

  const evt1 = eventMgr.addEvent({
    title: 'Frühbesprechung',
    date: '2026-11-25',
    isAllDay: false,
    startTime: '08:00',
    endTime: '09:00',
    category: 'arbeit',
    note: 'Thema: Quartalsziele'
  });

  const evt2 = eventMgr.addEvent({
    title: 'Ganztags-Workshop',
    date: '2026-11-25',
    isAllDay: true,
    category: 'arbeit',
    note: 'Im Konferenzraum'
  });

  const evt3 = eventMgr.addEvent({
    title: 'Fitnessstudio',
    date: '2026-11-25',
    isAllDay: false,
    startTime: '18:30',
    endTime: '20:00',
    category: 'freizeit',
    note: 'Beintraining'
  });

  assert.equal(eventMgr.getAllEvents().length, 3);

  // Date filtering: all-day event should be first, then 08:00, then 18:30
  const dayEvents = eventMgr.getEventsForDate('2026-11-25');
  assert.equal(dayEvents.length, 3);
  assert.equal(dayEvents[0].id, evt2.id); // Ganztags
  assert.equal(dayEvents[1].id, evt1.id); // 08:00
  assert.equal(dayEvents[2].id, evt3.id); // 18:30

  // Update
  eventMgr.updateEvent(evt1.id, { title: 'Wichtige Frühbesprechung', category: 'wichtig' });
  const updated = eventMgr.getEventById(evt1.id);
  assert.equal(updated.title, 'Wichtige Frühbesprechung');
  assert.equal(updated.category, 'wichtig');

  // Search & Filter
  const searchResult = eventMgr.searchEvents('Fitness', { category: 'all' });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, evt3.id);

  const categoryResult = eventMgr.searchEvents('', { category: 'freizeit' });
  assert.equal(categoryResult.length, 1);
  assert.equal(categoryResult[0].id, evt3.id);

  // Delete
  assert.equal(eventMgr.deleteEvent(evt3.id), true);
  assert.equal(eventMgr.getAllEvents().length, 2);
  assert.equal(eventMgr.deleteEvent('non-existing-id'), false);
});

test('CalendarStorage: export and import JSON round-trip', () => {
  const storage = new CalendarStorage();
  const shiftMgr = new ShiftManager(storage);
  const eventMgr = new EventManager(storage);

  shiftMgr.setShift('2026-11-10', 'frueh');
  eventMgr.addEvent({
    title: 'Test-Event',
    date: '2026-11-10',
    category: 'privat'
  });

  const exported = storage.exportData();
  assert.ok(typeof exported === 'string');

  // New storage instance
  const storage2 = new CalendarStorage();
  const res = storage2.importData(exported);
  assert.equal(res.success, true);
  assert.equal(res.eventCount, 1);

  const shiftMgr2 = new ShiftManager(storage2);
  assert.equal(shiftMgr2.getShift('2026-11-10').id, 'frueh');
});

test('generateSampleData creates full shifts and events for a month', () => {
  const { shifts, events } = generateSampleData(2026, 10);
  assert.ok(Object.keys(shifts).length >= 28);
  assert.ok(events.length >= 4);
});
