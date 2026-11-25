/**
 * Kalender & Schichtplaner - PWA Application Script
 */

import {
  SHIFT_TYPES,
  EVENT_CATEGORIES,
  GERMAN_MONTH_NAMES,
  GERMAN_WEEKDAYS_SHORT,
  formatDateISO,
  parseDateISO,
  getMonthCalendarGrid,
  formatGermanDate,
  formatGermanMonthYear,
  CalendarStorage,
  ShiftManager,
  EventManager,
  generateSampleData
} from './calendar-core.js';

// Application State
class CalendarApp {
  constructor() {
    this.storage = new CalendarStorage();
    this.shiftMgr = new ShiftManager(this.storage);
    this.eventMgr = new EventManager(this.storage);

    const now = new Date();
    this.todayStr = formatDateISO(now.getFullYear(), now.getMonth(), now.getDate());
    this.selectedDate = this.todayStr;
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth(); // 0-11

    this.activeView = 'month'; // 'month' | 'day' | 'search'
    this.theme = this.storage.loadTheme() || 'dark';

    // Shift Stamper Mode (Rapid rota entry)
    this.stamperActive = false;
    this.selectedShiftStamp = 'frueh';

    // Search & Filter State
    this.searchQuery = '';
    this.searchCategory = 'all';
    this.searchShift = 'all';

    // Editing State
    this.editingEventId = null;

    // Check first launch
    this.checkFirstLaunch();
  }

  checkFirstLaunch() {
    const allEvents = this.eventMgr.getAllEvents();
    const allShifts = Object.keys(this.shiftMgr.shifts);

    // If completely empty, pre-fill with sample shift data so app is immediately alive!
    if (allEvents.length === 0 && allShifts.length === 0) {
      const sample = generateSampleData(this.viewYear, this.viewMonth);
      this.storage.saveShifts(sample.shifts);
      this.storage.saveEvents(sample.events);
      this.shiftMgr.reload();
      this.eventMgr.reload();
    }
  }

  init() {
    this.applyTheme(this.theme);
    this.registerServiceWorker();
    this.bindEvents();
    this.render();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('ServiceWorker registriert:', reg.scope);
          })
          .catch((err) => {
            console.warn('ServiceWorker Registrierung fehlgeschlagen:', err);
          });
      });
    }
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.storage.saveTheme(theme);
    const themeIcon = document.getElementById('themeToggleIcon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  toggleTheme() {
    const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.showToast(`Design auf ${nextTheme === 'dark' ? 'Dunkel' : 'Hell'} gewechselt`, '🎨');
  }

  setView(viewName) {
    this.activeView = viewName;

    // Turn off stamper mode when switching views
    if (viewName !== 'month' && this.stamperActive) {
      this.toggleStamperMode(false);
    }

    // Update bottom navigation active states
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update segment controls in calendar bar
    document.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    this.render();
  }

  // Navigation handlers
  navigatePrev() {
    if (this.activeView === 'month') {
      if (this.viewMonth === 0) {
        this.viewMonth = 11;
        this.viewYear--;
      } else {
        this.viewMonth--;
      }
      this.render('slide-right');
    } else if (this.activeView === 'day') {
      const parsed = parseDateISO(this.selectedDate);
      if (parsed) {
        const d = new Date(parsed.year, parsed.month, parsed.day - 1);
        this.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
        this.viewYear = d.getFullYear();
        this.viewMonth = d.getMonth();
        this.render('slide-right');
      }
    }
  }

  navigateNext() {
    if (this.activeView === 'month') {
      if (this.viewMonth === 11) {
        this.viewMonth = 0;
        this.viewYear++;
      } else {
        this.viewMonth++;
      }
      this.render('slide-left');
    } else if (this.activeView === 'day') {
      const parsed = parseDateISO(this.selectedDate);
      if (parsed) {
        const d = new Date(parsed.year, parsed.month, parsed.day + 1);
        this.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
        this.viewYear = d.getFullYear();
        this.viewMonth = d.getMonth();
        this.render('slide-left');
      }
    }
  }

  navigateToday() {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.selectedDate = this.todayStr;
    this.render('fade-in');
    this.showToast('Zu Heute gesprungen', '📅');
  }

  // Shift Stamper Mode (Schnellstempel für Schichten)
  toggleStamperMode(forceState = null) {
    this.stamperActive = forceState !== null ? forceState : !this.stamperActive;
    const stamperBar = document.getElementById('shiftStamperBar');
    const toggleBtn = document.getElementById('stamperToggleBtn');
    const mainEl = document.querySelector('.app-main');

    if (this.stamperActive) {
      if (this.activeView !== 'month') {
        this.setView('month');
      }
      if (stamperBar) stamperBar.classList.add('active');
      if (toggleBtn) {
        toggleBtn.classList.add('glass-btn-primary');
        toggleBtn.title = 'Schicht-Schnelleingabe beenden';
      }
      if (mainEl) mainEl.classList.add('stamper-mode-active');
      const shift = SHIFT_TYPES[this.selectedShiftStamp];
      this.showToast(`Schnellstempel aktiv: ${shift ? shift.name : 'Keine'}. Tippe auf Kalendertage.`, '⚡');
    } else {
      if (stamperBar) stamperBar.classList.remove('active');
      if (toggleBtn) {
        toggleBtn.classList.remove('glass-btn-primary');
        toggleBtn.title = 'Schicht-Schnelleingabe aktivieren';
      }
      if (mainEl) mainEl.classList.remove('stamper-mode-active');
    }
  }

  setShiftStamp(shiftId) {
    this.selectedShiftStamp = shiftId;
    document.querySelectorAll('.stamper-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.shift === shiftId);
    });
    const shift = SHIFT_TYPES[shiftId];
    this.showToast(`Stempel gewählt: ${shift ? shift.name : 'Schicht löschen'}`, shift ? shift.icon : '❌');
  }

  onDayCellClicked(dateStr) {
    if (this.stamperActive) {
      // Stamp shift directly onto that day!
      if (this.selectedShiftStamp === 'delete') {
        this.shiftMgr.deleteShift(dateStr);
      } else {
        this.shiftMgr.setShift(dateStr, this.selectedShiftStamp);
      }
      this.render();
      return;
    }

    // Normal tap: select date and switch to Day View if already selected, or just select
    if (this.selectedDate === dateStr) {
      // Switch to Day View on double tap
      this.setView('day');
    } else {
      this.selectedDate = dateStr;
      const parsed = parseDateISO(dateStr);
      if (parsed) {
        this.viewYear = parsed.year;
        this.viewMonth = parsed.month;
      }
      this.render();
    }
  }

  // =========================================================================
  // Render Orchestration
  // =========================================================================

  render(animClass = '') {
    this.updateHeader();

    const monthViewContainer = document.getElementById('monthView');
    const dayViewContainer = document.getElementById('dayView');
    const searchViewContainer = document.getElementById('searchView');

    if (this.activeView === 'month') {
      monthViewContainer.style.display = 'flex';
      dayViewContainer.style.display = 'none';
      searchViewContainer.style.display = 'none';
      this.renderMonthView(animClass);
    } else if (this.activeView === 'day') {
      monthViewContainer.style.display = 'none';
      dayViewContainer.style.display = 'flex';
      searchViewContainer.style.display = 'none';
      this.renderDayView(animClass);
    } else if (this.activeView === 'search') {
      monthViewContainer.style.display = 'none';
      dayViewContainer.style.display = 'none';
      searchViewContainer.style.display = 'flex';
      this.renderSearchView();
    }
  }

  updateHeader() {
    const titleText = document.getElementById('currentTitleText');
    if (!titleText) return;

    if (this.activeView === 'month') {
      titleText.textContent = formatGermanMonthYear(this.viewYear, this.viewMonth);
    } else if (this.activeView === 'day') {
      const parsed = parseDateISO(this.selectedDate);
      if (parsed) {
        titleText.textContent = `${parsed.day}. ${GERMAN_MONTH_NAMES[parsed.month]} ${parsed.year}`;
      }
    } else {
      titleText.textContent = 'Suche & Filter';
    }
  }

  // =========================================================================
  // Month View
  // =========================================================================

  renderMonthView(animClass) {
    const gridEl = document.getElementById('monthGrid');
    if (!gridEl) return;

    if (animClass) {
      gridEl.classList.remove('slide-left', 'slide-right', 'fade-in');
      void gridEl.offsetWidth; // Trigger reflow
      gridEl.classList.add(animClass);
    }

    const cells = getMonthCalendarGrid(this.viewYear, this.viewMonth, this.todayStr);
    gridEl.innerHTML = '';

    cells.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'calendar-day-cell';
      if (!cell.isCurrentMonth) cellEl.classList.add('other-month');
      if (cell.isToday) cellEl.classList.add('is-today');
      if (cell.dateStr === this.selectedDate) cellEl.classList.add('is-selected');

      // Top bar in cell: Day number
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      const dayNumber = document.createElement('span');
      dayNumber.className = 'day-number';
      dayNumber.textContent = cell.day;
      dayHeader.appendChild(dayNumber);
      cellEl.appendChild(dayHeader);

      // Shift badge (if shift assigned)
      const shift = this.shiftMgr.getShift(cell.dateStr);
      if (shift) {
        const shiftBadge = document.createElement('div');
        shiftBadge.className = `cell-shift-badge cell-shift-${shift.id}`;
        shiftBadge.textContent = `${shift.icon} ${shift.name === 'Frei' ? 'Frei' : (shift.name === 'Urlaub' ? 'Urlaub' : shift.short)}`;
        shiftBadge.title = `${shift.name} (${shift.time})`;
        cellEl.appendChild(shiftBadge);
      }

      // Event dots
      const dayEvents = this.eventMgr.getEventsForDate(cell.dateStr);
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'cell-events-dots';

      const maxDots = 3;
      dayEvents.slice(0, maxDots).forEach((event) => {
        const dot = document.createElement('span');
        dot.className = 'event-dot';
        const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.privat;
        dot.style.background = cat.color;
        dotsContainer.appendChild(dot);
      });

      if (dayEvents.length > maxDots) {
        const moreSpan = document.createElement('span');
        moreSpan.className = 'event-dot-more';
        moreSpan.textContent = `+${dayEvents.length - maxDots}`;
        dotsContainer.appendChild(moreSpan);
      }

      cellEl.appendChild(dotsContainer);

      // Click handler
      cellEl.addEventListener('click', () => {
        this.onDayCellClicked(cell.dateStr);
      });

      gridEl.appendChild(cellEl);
    });

    // Render Monthly Shift Stats
    this.renderMonthStats();
  }

  renderMonthStats() {
    const stats = this.shiftMgr.getShiftStatsForMonth(this.viewYear, this.viewMonth);
    const countFrueh = document.getElementById('statCountFrueh');
    const countSpaet = document.getElementById('statCountSpaet');
    const countNacht = document.getElementById('statCountNacht');
    const countUrlaub = document.getElementById('statCountUrlaub');

    if (countFrueh) countFrueh.textContent = stats.frueh;
    if (countSpaet) countSpaet.textContent = stats.spaet;
    if (countNacht) countNacht.textContent = stats.nacht;
    if (countUrlaub) countUrlaub.textContent = stats.urlaub;
  }

  // =========================================================================
  // Day View
  // =========================================================================

  renderDayView(animClass) {
    const dayHeroTitle = document.getElementById('dayHeroTitle');
    const dayHeroSubtitle = document.getElementById('dayHeroSubtitle');
    const shiftNameEl = document.getElementById('dayShiftName');
    const shiftTimeEl = document.getElementById('dayShiftTime');
    const eventCardsList = document.getElementById('dayEventCardsList');

    if (dayHeroTitle) {
      dayHeroTitle.textContent = formatGermanDate(this.selectedDate);
    }
    if (dayHeroSubtitle) {
      dayHeroSubtitle.textContent = this.selectedDate === this.todayStr ? 'Heute' : '';
    }

    // Current shift on this day
    const currentShift = this.shiftMgr.getShift(this.selectedDate);
    if (shiftNameEl) {
      shiftNameEl.textContent = currentShift ? `${currentShift.icon} ${currentShift.name}` : 'Keine Schicht eingetragen';
    }
    if (shiftTimeEl) {
      shiftTimeEl.textContent = currentShift ? currentShift.time : 'Tippe auf eine Schicht unten, um sie festzulegen';
    }

    // Highlight active chip button in day shift picker
    document.querySelectorAll('.day-shift-card .shift-chip-btn').forEach((btn) => {
      const shiftId = btn.dataset.shift;
      const isActive = (currentShift && currentShift.id === shiftId) || (!currentShift && shiftId === 'delete');
      btn.classList.toggle('active', isActive);
    });

    // Events List
    if (!eventCardsList) return;

    if (animClass) {
      eventCardsList.classList.remove('slide-left', 'slide-right', 'fade-in');
      void eventCardsList.offsetWidth;
      eventCardsList.classList.add(animClass);
    }

    const events = this.eventMgr.getEventsForDate(this.selectedDate);
    eventCardsList.innerHTML = '';

    if (events.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'glass-card empty-state-card';
      emptyState.innerHTML = `
        <span class="empty-state-icon">☕</span>
        <p>Keine Termine für diesen Tag geplant.</p>
        <button class="glass-btn glass-btn-primary" id="emptyAddEventBtn">
          <span>+</span> Neuer Termin
        </button>
      `;
      eventCardsList.appendChild(emptyState);
      const btn = emptyState.querySelector('#emptyAddEventBtn');
      if (btn) btn.addEventListener('click', () => this.openEventModal(null, this.selectedDate));
      return;
    }

    events.forEach((evt) => {
      const card = document.createElement('div');
      card.className = 'event-card';

      const cat = EVENT_CATEGORIES[evt.category] || EVENT_CATEGORIES.privat;

      const stripe = document.createElement('div');
      stripe.className = 'event-card-color-stripe';
      stripe.style.background = cat.color;
      card.appendChild(stripe);

      const content = document.createElement('div');
      content.className = 'event-card-content';

      const top = document.createElement('div');
      top.className = 'event-card-top';

      const catBadge = document.createElement('span');
      catBadge.className = 'event-category-badge';
      catBadge.style.background = cat.bg;
      catBadge.style.color = cat.color;
      catBadge.textContent = `${cat.icon} ${cat.name}`;
      top.appendChild(catBadge);

      const timeBadge = document.createElement('span');
      timeBadge.className = 'event-time-badge';
      timeBadge.textContent = evt.isAllDay
        ? 'Ganztägig'
        : (evt.endTime ? `${evt.startTime} – ${evt.endTime}` : evt.startTime);
      top.appendChild(timeBadge);
      content.appendChild(top);

      const title = document.createElement('div');
      title.className = 'event-title';
      title.textContent = evt.title;
      content.appendChild(title);

      if (evt.note) {
        const note = document.createElement('div');
        note.className = 'event-note';
        note.textContent = evt.note;
        content.appendChild(note);
      }

      card.appendChild(content);

      // Actions (Edit & Delete)
      const actions = document.createElement('div');
      actions.className = 'event-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'glass-btn glass-btn-sm';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Termin bearbeiten';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEventModal(evt.id);
      });
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'glass-btn glass-btn-sm';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Termin löschen';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDeleteEvent(evt.id);
      });
      actions.appendChild(deleteBtn);

      card.appendChild(actions);

      // Tapping card opens edit modal
      card.addEventListener('click', () => {
        this.openEventModal(evt.id);
      });

      eventCardsList.appendChild(card);
    });
  }

  setDayShift(shiftId) {
    if (shiftId === 'delete' || shiftId === 'none') {
      this.shiftMgr.deleteShift(this.selectedDate);
      this.showToast('Schicht für diesen Tag entfernt', '🗑️');
    } else {
      this.shiftMgr.setShift(this.selectedDate, shiftId);
      const shift = SHIFT_TYPES[shiftId];
      this.showToast(`${shift.name} eingetragen`, shift.icon);
    }
    this.render();
  }

  // =========================================================================
  // Search & Filter View
  // =========================================================================

  renderSearchView() {
    const resultsContainer = document.getElementById('searchResultsList');
    const countInfo = document.getElementById('searchResultsCount');
    if (!resultsContainer) return;

    const results = this.eventMgr.searchEvents(this.searchQuery, {
      category: this.searchCategory,
      shiftType: this.searchShift,
      shiftManager: this.shiftMgr
    });

    if (countInfo) {
      countInfo.textContent = `${results.length} Termin${results.length === 1 ? '' : 'e'} gefunden`;
    }

    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'glass-card empty-state-card';
      empty.innerHTML = `
        <span class="empty-state-icon">🔍</span>
        <p>Keine Termine für die ausgewählten Such- und Filterkriterien gefunden.</p>
      `;
      resultsContainer.appendChild(empty);
      return;
    }

    results.forEach((evt) => {
      const card = document.createElement('div');
      card.className = 'event-card search-result-item';

      const cat = EVENT_CATEGORIES[evt.category] || EVENT_CATEGORIES.privat;

      const stripe = document.createElement('div');
      stripe.className = 'event-card-color-stripe';
      stripe.style.background = cat.color;
      card.appendChild(stripe);

      const content = document.createElement('div');
      content.className = 'event-card-content';

      const dateBadge = document.createElement('div');
      dateBadge.className = 'search-result-date-badge';
      const shift = this.shiftMgr.getShift(evt.date);
      dateBadge.innerHTML = `<span>📅 ${formatGermanDate(evt.date)}</span>${shift ? ` • <span>${shift.icon} ${shift.name}</span>` : ''}`;
      content.appendChild(dateBadge);

      const top = document.createElement('div');
      top.className = 'event-card-top';

      const catBadge = document.createElement('span');
      catBadge.className = 'event-category-badge';
      catBadge.style.background = cat.bg;
      catBadge.style.color = cat.color;
      catBadge.textContent = `${cat.icon} ${cat.name}`;
      top.appendChild(catBadge);

      const timeBadge = document.createElement('span');
      timeBadge.className = 'event-time-badge';
      timeBadge.textContent = evt.isAllDay ? 'Ganztägig' : (evt.endTime ? `${evt.startTime} – ${evt.endTime}` : evt.startTime);
      top.appendChild(timeBadge);
      content.appendChild(top);

      const title = document.createElement('div');
      title.className = 'event-title';
      title.textContent = evt.title;
      content.appendChild(title);

      if (evt.note) {
        const note = document.createElement('div');
        note.className = 'event-note';
        note.textContent = evt.note;
        content.appendChild(note);
      }

      card.appendChild(content);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'event-actions';

      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'glass-btn glass-btn-sm';
      jumpBtn.innerHTML = '👉 Tag';
      jumpBtn.title = 'Zur Tagesansicht springen';
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDate = evt.date;
        const p = parseDateISO(evt.date);
        if (p) {
          this.viewYear = p.year;
          this.viewMonth = p.month;
        }
        this.setView('day');
      });
      actions.appendChild(jumpBtn);

      card.appendChild(actions);

      card.addEventListener('click', () => {
        this.openEventModal(evt.id);
      });

      resultsContainer.appendChild(card);
    });
  }

  // =========================================================================
  // Modals & Forms
  // =========================================================================

  openEventModal(eventId = null, defaultDate = null) {
    this.editingEventId = eventId;
    const modal = document.getElementById('eventModalBackdrop');
    const modalTitle = document.getElementById('eventModalTitle');
    const titleInput = document.getElementById('eventTitleInput');
    const dateInput = document.getElementById('eventDateInput');
    const allDayCheck = document.getElementById('eventAllDayCheck');
    const startTimeInput = document.getElementById('eventStartTimeInput');
    const endTimeInput = document.getElementById('eventEndTimeInput');
    const timeRow = document.getElementById('eventTimeRow');
    const noteInput = document.getElementById('eventNoteInput');
    const deleteBtn = document.getElementById('eventModalDeleteBtn');

    if (eventId) {
      const evt = this.eventMgr.getEventById(eventId);
      if (!evt) return;

      if (modalTitle) modalTitle.textContent = 'Termin bearbeiten';
      if (titleInput) titleInput.value = evt.title;
      if (dateInput) dateInput.value = evt.date;
      if (allDayCheck) allDayCheck.checked = evt.isAllDay;
      if (startTimeInput) startTimeInput.value = evt.startTime || '09:00';
      if (endTimeInput) endTimeInput.value = evt.endTime || '';
      if (noteInput) noteInput.value = evt.note || '';
      if (timeRow) timeRow.style.display = evt.isAllDay ? 'none' : 'grid';
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';

      this.selectModalCategory(evt.category);
    } else {
      if (modalTitle) modalTitle.textContent = 'Neuer Termin';
      if (titleInput) titleInput.value = '';
      if (dateInput) dateInput.value = defaultDate || this.selectedDate || this.todayStr;
      if (allDayCheck) allDayCheck.checked = false;
      if (startTimeInput) startTimeInput.value = '09:00';
      if (endTimeInput) endTimeInput.value = '10:00';
      if (noteInput) noteInput.value = '';
      if (timeRow) timeRow.style.display = 'grid';
      if (deleteBtn) deleteBtn.style.display = 'none';

      this.selectModalCategory('privat');
    }

    if (modal) modal.classList.add('open');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 150);
    }
  }

  closeEventModal() {
    const modal = document.getElementById('eventModalBackdrop');
    if (modal) modal.classList.remove('open');
    this.editingEventId = null;
  }

  selectModalCategory(catId) {
    document.querySelectorAll('.category-choice-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.category === catId);
    });
  }

  getSelectedModalCategory() {
    const selectedBtn = document.querySelector('.category-choice-btn.selected');
    return selectedBtn ? selectedBtn.dataset.category : 'privat';
  }

  saveEventFromModal(e) {
    e.preventDefault();
    const titleInput = document.getElementById('eventTitleInput');
    const dateInput = document.getElementById('eventDateInput');
    const allDayCheck = document.getElementById('eventAllDayCheck');
    const startTimeInput = document.getElementById('eventStartTimeInput');
    const endTimeInput = document.getElementById('eventEndTimeInput');
    const noteInput = document.getElementById('eventNoteInput');

    const title = titleInput ? titleInput.value.trim() : '';
    const date = dateInput ? dateInput.value : '';
    const isAllDay = allDayCheck ? allDayCheck.checked : false;
    const startTime = startTimeInput ? startTimeInput.value : '';
    const endTime = endTimeInput ? endTimeInput.value : '';
    const category = this.getSelectedModalCategory();
    const note = noteInput ? noteInput.value.trim() : '';

    if (!title) {
      this.showToast('Bitte einen Termintitel eingeben', '⚠️');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!date) {
      this.showToast('Bitte ein Datum wählen', '⚠️');
      return;
    }

    if (this.editingEventId) {
      this.eventMgr.updateEvent(this.editingEventId, {
        title,
        date,
        isAllDay,
        startTime,
        endTime,
        category,
        note
      });
      this.showToast('Termin aktualisiert', '✅');
    } else {
      this.eventMgr.addEvent({
        title,
        date,
        isAllDay,
        startTime,
        endTime,
        category,
        note
      });
      this.showToast('Termin erfolgreich hinzugefügt', '🎉');
    }

    this.selectedDate = date;
    const p = parseDateISO(date);
    if (p) {
      this.viewYear = p.year;
      this.viewMonth = p.month;
    }

    this.closeEventModal();
    this.render();
  }

  confirmDeleteEvent(id) {
    if (confirm('Möchtest du diesen Termin wirklich löschen?')) {
      const deleted = this.eventMgr.deleteEvent(id);
      if (deleted) {
        this.showToast('Termin gelöscht', '🗑️');
        if (this.editingEventId === id) {
          this.closeEventModal();
        }
        this.render();
      }
    }
  }

  // Quick Month/Year Jump Modal
  openMonthPickerModal() {
    const modal = document.getElementById('monthPickerModalBackdrop');
    const yearSelect = document.getElementById('pickerYearSelect');
    const monthSelect = document.getElementById('pickerMonthSelect');

    if (yearSelect) {
      yearSelect.innerHTML = '';
      const currentY = new Date().getFullYear();
      for (let y = currentY - 5; y <= currentY + 10; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === this.viewYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }
    }

    if (monthSelect) {
      monthSelect.innerHTML = '';
      GERMAN_MONTH_NAMES.forEach((m, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = m;
        if (idx === this.viewMonth) opt.selected = true;
        monthSelect.appendChild(opt);
      });
    }

    if (modal) modal.classList.add('open');
  }

  closeMonthPickerModal() {
    const modal = document.getElementById('monthPickerModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  applyMonthPicker() {
    const yearSelect = document.getElementById('pickerYearSelect');
    const monthSelect = document.getElementById('pickerMonthSelect');
    if (yearSelect && monthSelect) {
      this.viewYear = parseInt(yearSelect.value, 10);
      this.viewMonth = parseInt(monthSelect.value, 10);
      this.render('fade-in');
    }
    this.closeMonthPickerModal();
  }

  // Settings Modal & Backup / Restore
  openSettingsModal() {
    const modal = document.getElementById('settingsModalBackdrop');
    if (modal) modal.classList.add('open');
  }

  closeSettingsModal() {
    const modal = document.getElementById('settingsModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  exportDataBackup() {
    const jsonStr = this.storage.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalender_backup_${this.todayStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Daten erfolgreich als JSON exportiert', '💾');
  }

  importDataBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const res = this.storage.importData(content);
      if (res.success) {
        this.shiftMgr.reload();
        this.eventMgr.reload();
        this.closeSettingsModal();
        this.render();
        this.showToast(`Import erfolgreich (${res.eventCount} Termine)`, '✅');
      } else {
        this.showToast(`Fehler beim Import: ${res.error}`, '❌');
      }
    };
    reader.readAsText(file);
  }

  loadSampleData() {
    if (confirm('Möchtest du Beispieldaten (Schichtrhythmus & Termine) für diesen Monat laden? Vorhandene Daten bleiben erhalten.')) {
      const sample = generateSampleData(this.viewYear, this.viewMonth);
      const currentShifts = this.shiftMgr.shifts;
      const currentEvents = this.eventMgr.getAllEvents();

      // Merge shifts
      const mergedShifts = { ...currentShifts, ...sample.shifts };
      this.storage.saveShifts(mergedShifts);
      this.shiftMgr.reload();

      // Merge events
      sample.events.forEach((evt) => {
        currentEvents.push(evt);
      });
      this.storage.saveEvents(currentEvents);
      this.eventMgr.reload();

      this.closeSettingsModal();
      this.render();
      this.showToast('Beispieldaten erfolgreich geladen', '🌟');
    }
  }

  clearAllData() {
    if (confirm('Achtung: Möchtest du wirklich alle Termine und Schichten unwiderruflich löschen?')) {
      this.storage.clearAllData();
      this.shiftMgr.reload();
      this.eventMgr.reload();
      this.closeSettingsModal();
      this.render();
      this.showToast('Alle Daten wurden gelöscht', '🗑️');
    }
  }

  // Toast UI notification
  showToast(message, icon = 'ℹ️') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================

  bindEvents() {
    // Header & Navigation controls
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => this.navigatePrev());
    document.getElementById('nextMonthBtn')?.addEventListener('click', () => this.navigateNext());
    document.getElementById('todayBtn')?.addEventListener('click', () => this.navigateToday());
    document.getElementById('currentTitleBtn')?.addEventListener('click', () => this.openMonthPickerModal());
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettingsModal());
    document.getElementById('stamperToggleBtn')?.addEventListener('click', () => this.toggleStamperMode());

    // Day Hero Prev/Next in Day View
    document.getElementById('dayHeroPrevBtn')?.addEventListener('click', () => this.navigatePrev());
    document.getElementById('dayHeroNextBtn')?.addEventListener('click', () => this.navigateNext());
    document.getElementById('dayHeroTodayBtn')?.addEventListener('click', () => this.navigateToday());
    document.getElementById('dayAddEventBtn')?.addEventListener('click', () => this.openEventModal(null, this.selectedDate));

    // View Segment controls (in Calendar bar)
    document.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) this.setView(view);
      });
    });

    // Bottom Navigation Items
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) this.setView(view);
      });
    });

    // Floating Action Button
    document.getElementById('navFabBtn')?.addEventListener('click', () => {
      this.openEventModal(null, this.selectedDate);
    });

    // Day View Shift Picker Chips
    document.querySelectorAll('.day-shift-card .shift-chip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const shiftId = e.currentTarget.dataset.shift;
        this.setDayShift(shiftId);
      });
    });

    // Stamper Bar buttons
    document.querySelectorAll('.stamper-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const shiftId = e.currentTarget.dataset.shift;
        this.setShiftStamp(shiftId);
      });
    });
    document.getElementById('stamperCloseBtn')?.addEventListener('click', () => {
      this.toggleStamperMode(false);
    });

    // Search input & Clear
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClearBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (searchClear) searchClear.classList.toggle('visible', Boolean(this.searchQuery));
        this.renderSearchView();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        this.searchQuery = '';
        searchClear.classList.remove('visible');
        this.renderSearchView();
      });
    }

    // Category filter chips
    document.querySelectorAll('.filter-chip[data-category-filter]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip[data-category-filter]').forEach((c) => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.searchCategory = e.currentTarget.dataset.categoryFilter;
        this.renderSearchView();
      });
    });

    // Shift filter chips
    document.querySelectorAll('.filter-chip[data-shift-filter]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip[data-shift-filter]').forEach((c) => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.searchShift = e.currentTarget.dataset.shiftFilter;
        this.renderSearchView();
      });
    });

    // Event Modal
    document.getElementById('eventModalCloseBtn')?.addEventListener('click', () => this.closeEventModal());
    document.getElementById('eventModalCancelBtn')?.addEventListener('click', () => this.closeEventModal());
    document.getElementById('eventForm')?.addEventListener('submit', (e) => this.saveEventFromModal(e));
    document.getElementById('eventModalDeleteBtn')?.addEventListener('click', () => {
      if (this.editingEventId) this.confirmDeleteEvent(this.editingEventId);
    });

    // All Day Checkbox toggle
    document.getElementById('eventAllDayCheck')?.addEventListener('change', (e) => {
      const timeRow = document.getElementById('eventTimeRow');
      if (timeRow) timeRow.style.display = e.target.checked ? 'none' : 'grid';
    });

    // Category Choice buttons in Event Modal
    document.querySelectorAll('.category-choice-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.category;
        this.selectModalCategory(cat);
      });
    });

    // Month Picker Modal
    document.getElementById('monthPickerCloseBtn')?.addEventListener('click', () => this.closeMonthPickerModal());
    document.getElementById('monthPickerApplyBtn')?.addEventListener('click', () => this.applyMonthPicker());

    // Settings Modal actions
    document.getElementById('settingsCloseBtn')?.addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('exportBackupBtn')?.addEventListener('click', () => this.exportDataBackup());
    document.getElementById('importBackupBtn')?.addEventListener('click', () => {
      document.getElementById('importFileInput')?.click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.importDataBackup(file);
      e.target.value = '';
    });
    document.getElementById('loadSampleDataBtn')?.addEventListener('click', () => this.loadSampleData());
    document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearAllData());

    // Backdrop clicks to close modals
    ['eventModalBackdrop', 'monthPickerModalBackdrop', 'settingsModalBackdrop'].forEach((backdropId) => {
      const el = document.getElementById(backdropId);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) {
            el.classList.remove('open');
          }
        });
      }
    });

    // Mobile Touch Swipe Navigation
    this.setupSwipeNavigation();
  }

  setupSwipeNavigation() {
    let startX = 0;
    let startY = 0;
    const contentArea = document.getElementById('calendarContentArea');
    if (!contentArea) return;

    contentArea.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    contentArea.addEventListener('touchend', (e) => {
      if (!startX || !startY || !e.changedTouches || e.changedTouches.length !== 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Check if horizontal swipe was significantly larger than vertical movement
      if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (diffX < 0) {
          // Swiped left -> next
          this.navigateNext();
        } else {
          // Swiped right -> prev
          this.navigatePrev();
        }
      }

      startX = 0;
      startY = 0;
    }, { passive: true });
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new CalendarApp();
  app.init();
  window.calendarApp = app;
});
