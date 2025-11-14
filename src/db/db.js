const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

// Resolve DB path inside user's home directory for cross-context compatibility
const dataDir = path.join(os.homedir(), '.school-finance', 'data');
const dbPath = path.join(dataDir, 'school_finance.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Helpful indices for common queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
  CREATE INDEX IF NOT EXISTS idx_fees_paid_due ON fees(paid, due_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_salaries_date ON salaries(date);
`);

// Lightweight migration: add paid_amount to fees if missing
try {
  const cols = db.prepare(`PRAGMA table_info(fees)`).all();
  const hasPaidAmount = cols.some(c => c.name === 'paid_amount');
  if (!hasPaidAmount) {
    db.exec(`ALTER TABLE fees ADD COLUMN paid_amount REAL DEFAULT 0`);
    // Backfill: set fully paid rows' paid_amount = amount
    db.exec(`UPDATE fees SET paid_amount = amount WHERE paid = 1 AND (paid_amount IS NULL OR paid_amount = 0)`);
  }
} catch (_) { /* ignore */ }

// Lightweight migration: add section to students if missing
try {
  const cols = db.prepare(`PRAGMA table_info(students)`).all();
  const hasSection = cols.some(c => c.name === 'section');
  if (!hasSection) {
    db.exec(`ALTER TABLE students ADD COLUMN section TEXT`);
  }
} catch (_) { /* ignore */ }

// Helper: dynamic update
function buildUpdate(setObj) {
  const keys = Object.keys(setObj || {});
  if (keys.length === 0) {
    throw new Error('No updates provided');
  }
  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  return { setClause, keys };
}

// Students CRUD
function listStudents() {
  return db.prepare('SELECT * FROM students ORDER BY id DESC').all();
}

function addStudent({ name, grade, section, parent_phone, national_id, status = 'active', admission_date }) {
  const stmt = db.prepare(`INSERT INTO students (name, grade, section, parent_phone, national_id, status, admission_date)
                           VALUES (@name, @grade, @section, @parent_phone, @national_id, @status, @admission_date)`);
  const info = stmt.run({ name, grade, section, parent_phone, national_id, status, admission_date });
  return { id: info.lastInsertRowid };
}

function updateStudent(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE students SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteStudent(id) {
  db.prepare('DELETE FROM fees WHERE student_id = ?').run(id);
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
  return { id };
}

// Classes CRUD
function listClasses() {
  return db.prepare('SELECT * FROM classes ORDER BY id DESC').all();
}

function addClass({ stage, grade_label, branch, shift, notes }) {
  const stmt = db.prepare(`INSERT INTO classes (stage, grade_label, branch, shift, notes)
                           VALUES (@stage, @grade_label, @branch, @shift, @notes)`);
  const info = stmt.run({ stage, grade_label, branch, shift, notes });
  return { id: info.lastInsertRowid };
}

function updateClass(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE classes SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteClass(id) {
  db.prepare('DELETE FROM classes WHERE id = ?').run(id);
  return { id };
}

// Subjects CRUD
function listSubjects() {
  return db.prepare('SELECT * FROM subjects ORDER BY name ASC').all();
}

function addSubject({ name, notes }) {
  const stmt = db.prepare(`INSERT INTO subjects (name, notes)
                           VALUES (@name, @notes)`);
  const info = stmt.run({ name, notes });
  return { id: info.lastInsertRowid };
}

function updateSubject(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE subjects SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteSubject(id) {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  return { id };
}

// Sections CRUD
function listSectionsByClass(classId) {
  return db.prepare('SELECT * FROM sections WHERE class_id = ? ORDER BY id ASC').all(classId);
}

function addSection({ class_id, name, room, capacity, notes }) {
  const stmt = db.prepare(`INSERT INTO sections (class_id, name, room, capacity, notes)
                           VALUES (@class_id, @name, @room, @capacity, @notes)`);
  const info = stmt.run({ class_id, name, room, capacity, notes });
  return { id: info.lastInsertRowid };
}

function updateSection(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE sections SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteSection(id) {
  db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  return { id };
}

// Timetable CRUD
function listTimetableBySection(sectionId) {
  return db.prepare(`
    SELECT te.*, subj.name AS subject_name, t.name AS teacher_name
    FROM timetable_entries te
    LEFT JOIN subjects subj ON subj.id = te.subject_id
    LEFT JOIN teachers t ON t.id = te.teacher_id
    WHERE te.section_id = ?
  `).all(sectionId);
}

function addTimetableEntry({ section_id, day_of_week, period_idx, subject_id, teacher_id, notes }) {
  const stmt = db.prepare(`INSERT INTO timetable_entries (section_id, day_of_week, period_idx, subject_id, teacher_id, notes)
                           VALUES (@section_id, @day_of_week, @period_idx, @subject_id, @teacher_id, @notes)`);
  const info = stmt.run({ section_id, day_of_week, period_idx, subject_id, teacher_id, notes });
  return { id: info.lastInsertRowid };
}

function updateTimetableEntry(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE timetable_entries SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteTimetableEntry(id) {
  db.prepare('DELETE FROM timetable_entries WHERE id = ?').run(id);
  return { id };
}

// Teachers CRUD
function listTeachers() {
  return db.prepare('SELECT * FROM teachers ORDER BY id DESC').all();
}

function addTeacher({ name, subject, phone, national_id, status = 'active', hire_date }) {
  const stmt = db.prepare(`INSERT INTO teachers (name, subject, phone, national_id, status, hire_date)
                           VALUES (@name, @subject, @phone, @national_id, @status, @hire_date)`);
  const info = stmt.run({ name, subject, phone, national_id, status, hire_date });
  return { id: info.lastInsertRowid };
}

function updateTeacher(id, updates) {
  const { setClause } = buildUpdate(updates);
  const stmt = db.prepare(`UPDATE teachers SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return { id };
}

function deleteTeacher(id) {
  db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
  return { id };
}

// Fees CRUD
function listFeesByStudent(studentId) {
  return db.prepare(`
    SELECT id, student_id, fee_type, installment_no,
           CAST(amount AS REAL) AS amount,
           due_date,
           CAST(paid AS INTEGER) AS paid,
           payment_date,
           CAST(non_refundable AS INTEGER) AS non_refundable,
           CAST(COALESCE(paid_amount, 0) AS REAL) AS paid_amount
    FROM fees
    WHERE student_id = ?
    ORDER BY due_date
  `).all(studentId);
}

function addFee({ student_id, fee_type, installment_no, amount, due_date, paid = 0, payment_date, non_refundable = 0, paid_amount = 0 }) {
  const stmt = db.prepare(`INSERT INTO fees (student_id, fee_type, installment_no, amount, due_date, paid, payment_date, non_refundable, paid_amount)
                           VALUES (@student_id, @fee_type, @installment_no, @amount, @due_date, @paid, @payment_date, @non_refundable, @paid_amount)`);
  const info = stmt.run({ student_id, fee_type, installment_no, amount, due_date, paid, payment_date, non_refundable, paid_amount });
  return { id: info.lastInsertRowid };
}

function updateFee(id, updates) {
  // Coerce flags to integers
  const coerced = { ...updates };
  if (Object.prototype.hasOwnProperty.call(coerced, 'paid')) {
    coerced.paid = coerced.paid ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(coerced, 'non_refundable')) {
    coerced.non_refundable = coerced.non_refundable ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(coerced, 'paid_amount')) {
    const amt = Number(coerced.paid_amount) || 0;
    coerced.paid_amount = amt;
    // Optionally set paid flag based on full settlement
    if (!Object.prototype.hasOwnProperty.call(coerced, 'paid')) {
      coerced.paid = amt > 0 ? (amt >= (Number(coerced.amount) || 0) ? 1 : 0) : 0;
    }
  }
  const { setClause } = buildUpdate(coerced);
  const stmt = db.prepare(`UPDATE fees SET ${setClause} WHERE id = @id`);
  stmt.run({ ...coerced, id });
  return { id };
}

function deleteFee(id) {
  db.prepare('DELETE FROM fees WHERE id = ?').run(id);
  return { id };
}

// Expenses
function listExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
}

function addExpense({ description, expense_category, amount, date }) {
  const stmt = db.prepare(`INSERT INTO expenses (description, expense_category, amount, date)
                           VALUES (@description, @expense_category, @amount, COALESCE(@date, CURRENT_TIMESTAMP))`);
  const info = stmt.run({ description, expense_category, amount, date });
  return { id: info.lastInsertRowid };
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { id };
}

// Incomes (manual entries)
function listIncomes() {
  return db.prepare('SELECT * FROM incomes ORDER BY date DESC').all();
}

function addIncome({ description, income_category, amount, date }) {
  const stmt = db.prepare(`INSERT INTO incomes (description, income_category, amount, date)
                           VALUES (@description, @income_category, @amount, COALESCE(@date, CURRENT_TIMESTAMP))`);
  const info = stmt.run({ description, income_category, amount, date });
  return { id: info.lastInsertRowid };
}

function deleteIncome(id) {
  db.prepare('DELETE FROM incomes WHERE id = ?').run(id);
  return { id };
}

// Salaries
function listSalaries() {
  return db.prepare('SELECT * FROM salaries ORDER BY date DESC').all();
}

function addSalary({ staff_name, position, contract_type, payment_frequency, amount, date }) {
  const stmt = db.prepare(`INSERT INTO salaries (staff_name, position, contract_type, payment_frequency, amount, date)
                           VALUES (@staff_name, @position, @contract_type, @payment_frequency, @amount, COALESCE(@date, CURRENT_TIMESTAMP))`);
  const info = stmt.run({ staff_name, position, contract_type, payment_frequency, amount, date });
  return { id: info.lastInsertRowid };
}

function deleteSalary(id) {
  db.prepare('DELETE FROM salaries WHERE id = ?').run(id);
  return { id };
}

// Reports (simplified)
function reportOutstandingFees() {
  return db.prepare(`
    SELECT s.id as student_id, s.name,
           SUM(CASE WHEN (f.amount - COALESCE(f.paid_amount,0)) > 0 THEN (f.amount - COALESCE(f.paid_amount,0)) ELSE 0 END) as outstanding,
           SUM(CASE WHEN (f.amount - COALESCE(f.paid_amount,0)) > 0 THEN 1 ELSE 0 END) as installments_due
    FROM students s
    LEFT JOIN fees f ON f.student_id = s.id
    GROUP BY s.id, s.name
    ORDER BY outstanding DESC
  `).all();
}

function reportIncomeVsExpenses() {
  const feesIncome = db.prepare(`SELECT COALESCE(SUM(COALESCE(paid_amount,0)), 0) AS collected FROM fees`).get().collected;
  const manualIncome = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS received FROM incomes`).get().received;
  const income = feesIncome + manualIncome;
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS spent FROM expenses`).get().spent;
  return { income, expenses, profit: income - expenses };
}

// Settings
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(`INSERT INTO settings(key, value) VALUES (@key, @value)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run({ key, value });
  return { key, value };
}

module.exports = {
  listStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  listClasses,
  addClass,
  updateClass,
  deleteClass,
  listSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  listTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  listTimetableBySection,
  addTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  listSectionsByClass,
  addSection,
  updateSection,
  deleteSection,
  listFeesByStudent,
  addFee,
  updateFee,
  deleteFee,
  listExpenses,
  addExpense,
  deleteExpense,
  listIncomes,
  addIncome,
  deleteIncome,
  listSalaries,
  addSalary,
  deleteSalary,
  reportOutstandingFees,
  reportIncomeVsExpenses,
  getSetting,
  setSetting
};
