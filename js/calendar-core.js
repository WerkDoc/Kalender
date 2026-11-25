/**
 * Kalender & Schichtplaner - Kernlogik (Calendar Core)
 * Reusable logic for dates, shifts, events, and storage.
 */

export const SHIFT_TYPES = {
  frueh: {
    id: 'frueh',
    name: 'Frühschicht',
    short: 'F',
    time: '06:00 – 14:00',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.18)',
    border: '#f59e0b',
    textColor: '#fbbf24',
    icon: '☀️',
    description: 'Frühe Tagesschicht (06:00 – 14:00 Uhr)'
  },
  spaet: {
    id: 'spaet',
    name: 'Spätschicht',
    short: 'S',
    time: '14:00 – 22:00',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.18)',
    border: '#f97316',
    textColor: '#fdba74',
    icon: '🌅',
    description: 'Späte Tagesschicht (14:00 – 22:00 Uhr)'
  },
  nacht: {
    id: 'nacht',
    name: 'Nachtschicht',
    short: 'N',
    time: '22:00 – 06:00',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.18)',
    border: '#8b5cf6',
    textColor: '#c4b5fd',
    icon: '🌙',
    description: 'Nachtdienst (22:00 – 06:00 Uhr)'
  },
  urlaub: {
    id: 'urlaub',
    name: 'Urlaub',
    short: 'U',
    time: 'Ganztägig',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10b981',
    textColor: '#6ee7b7',
    icon: '🌴',
    description: 'Erholungsurlaub / Zeitausgleich'
  },
  frei: {
    id: 'frei',
    name: 'Frei',
    short: 'Frei',
    time: 'Frei',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.18)',
    border: '#64748b',
    textColor: '#94a3b8',
    icon: '☕',
    description: 'Schichtfrei / Ruhetag'
  }
};

export const EVENT_CATEGORIES = {
  arbeit: { id: 'arbeit', name: 'Arbeit', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '💼' },
  privat: { id: 'privat', name: 'Privat', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '🏠' },
  wichtig: { id: 'wichtig', name: 'Wichtig', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '⚠️' },
  familie: { id: 'familie', name: 'Familie', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '👨‍👩‍👧' },
  freizeit: { id: 'freizeit', name: 'Freizeit', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', icon: '🎉' },
  gesundheit: { id: 'gesundheit', name: 'Gesundheit', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', icon: '🩺' }
};

export const GERMAN_MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const GERMAN_WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const GERMAN_WEEKDAYS_LONG = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
];

/**
 * Format year, month (0-11), and day (1-31) to ISO YYYY-MM-DD
 */
export function formatDateISO(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse ISO date YYYY-MM-DD into { year, month (0-11), day }
 */
export function parseDateISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Get number of days in a month (month: 0-11)
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get weekday index for Monday = 0, Sunday = 6
 */
export function getFirstWeekdayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  // Sunday is 0 in JS Date, so Monday is 0, Sunday is 6
  return (day + 6) % 7;
}

/**
 * Returns a 35 or 42 element array representing calendar grid cells for month (0-11).
 * Each cell has { dateStr, year, month, day, isCurrentMonth, isToday }
 */
export function getMonthCalendarGrid(year, month, todayStr = null) {
  if (!todayStr) {
    const now = new Date();
    todayStr = formatDateISO(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const daysInCurrent = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekdayOfMonth(year, month);

  // Previous month days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrev = getDaysInMonth(prevYear, prevMonth);

  const grid = [];

  // 1. Fill previous month padding
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrev - i;
    const dateStr = formatDateISO(prevYear, prevMonth, day);
    grid.push({
      dateStr,
      year: prevYear,
      month: prevMonth,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr
    });
  }

  // 2. Fill current month
  for (let day = 1; day <= daysInCurrent; day++) {
    const dateStr = formatDateISO(year, month, day);
    grid.push({
      dateStr,
      year,
      month,
      day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr
    });
  }

  // 3. Fill next month padding to reach 35 or 42 cells (multiple of 7)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const totalCellsNeeded = grid.length > 35 ? 42 : 35;
  const nextMonthDaysCount = totalCellsNeeded - grid.length;

  for (let day = 1; day <= nextMonthDaysCount; day++) {
    const dateStr = formatDateISO(nextYear, nextMonth, day);
    grid.push({
      dateStr,
      year: nextYear,
      month: nextMonth,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr
    });
  }

  return grid;
}

/**
 * Format date nicely in German (e.g. "Mittwoch, 25. November 2026")
 */
export function formatGermanDate(dateStr) {
  const parsed = parseDateISO(dateStr);
  if (!parsed) return dateStr || '';
  const d = new Date(parsed.year, parsed.month, parsed.day);
  const weekdayIndex = (d.getDay() + 6) % 7;
  const weekday = GERMAN_WEEKDAYS_LONG[weekdayIndex];
  const monthName = GERMAN_MONTH_NAMES[parsed.month];
  return `${weekday}, ${parsed.day}. ${monthName} ${parsed.year}`;
}

/**
 * Format month & year (e.g. "November 2026")
 */
export function formatGermanMonthYear(year, month) {
  return `${GERMAN_MONTH_NAMES[month]} ${year}`;
}

/**
 * Core Storage Class
 */
export class CalendarStorage {
  constructor(storageAdapter = null) {
    if (storageAdapter) {
      this.adapter = storageAdapter;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.adapter = window.localStorage;
    } else {
      // In-memory fallback
      this._mem = {};
      this.adapter = {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(this._mem, k) ? this._mem[k] : null),
        setItem: (k, v) => { this._mem[k] = String(v); },
        removeItem: (k) => { delete this._mem[k]; },
        clear: () => { this._mem = {}; }
      };
    }
  }

  loadShifts() {
    try {
      const data = this.adapter.getItem('kalender_pwa_shifts');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveShifts(shifts) {
    try {
      this.adapter.setItem('kalender_pwa_shifts', JSON.stringify(shifts || {}));
      return true;
    } catch {
      return false;
    }
  }

  loadEvents() {
    try {
      const data = this.adapter.getItem('kalender_pwa_events');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveEvents(events) {
    try {
      this.adapter.setItem('kalender_pwa_events', JSON.stringify(events || []));
      return true;
    } catch {
      return false;
    }
  }

  loadTheme() {
    try {
      return this.adapter.getItem('kalender_pwa_theme') || 'dark';
    } catch {
      return 'dark';
    }
  }

  saveTheme(theme) {
    try {
      this.adapter.setItem('kalender_pwa_theme', theme);
    } catch {
      // Ignore
    }
  }

  exportData() {
    return JSON.stringify({
      version: 1,
      appName: 'Kalender & Schichtplaner PWA',
      exportedAt: new Date().toISOString(),
      shifts: this.loadShifts(),
      events: this.loadEvents()
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ungültiges Datenformat');
      }
      if (parsed.shifts && typeof parsed.shifts === 'object') {
        this.saveShifts(parsed.shifts);
      }
      if (Array.isArray(parsed.events)) {
        this.saveEvents(parsed.events);
      }
      return { success: true, eventCount: parsed.events ? parsed.events.length : 0 };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  clearAllData() {
    this.saveShifts({});
    this.saveEvents([]);
  }
}

/**
 * Shift Manager
 */
export class ShiftManager {
  constructor(storage) {
    this.storage = storage;
    this.shifts = this.storage.loadShifts();
  }

  reload() {
    this.shifts = this.storage.loadShifts();
  }

  getShift(dateStr) {
    const shiftId = this.shifts[dateStr];
    return shiftId && SHIFT_TYPES[shiftId] ? SHIFT_TYPES[shiftId] : null;
  }

  setShift(dateStr, shiftId) {
    if (!dateStr) return false;
    if (!shiftId || shiftId === 'none' || shiftId === 'delete') {
      delete this.shifts[dateStr];
    } else if (SHIFT_TYPES[shiftId]) {
      this.shifts[dateStr] = shiftId;
    } else {
      return false;
    }
    this.storage.saveShifts(this.shifts);
    return true;
  }

  deleteShift(dateStr) {
    return this.setShift(dateStr, 'delete');
  }

  getShiftStatsForMonth(year, month) {
    const stats = {
      frueh: 0,
      spaet: 0,
      nacht: 0,
      urlaub: 0,
      frei: 0,
      totalWorkingDays: 0
    };

    const daysCount = getDaysInMonth(year, month);
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = formatDateISO(year, month, day);
      const shiftId = this.shifts[dateStr];
      if (shiftId && stats[shiftId] !== undefined) {
        stats[shiftId]++;
        if (shiftId === 'frueh' || shiftId === 'spaet' || shiftId === 'nacht') {
          stats.totalWorkingDays++;
        }
      }
    }

    return stats;
  }
}

/**
 * Event Manager (Termine verwalten)
 */
export class EventManager {
  constructor(storage) {
    this.storage = storage;
    this.events = this.storage.loadEvents();
  }

  reload() {
    this.events = this.storage.loadEvents();
  }

  getAllEvents() {
    return [...this.events];
  }

  getEventById(id) {
    return this.events.find((e) => e.id === id) || null;
  }

  addEvent({
    title,
    date,
    isAllDay = false,
    startTime = '',
    endTime = '',
    category = 'privat',
    note = ''
  }) {
    if (!title || !title.trim()) {
      throw new Error('Bitte gib einen Titel für den Termin ein.');
    }
    if (!date || !parseDateISO(date)) {
      throw new Error('Ungültiges Datum angegeben.');
    }

    const event = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      date,
      isAllDay: Boolean(isAllDay),
      startTime: isAllDay ? '' : (startTime || '09:00'),
      endTime: isAllDay ? '' : (endTime || ''),
      category: EVENT_CATEGORIES[category] ? category : 'privat',
      note: note ? note.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.events.push(event);
    this.storage.saveEvents(this.events);
    return event;
  }

  updateEvent(id, updateData) {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error('Termin nicht gefunden.');
    }

    const existing = this.events[index];
    const isAllDay = updateData.isAllDay !== undefined ? Boolean(updateData.isAllDay) : existing.isAllDay;
    const title = updateData.title !== undefined ? updateData.title.trim() : existing.title;

    if (!title) {
      throw new Error('Der Termintitel darf nicht leer sein.');
    }

    const updated = {
      ...existing,
      ...updateData,
      title,
      isAllDay,
      startTime: isAllDay ? '' : (updateData.startTime !== undefined ? updateData.startTime : existing.startTime),
      endTime: isAllDay ? '' : (updateData.endTime !== undefined ? updateData.endTime : existing.endTime),
      category: updateData.category && EVENT_CATEGORIES[updateData.category] ? updateData.category : existing.category,
      note: updateData.note !== undefined ? updateData.note.trim() : existing.note,
      updatedAt: new Date().toISOString()
    };

    this.events[index] = updated;
    this.storage.saveEvents(this.events);
    return updated;
  }

  deleteEvent(id) {
    const initialLength = this.events.length;
    this.events = this.events.filter((e) => e.id !== id);
    if (this.events.length !== initialLength) {
      this.storage.saveEvents(this.events);
      return true;
    }
    return false;
  }

  getEventsForDate(dateStr) {
    return this.events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => {
        // All-day events first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // Then by start time
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });
  }

  getEventsForMonth(year, month) {
    const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`;
    return this.events.filter((e) => e.date.startsWith(prefix));
  }

  searchEvents(query = '', { category = 'all', shiftType = 'all', shiftManager = null } = {}) {
    const q = query.toLowerCase().trim();

    return this.events.filter((event) => {
      // 1. Text filter
      const matchesText = !q ||
        event.title.toLowerCase().includes(q) ||
        (event.note && event.note.toLowerCase().includes(q));

      if (!matchesText) return false;

      // 2. Category filter
      if (category && category !== 'all' && event.category !== category) {
        return false;
      }

      // 3. Shift filter (if specified)
      if (shiftType && shiftType !== 'all' && shiftManager) {
        const dayShift = shiftManager.getShift(event.date);
        if (!dayShift || dayShift.id !== shiftType) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }
}

/**
 * Generate helpful sample data for shift workers
 */
export function generateSampleData(year, month) {
  const shifts = {};
  const events = [];

  const daysCount = getDaysInMonth(year, month);

  // A realistic shift cycle: 3 Früh, 3 Spät, 2 Frei, 3 Nacht, 3 Frei, 5 Urlaub
  const cycle = ['frueh', 'frueh', 'frueh', 'spaet', 'spaet', 'spaet', 'frei', 'frei', 'nacht', 'nacht', 'nacht', 'frei', 'frei', 'frei'];

  for (let day = 1; day <= daysCount; day++) {
    const dateStr = formatDateISO(year, month, day);
    if (day >= 22 && day <= 26) {
      shifts[dateStr] = 'urlaub';
    } else {
      const shiftIndex = (day - 1) % cycle.length;
      shifts[dateStr] = cycle[shiftIndex];
    }
  }

  // Sample Appointments
  const sampleEventsDefs = [
    { day: 3, title: 'Schichtübergabe & Teamsitzung', isAllDay: false, startTime: '13:30', endTime: '14:30', category: 'arbeit', note: 'Übergabeprotokoll vorbereiten' },
    { day: 7, title: 'Familienessen', isAllDay: false, startTime: '18:00', endTime: '21:00', category: 'familie', note: 'Tisch im Restaurant reserviert' },
    { day: 12, title: 'Zahnarzt Kontrolltermin', isAllDay: false, startTime: '10:00', endTime: '10:45', category: 'gesundheit', note: 'Praxis Dr. Müller, Versichertenkarte mitnehmen' },
    { day: 16, title: 'Wartung Auto / TÜV', isAllDay: false, startTime: '08:30', endTime: '11:00', category: 'wichtig', note: 'Winterreifen prüfen lassen' },
    { day: 23, title: 'Wellnessurlaub', isAllDay: true, startTime: '', endTime: '', category: 'freizeit', note: 'Hotel Sonneneck im Allgäu' },
    { day: 28, title: 'Joggingrunde im Park', isAllDay: false, startTime: '16:00', endTime: '17:00', category: 'freizeit', note: '5km Runde mit Marcus' }
  ];

  sampleEventsDefs.forEach((def, idx) => {
    if (def.day <= daysCount) {
      events.push({
        id: `evt_sample_${idx + 1}`,
        title: def.title,
        date: formatDateISO(year, month, def.day),
        isAllDay: def.isAllDay,
        startTime: def.startTime,
        endTime: def.endTime,
        category: def.category,
        note: def.note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });

  return { shifts, events };
}
