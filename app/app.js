// ===================== DATA STORE =====================
const Store = {
  get(key, fallback = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

let homework = Store.get('homework');
let classes = Store.get('classes');
let scheduleItems = Store.get('schedule');
let notes = Store.get('notes');
let studyLog = Store.get('studyLog');
let todos = Store.get('todos');
let exams = Store.get('exams');
let flashDecks = Store.get('flashDecks');
let chatHistory = Store.get('chatHistory');
let activeNoteId = null;
let editingHwId = null;

// ===================== NAVIGATION =====================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(item.dataset.tab).classList.add('active');
    if (item.dataset.tab === 'dashboard') refreshDashboard();
    if (item.dataset.tab === 'exams') renderExams();
    if (item.dataset.tab === 'gpa-calc') renderGPASummary();
  });
});

// ===================== DARK MODE =====================
const themeToggle = document.getElementById('theme-toggle');
if (Store.get('darkMode', false)) document.body.classList.add('dark');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  Store.set('darkMode', document.body.classList.contains('dark'));
});

// ===================== HOMEWORK =====================
const hwModal = document.getElementById('hw-modal');
const hwList = document.getElementById('homework-list');
const hwFilter = document.getElementById('hw-filter');

document.getElementById('add-homework-btn').addEventListener('click', () => {
  editingHwId = null;
  document.getElementById('hw-modal-title').textContent = 'Add Assignment';
  clearHwForm();
  hwModal.classList.remove('hidden');
});

document.getElementById('hw-cancel').addEventListener('click', () => hwModal.classList.add('hidden'));

document.getElementById('hw-save').addEventListener('click', () => {
  const subject = document.getElementById('hw-subject').value.trim();
  const title = document.getElementById('hw-title').value.trim();
  const desc = document.getElementById('hw-desc').value.trim();
  const due = document.getElementById('hw-due').value;
  const priority = document.getElementById('hw-priority').value;
  if (!subject || !title) return;

  if (editingHwId) {
    const hw = homework.find(h => h.id === editingHwId);
    if (hw) { hw.subject = subject; hw.title = title; hw.description = desc; hw.due = due; hw.priority = priority; }
    editingHwId = null;
  } else {
    homework.push({ id: Date.now().toString(), subject, title, description: desc, due, priority, completed: false, createdAt: new Date().toISOString() });
  }
  Store.set('homework', homework);
  hwModal.classList.add('hidden');
  renderHomework();
});

hwFilter.addEventListener('change', renderHomework);

function clearHwForm() {
  ['hw-subject','hw-title','hw-desc','hw-due'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('hw-priority').value = 'medium';
}

function renderHomework() {
  const filter = hwFilter.value;
  const today = new Date().toISOString().split('T')[0];
  let filtered = homework;
  if (filter === 'pending') filtered = homework.filter(h => !h.completed);
  else if (filter === 'completed') filtered = homework.filter(h => h.completed);
  else if (filter === 'overdue') filtered = homework.filter(h => !h.completed && h.due && h.due < today);

  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] || 1) - (p[b.priority] || 1);
  });

  hwList.innerHTML = filtered.length === 0
    ? '<div class="empty-state">No assignments found. Click "+ Add Assignment" to get started!</div>'
    : filtered.map(hw => {
      const isOverdue = !hw.completed && hw.due && hw.due < today;
      return `<div class="hw-item ${hw.completed ? 'completed' : ''}">
        <input type="checkbox" class="hw-checkbox" ${hw.completed ? 'checked' : ''} data-id="${hw.id}">
        <div class="hw-info"><h4>${esc(hw.subject)}: ${esc(hw.title)}</h4><p>${hw.description ? esc(hw.description) : 'No description'}</p></div>
        <div class="hw-meta">
          <span class="priority-badge priority-${hw.priority}">${hw.priority}</span>
          ${hw.due ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'OVERDUE: ' : 'Due: '}${fmtDate(hw.due)}</span>` : ''}
        </div>
        <div class="hw-actions">
          <button class="btn btn-small btn-secondary hw-edit" data-id="${hw.id}">Edit</button>
          <button class="btn btn-small btn-danger hw-delete" data-id="${hw.id}">Del</button>
        </div>
      </div>`;
    }).join('');

  hwList.querySelectorAll('.hw-checkbox').forEach(cb => cb.addEventListener('change', e => {
    const hw = homework.find(h => h.id === e.target.dataset.id);
    if (hw) { hw.completed = e.target.checked; Store.set('homework', homework); renderHomework(); }
  }));

  hwList.querySelectorAll('.hw-edit').forEach(btn => btn.addEventListener('click', e => {
    const hw = homework.find(h => h.id === e.target.dataset.id);
    if (!hw) return;
    editingHwId = hw.id;
    document.getElementById('hw-modal-title').textContent = 'Edit Assignment';
    document.getElementById('hw-subject').value = hw.subject;
    document.getElementById('hw-title').value = hw.title;
    document.getElementById('hw-desc').value = hw.description || '';
    document.getElementById('hw-due').value = hw.due || '';
    document.getElementById('hw-priority').value = hw.priority;
    hwModal.classList.remove('hidden');
  }));

  hwList.querySelectorAll('.hw-delete').forEach(btn => btn.addEventListener('click', e => {
    homework = homework.filter(h => h.id !== e.target.dataset.id);
    Store.set('homework', homework);
    renderHomework();
  }));
}

// ===================== GRADES =====================
const classModal = document.getElementById('class-modal');
const gradeModal = document.getElementById('grade-modal');
const classesList = document.getElementById('classes-list');
let currentClassId = null;

document.getElementById('add-class-btn').addEventListener('click', () => {
  document.getElementById('class-name').value = '';
  document.getElementById('class-teacher').value = '';
  classModal.classList.remove('hidden');
});

document.getElementById('class-cancel').addEventListener('click', () => classModal.classList.add('hidden'));
document.getElementById('grade-cancel').addEventListener('click', () => gradeModal.classList.add('hidden'));

document.getElementById('class-save').addEventListener('click', () => {
  const name = document.getElementById('class-name').value.trim();
  const teacher = document.getElementById('class-teacher').value.trim();
  if (!name) return;
  classes.push({ id: Date.now().toString(), name, teacher, grades: [] });
  Store.set('classes', classes);
  classModal.classList.add('hidden');
  renderClasses();
});

document.getElementById('grade-save').addEventListener('click', () => {
  const assignment = document.getElementById('grade-assignment').value.trim();
  const score = parseFloat(document.getElementById('grade-score').value);
  const total = parseFloat(document.getElementById('grade-total').value);
  const category = document.getElementById('grade-category').value;
  if (!assignment || isNaN(score) || isNaN(total) || total === 0) return;
  const cls = classes.find(c => c.id === currentClassId);
  if (!cls) return;
  cls.grades.push({ id: Date.now().toString(), assignment, score, total, category });
  Store.set('classes', classes);
  gradeModal.classList.add('hidden');
  renderClasses();
});

function letterGrade(p) {
  if (p >= 93) return 'A'; if (p >= 90) return 'A-'; if (p >= 87) return 'B+';
  if (p >= 83) return 'B'; if (p >= 80) return 'B-'; if (p >= 77) return 'C+';
  if (p >= 73) return 'C'; if (p >= 70) return 'C-'; if (p >= 67) return 'D+';
  if (p >= 60) return 'D'; return 'F';
}

function gradeColor(p) {
  if (p >= 90) return 'grade-a'; if (p >= 80) return 'grade-b';
  if (p >= 70) return 'grade-c'; if (p >= 60) return 'grade-d'; return 'grade-f';
}

function toGPA(p) {
  if (p >= 93) return 4.0; if (p >= 90) return 3.7; if (p >= 87) return 3.3;
  if (p >= 83) return 3.0; if (p >= 80) return 2.7; if (p >= 77) return 2.3;
  if (p >= 73) return 2.0; if (p >= 70) return 1.7; if (p >= 67) return 1.3;
  if (p >= 60) return 1.0; return 0.0;
}

function renderClasses() {
  if (classes.length === 0) {
    classesList.innerHTML = '<div class="empty-state">No classes yet. Click "+ Add Class" to get started!</div>';
    return;
  }
  classesList.innerHTML = classes.map(cls => {
    const ts = cls.grades.reduce((s, g) => s + g.score, 0);
    const tp = cls.grades.reduce((s, g) => s + g.total, 0);
    const avg = tp > 0 ? (ts / tp) * 100 : 0;
    const letter = cls.grades.length > 0 ? letterGrade(avg) : '--';
    const cc = cls.grades.length > 0 ? gradeColor(avg) : '';
    return `<div class="class-card">
      <div class="class-header"><h3>${esc(cls.name)}</h3><span class="class-avg ${cc}">${letter} ${cls.grades.length > 0 ? `(${avg.toFixed(1)}%)` : ''}</span></div>
      ${cls.teacher ? `<div class="class-teacher">Teacher: ${esc(cls.teacher)}</div>` : ''}
      <div class="grade-list">${cls.grades.length === 0 ? '<div class="empty-state">No grades yet</div>' : cls.grades.map(g => `
        <div class="grade-item"><span>${esc(g.assignment)}</span><span><span class="grade-cat">${g.category}</span> ${g.score}/${g.total} (${((g.score/g.total)*100).toFixed(1)}%)</span></div>`).join('')}
      </div>
      <div class="class-actions">
        <button class="btn btn-small btn-primary add-grade-btn" data-id="${cls.id}">+ Add Grade</button>
        <button class="btn btn-small btn-danger delete-class-btn" data-id="${cls.id}">Delete Class</button>
      </div>
    </div>`;
  }).join('');

  classesList.querySelectorAll('.add-grade-btn').forEach(btn => btn.addEventListener('click', e => {
    currentClassId = e.target.dataset.id;
    document.getElementById('grade-assignment').value = '';
    document.getElementById('grade-score').value = '';
    document.getElementById('grade-total').value = '100';
    gradeModal.classList.remove('hidden');
  }));

  classesList.querySelectorAll('.delete-class-btn').forEach(btn => btn.addEventListener('click', e => {
    classes = classes.filter(c => c.id !== e.target.dataset.id);
    Store.set('classes', classes);
    renderClasses();
  }));
}

// ===================== GPA CALCULATOR =====================
document.getElementById('gpa-calc-btn').addEventListener('click', () => {
  const current = parseFloat(document.getElementById('gpa-current').value);
  const count = parseInt(document.getElementById('gpa-count').value);
  const target = parseFloat(document.getElementById('gpa-target').value);
  const result = document.getElementById('gpa-calc-result');

  if (isNaN(current) || isNaN(count) || isNaN(target) || count < 1) {
    result.innerHTML = 'Please fill in all fields correctly.';
    return;
  }

  const needed = (target * (count + 1)) - (current * count);
  if (needed > 100) {
    result.innerHTML = `You would need <strong>${needed.toFixed(1)}%</strong> on your next assignment, which is above 100%. You may need more than one assignment to reach ${target}%.`;
  } else if (needed < 0) {
    result.innerHTML = `Great news! Even a <strong>0%</strong> would keep you above your target of ${target}%. You're doing amazing!`;
  } else {
    result.innerHTML = `You need at least <strong>${needed.toFixed(1)}%</strong> on your next assignment to bring your average to ${target}%.`;
  }
});

function renderGPASummary() {
  const table = document.getElementById('gpa-summary-table');
  if (classes.length === 0) {
    table.innerHTML = '<div class="empty-state">Add classes in the Grades tab to see your GPA summary.</div>';
    return;
  }
  let totalGPA = 0, count = 0;
  table.innerHTML = classes.map(cls => {
    const ts = cls.grades.reduce((s, g) => s + g.score, 0);
    const tp = cls.grades.reduce((s, g) => s + g.total, 0);
    const avg = tp > 0 ? (ts / tp) * 100 : null;
    if (avg !== null) { totalGPA += toGPA(avg); count++; }
    return `<div class="gpa-summary-row">
      <span class="class-name">${esc(cls.name)}</span>
      <span class="${avg !== null ? gradeColor(avg) : ''}">${avg !== null ? `${letterGrade(avg)} (${avg.toFixed(1)}%) - GPA: ${toGPA(avg).toFixed(1)}` : 'No grades'}</span>
    </div>`;
  }).join('') + (count > 0 ? `<div class="gpa-summary-row" style="font-weight:700;margin-top:8px;padding-top:12px;border-top:2px solid var(--primary)"><span>Overall GPA</span><span style="color:var(--primary)">${(totalGPA / count).toFixed(2)}</span></div>` : '');
}

// ===================== SCHEDULE =====================
const scheduleModal = document.getElementById('schedule-modal');
const scheduleBody = document.getElementById('schedule-body');

document.getElementById('add-schedule-btn').addEventListener('click', () => {
  document.getElementById('sch-class').value = '';
  document.getElementById('sch-room').value = '';
  document.getElementById('sch-start').value = '';
  document.getElementById('sch-end').value = '';
  document.querySelectorAll('.day-checkboxes input').forEach(cb => cb.checked = false);
  scheduleModal.classList.remove('hidden');
});

document.getElementById('sch-cancel').addEventListener('click', () => scheduleModal.classList.add('hidden'));

document.getElementById('sch-save').addEventListener('click', () => {
  const className = document.getElementById('sch-class').value.trim();
  const room = document.getElementById('sch-room').value.trim();
  const start = document.getElementById('sch-start').value;
  const end = document.getElementById('sch-end').value;
  const days = [];
  document.querySelectorAll('.day-checkboxes input:checked').forEach(cb => days.push(cb.value));
  if (!className || !start || !end || days.length === 0) return;
  scheduleItems.push({ id: Date.now().toString(), className, room, start, end, days });
  Store.set('schedule', scheduleItems);
  scheduleModal.classList.add('hidden');
  renderSchedule();
});

function renderSchedule() {
  const timeSlots = [];
  for (let h = 7; h <= 18; h++) {
    const label = h <= 12 ? `${h}:00 ${h < 12 ? 'AM' : 'PM'}` : `${h-12}:00 PM`;
    timeSlots.push({ hour: h, label });
  }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  scheduleBody.innerHTML = timeSlots.map(slot => {
    const cells = days.map(day => {
      const match = scheduleItems.find(s => s.days.includes(day) && parseInt(s.start.split(':')[0]) === slot.hour);
      return match
        ? `<div class="sch-cell"><div class="sch-block"><div>${esc(match.className)}</div><div class="sch-room">${esc(match.room)}</div><div class="sch-room">${match.start} - ${match.end}</div></div></div>`
        : '<div class="sch-cell"></div>';
    }).join('');
    return `<div class="schedule-row"><div class="sch-time-cell">${slot.label}</div>${cells}</div>`;
  }).join('');
}

// ===================== TO-DO LIST =====================
const todoInput = document.getElementById('todo-input');
const todoCategory = document.getElementById('todo-category');
const todoList = document.getElementById('todo-list');
let todoFilter = 'all';

document.getElementById('add-todo-btn').addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ id: Date.now().toString(), text, category: todoCategory.value, done: false, createdAt: new Date().toISOString() });
  Store.set('todos', todos);
  todoInput.value = '';
  renderTodos();
}

document.querySelectorAll('.todo-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.todo-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    todoFilter = btn.dataset.filter;
    renderTodos();
  });
});

function renderTodos() {
  let filtered = todos;
  if (todoFilter === 'active') filtered = todos.filter(t => !t.done);
  else if (todoFilter === 'done') filtered = todos.filter(t => t.done);

  todoList.innerHTML = filtered.length === 0
    ? '<div class="empty-state">No tasks yet. Add one above!</div>'
    : filtered.map(t => `
      <div class="todo-item ${t.done ? 'done' : ''}">
        <input type="checkbox" class="hw-checkbox todo-check" ${t.done ? 'checked' : ''} data-id="${t.id}">
        <span class="todo-text">${esc(t.text)}</span>
        <span class="todo-cat-badge">${t.category}</span>
        <button class="btn btn-small btn-danger todo-del" data-id="${t.id}">Del</button>
      </div>`).join('');

  todoList.querySelectorAll('.todo-check').forEach(cb => cb.addEventListener('change', e => {
    const t = todos.find(x => x.id === e.target.dataset.id);
    if (t) { t.done = e.target.checked; Store.set('todos', todos); renderTodos(); }
  }));

  todoList.querySelectorAll('.todo-del').forEach(btn => btn.addEventListener('click', e => {
    todos = todos.filter(t => t.id !== e.target.dataset.id);
    Store.set('todos', todos);
    renderTodos();
  }));
}

// ===================== EXAM COUNTDOWN =====================
const examModal = document.getElementById('exam-modal');

document.getElementById('add-exam-btn').addEventListener('click', () => {
  ['exam-subject','exam-name','exam-date','exam-topics'].forEach(id => document.getElementById(id).value = '');
  examModal.classList.remove('hidden');
});

document.getElementById('exam-cancel').addEventListener('click', () => examModal.classList.add('hidden'));

document.getElementById('exam-save').addEventListener('click', () => {
  const subject = document.getElementById('exam-subject').value.trim();
  const name = document.getElementById('exam-name').value.trim();
  const date = document.getElementById('exam-date').value;
  const topics = document.getElementById('exam-topics').value.trim();
  if (!subject || !name || !date) return;
  exams.push({ id: Date.now().toString(), subject, name, date, topics });
  Store.set('exams', exams);
  examModal.classList.add('hidden');
  renderExams();
});

function renderExams() {
  const now = new Date();
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
  const examsList = document.getElementById('exams-list');

  examsList.innerHTML = sorted.length === 0
    ? '<div class="empty-state">No exams yet. Click "+ Add Exam" to add one!</div>'
    : sorted.map(ex => {
      const examDate = new Date(ex.date + 'T00:00:00');
      const diffMs = examDate - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      let urgency, countdownText, cardClass;

      if (diffDays < 0) {
        urgency = ''; countdownText = 'Past'; cardClass = 'exam-past';
      } else if (diffDays === 0) {
        urgency = 'urgent'; countdownText = 'TODAY!'; cardClass = 'exam-urgent';
      } else if (diffDays <= 3) {
        urgency = 'urgent'; countdownText = `${diffDays} day${diffDays > 1 ? 's' : ''}`; cardClass = 'exam-urgent';
      } else if (diffDays <= 7) {
        urgency = 'soon'; countdownText = `${diffDays} days`; cardClass = 'exam-soon';
      } else {
        urgency = 'later'; countdownText = `${diffDays} days`; cardClass = 'exam-later';
      }

      return `<div class="exam-card ${cardClass}">
        <div class="exam-subject">${esc(ex.subject)}</div>
        <h4>${esc(ex.name)}</h4>
        <div class="exam-countdown ${urgency}">${countdownText}</div>
        <div class="exam-date-label">${fmtDate(ex.date)}</div>
        ${ex.topics ? `<div class="exam-topics"><strong>Topics:</strong> ${esc(ex.topics)}</div>` : ''}
        <div class="exam-actions">
          <button class="btn btn-small btn-danger exam-del" data-id="${ex.id}">Delete</button>
        </div>
      </div>`;
    }).join('');

  examsList.querySelectorAll('.exam-del').forEach(btn => btn.addEventListener('click', e => {
    exams = exams.filter(x => x.id !== e.target.dataset.id);
    Store.set('exams', exams);
    renderExams();
  }));
}

// ===================== FLASHCARDS =====================
const deckModal = document.getElementById('deck-modal');
const cardModal = document.getElementById('card-modal');
const deckListView = document.getElementById('deck-list-view');
const deckStudyView = document.getElementById('deck-study-view');
let currentDeckId = null;
let currentCardIndex = 0;

document.getElementById('add-deck-btn').addEventListener('click', () => {
  document.getElementById('deck-name').value = '';
  deckModal.classList.remove('hidden');
});

document.getElementById('deck-cancel').addEventListener('click', () => deckModal.classList.add('hidden'));
document.getElementById('card-cancel').addEventListener('click', () => cardModal.classList.add('hidden'));

document.getElementById('deck-save').addEventListener('click', () => {
  const name = document.getElementById('deck-name').value.trim();
  if (!name) return;
  flashDecks.push({ id: Date.now().toString(), name, cards: [] });
  Store.set('flashDecks', flashDecks);
  deckModal.classList.add('hidden');
  renderDecks();
});

document.getElementById('card-save').addEventListener('click', () => {
  const front = document.getElementById('card-front-input').value.trim();
  const back = document.getElementById('card-back-input').value.trim();
  if (!front || !back) return;
  const deck = flashDecks.find(d => d.id === currentDeckId);
  if (!deck) return;
  deck.cards.push({ id: Date.now().toString(), front, back });
  Store.set('flashDecks', flashDecks);
  cardModal.classList.add('hidden');
  renderDecks();
});

document.getElementById('back-to-decks').addEventListener('click', () => {
  deckStudyView.classList.add('hidden');
  deckListView.classList.remove('hidden');
  document.getElementById('add-deck-btn').classList.remove('hidden');
});

document.getElementById('card-flip').addEventListener('click', flipCard);
document.getElementById('flashcard').addEventListener('click', flipCard);

document.getElementById('card-prev').addEventListener('click', () => {
  const deck = flashDecks.find(d => d.id === currentDeckId);
  if (!deck || deck.cards.length === 0) return;
  currentCardIndex = (currentCardIndex - 1 + deck.cards.length) % deck.cards.length;
  showCard(deck);
});

document.getElementById('card-next').addEventListener('click', () => {
  const deck = flashDecks.find(d => d.id === currentDeckId);
  if (!deck || deck.cards.length === 0) return;
  currentCardIndex = (currentCardIndex + 1) % deck.cards.length;
  showCard(deck);
});

document.getElementById('card-shuffle').addEventListener('click', () => {
  const deck = flashDecks.find(d => d.id === currentDeckId);
  if (!deck || deck.cards.length < 2) return;
  for (let i = deck.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  }
  Store.set('flashDecks', flashDecks);
  currentCardIndex = 0;
  showCard(deck);
});

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function showCard(deck) {
  const card = deck.cards[currentCardIndex];
  const flashcardEl = document.getElementById('flashcard');
  flashcardEl.classList.remove('flipped');
  document.getElementById('card-front').textContent = card ? card.front : 'No cards';
  document.getElementById('card-back').textContent = card ? card.back : 'Add some cards!';
  document.getElementById('study-progress').textContent = deck.cards.length > 0 ? `${currentCardIndex + 1} / ${deck.cards.length}` : '0 / 0';
}

function startStudy(deckId) {
  currentDeckId = deckId;
  currentCardIndex = 0;
  const deck = flashDecks.find(d => d.id === deckId);
  if (!deck) return;
  document.getElementById('study-deck-title').textContent = deck.name;
  deckListView.classList.add('hidden');
  document.getElementById('add-deck-btn').classList.add('hidden');
  deckStudyView.classList.remove('hidden');
  showCard(deck);
}

function renderDecks() {
  const decksList = document.getElementById('decks-list');
  decksList.innerHTML = flashDecks.length === 0
    ? '<div class="empty-state">No flashcard decks yet. Click "+ New Deck" to create one!</div>'
    : flashDecks.map(d => `
      <div class="deck-card">
        <h4>${esc(d.name)}</h4>
        <p>${d.cards.length} card${d.cards.length !== 1 ? 's' : ''}</p>
        <div class="deck-card-actions">
          <button class="btn btn-small btn-primary deck-study" data-id="${d.id}" ${d.cards.length === 0 ? 'disabled' : ''}>Study</button>
          <button class="btn btn-small btn-secondary deck-add-card" data-id="${d.id}">+ Card</button>
          <button class="btn btn-small btn-danger deck-del" data-id="${d.id}">Delete</button>
        </div>
      </div>`).join('');

  decksList.querySelectorAll('.deck-study').forEach(btn => btn.addEventListener('click', e => startStudy(e.target.dataset.id)));

  decksList.querySelectorAll('.deck-add-card').forEach(btn => btn.addEventListener('click', e => {
    currentDeckId = e.target.dataset.id;
    document.getElementById('card-front-input').value = '';
    document.getElementById('card-back-input').value = '';
    cardModal.classList.remove('hidden');
  }));

  decksList.querySelectorAll('.deck-del').forEach(btn => btn.addEventListener('click', e => {
    flashDecks = flashDecks.filter(d => d.id !== e.target.dataset.id);
    Store.set('flashDecks', flashDecks);
    renderDecks();
  }));
}

// ===================== NOTES =====================
const notesSidebar = document.getElementById('notes-sidebar');
const noteEditor = document.getElementById('note-editor');
const noteTitleInput = document.getElementById('note-title-input');

document.getElementById('add-note-btn').addEventListener('click', () => {
  const note = { id: Date.now().toString(), title: 'Untitled Note', content: '', updatedAt: new Date().toISOString() };
  notes.push(note);
  Store.set('notes', notes);
  activeNoteId = note.id;
  renderNotes();
  noteTitleInput.focus();
});

document.getElementById('delete-note-btn').addEventListener('click', () => {
  if (!activeNoteId) return;
  notes = notes.filter(n => n.id !== activeNoteId);
  activeNoteId = notes.length > 0 ? notes[notes.length - 1].id : null;
  Store.set('notes', notes);
  renderNotes();
});

noteTitleInput.addEventListener('input', () => {
  if (!activeNoteId) return;
  const note = notes.find(n => n.id === activeNoteId);
  if (note) { note.title = noteTitleInput.value || 'Untitled Note'; note.updatedAt = new Date().toISOString(); Store.set('notes', notes); renderNotesSidebar(); }
});

noteEditor.addEventListener('input', () => {
  if (!activeNoteId) return;
  const note = notes.find(n => n.id === activeNoteId);
  if (note) { note.content = noteEditor.value; note.updatedAt = new Date().toISOString(); Store.set('notes', notes); renderNotesSidebar(); }
});

function renderNotes() {
  renderNotesSidebar();
  if (activeNoteId) {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) { noteTitleInput.value = note.title; noteEditor.value = note.content; }
  } else { noteTitleInput.value = ''; noteEditor.value = ''; }
}

function renderNotesSidebar() {
  const sorted = [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  notesSidebar.innerHTML = sorted.length === 0
    ? '<div class="empty-state" style="padding:16px">No notes yet</div>'
    : sorted.map(n => `<div class="note-item ${n.id === activeNoteId ? 'active' : ''}" data-id="${n.id}"><h4>${esc(n.title)}</h4><p>${fmtDate(n.updatedAt.split('T')[0])}</p></div>`).join('');
  notesSidebar.querySelectorAll('.note-item').forEach(item => item.addEventListener('click', () => { activeNoteId = item.dataset.id; renderNotes(); }));
}

// ===================== STUDY TIMER =====================
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerStartTime = null;

const timerMinDisplay = document.getElementById('timer-minutes');
const timerSecDisplay = document.getElementById('timer-seconds');

document.getElementById('timer-start').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  timerStartTime = Date.now();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false;
      logStudySession(); timerSeconds = 25 * 60; updateTimerDisplay();
      alert('Study session complete! Great job!');
    }
  }, 1000);
});

document.getElementById('timer-pause').addEventListener('click', () => {
  if (!timerRunning) return;
  clearInterval(timerInterval); timerRunning = false;
});

document.getElementById('timer-reset').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false;
  timerSeconds = 25 * 60; updateTimerDisplay();
});

document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false;
  timerSeconds = parseInt(btn.dataset.minutes) * 60; updateTimerDisplay();
}));

function updateTimerDisplay() {
  timerMinDisplay.textContent = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  timerSecDisplay.textContent = (timerSeconds % 60).toString().padStart(2, '0');
}

function logStudySession() {
  const duration = timerStartTime ? Math.round((Date.now() - timerStartTime) / 60000) : 25;
  studyLog.push({ date: new Date().toISOString(), duration });
  Store.set('studyLog', studyLog);
  renderStudyLog();
}

function renderStudyLog() {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = studyLog.filter(l => l.date.startsWith(today));
  const totalMin = todayLogs.reduce((s, l) => s + l.duration, 0);
  document.getElementById('study-log-list').innerHTML = todayLogs.length === 0
    ? '<div class="empty-state">No study sessions today</div>'
    : todayLogs.map(l => `<div class="log-item"><span>${new Date(l.date).toLocaleTimeString()}</span><span>${l.duration} min</span></div>`).join('');
  document.getElementById('total-study-time').textContent = `Total today: ${totalMin} min`;
}

// ===================== CLAUDE AI CHAT =====================
const claudeSetup = document.getElementById('claude-setup');
const claudeChat = document.getElementById('claude-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
let claudeApiKey = Store.get('claudeApiKey', '');
let claudeMessages = []; // conversation history for API

if (claudeApiKey) {
  claudeSetup.classList.add('hidden');
  claudeChat.classList.remove('hidden');
  // Restore chat history UI
  if (chatHistory.length > 0) {
    chatHistory.forEach(msg => appendChatMessage(msg.role, msg.content, false));
  }
}

document.getElementById('claude-connect-btn').addEventListener('click', () => {
  const key = document.getElementById('claude-api-key').value.trim();
  if (!key) return;
  claudeApiKey = key;
  Store.set('claudeApiKey', claudeApiKey);
  claudeSetup.classList.add('hidden');
  claudeChat.classList.remove('hidden');
});

document.getElementById('chat-send').addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    chatInput.value = btn.dataset.msg;
    sendMessage();
  });
});

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !claudeApiKey) return;

  chatInput.value = '';
  appendChatMessage('user', text);

  // Build API messages from chat history
  claudeMessages.push({ role: 'user', content: text });

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg assistant';
  typingEl.innerHTML = `<div class="chat-avatar">&#129302;</div><div class="chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  chatMessages.appendChild(typingEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Disable send
  const sendBtn = document.getElementById('chat-send');
  sendBtn.disabled = true;

  try {
    const result = await window.claude.chat(claudeApiKey, claudeMessages);

    // Remove typing indicator
    chatMessages.removeChild(typingEl);

    if (result.error) {
      appendChatMessage('assistant', `Sorry, I ran into an error: ${result.error}`);
    } else {
      claudeMessages.push({ role: 'assistant', content: result.text });
      appendChatMessage('assistant', result.text);
    }
  } catch (err) {
    chatMessages.removeChild(typingEl);
    appendChatMessage('assistant', `Connection error: ${err.message}`);
  }

  sendBtn.disabled = false;
  // Hide suggestions after first message
  document.querySelector('.chat-suggestions').classList.add('hidden');
}

function appendChatMessage(role, content, save = true) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  const avatar = role === 'assistant' ? '&#129302;' : '&#128100;';
  div.innerHTML = `<div class="chat-avatar">${avatar}</div><div class="chat-bubble">${esc(content)}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (save) {
    chatHistory.push({ role, content });
    // Keep last 50 messages
    if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
    Store.set('chatHistory', chatHistory);
  }
}

// ===================== DASHBOARD =====================
function refreshDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = dayNames[new Date().getDay()];

  // Upcoming homework
  const upcoming = homework.filter(h => !h.completed).sort((a, b) => (a.due || 'z').localeCompare(b.due || 'z')).slice(0, 5);
  document.getElementById('dash-homework-list').innerHTML = upcoming.length === 0
    ? '<div class="empty-state">No pending assignments</div>'
    : upcoming.map(h => `<div class="dash-list-item"><span>${esc(h.subject)}: ${esc(h.title)}</span><span class="${h.due && h.due < today ? 'overdue' : ''}">${h.due ? fmtDate(h.due) : 'No date'}</span></div>`).join('');

  // GPA
  const classAvgs = classes.filter(c => c.grades.length > 0).map(c => {
    const ts = c.grades.reduce((s, g) => s + g.score, 0);
    const tp = c.grades.reduce((s, g) => s + g.total, 0);
    return (ts / tp) * 100;
  });
  document.querySelector('.gpa-number').textContent = classAvgs.length > 0
    ? (classAvgs.reduce((s, a) => s + toGPA(a), 0) / classAvgs.length).toFixed(2) : '--';

  // Today's schedule
  const todayClasses = scheduleItems.filter(s => s.days.includes(todayDay));
  document.getElementById('dash-schedule-list').innerHTML = todayClasses.length === 0
    ? '<div class="empty-state">No classes today</div>'
    : todayClasses.sort((a, b) => a.start.localeCompare(b.start)).map(s => `<div class="dash-list-item"><span>${esc(s.className)}</span><span>${s.start} - ${s.end}</span></div>`).join('');

  // Stats
  const pending = homework.filter(h => !h.completed).length + todos.filter(t => !t.done).length;
  const completed = homework.filter(h => h.completed).length + todos.filter(t => t.done).length;
  const overdue = homework.filter(h => !h.completed && h.due && h.due < today).length;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-overdue').textContent = overdue;

  // Upcoming exams
  const now = new Date();
  const upcomingExams = exams.filter(e => new Date(e.date + 'T00:00:00') >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  document.getElementById('dash-exams-list').innerHTML = upcomingExams.length === 0
    ? '<div class="empty-state">No upcoming exams</div>'
    : upcomingExams.map(e => {
      const days = Math.ceil((new Date(e.date + 'T00:00:00') - now) / (1000*60*60*24));
      return `<div class="dash-list-item"><span>${esc(e.subject)}: ${esc(e.name)}</span><span class="${days <= 3 ? 'overdue' : ''}">${days === 0 ? 'TODAY' : days + ' days'}</span></div>`;
    }).join('');

  // Today's todos
  const activeTodos = todos.filter(t => !t.done).slice(0, 5);
  document.getElementById('dash-todos-list').innerHTML = activeTodos.length === 0
    ? '<div class="empty-state">All caught up!</div>'
    : activeTodos.map(t => `<div class="dash-list-item"><span>${esc(t.text)}</span><span class="todo-cat-badge">${t.category}</span></div>`).join('');
}

// ===================== HELPERS =====================
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

// ===================== INIT =====================
renderHomework();
renderClasses();
renderSchedule();
renderNotes();
renderStudyLog();
renderTodos();
renderExams();
renderDecks();
renderGPASummary();
refreshDashboard();
