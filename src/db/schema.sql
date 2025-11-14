-- Students
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade TEXT,
  section TEXT,
  parent_phone TEXT,
  national_id TEXT,
  status TEXT DEFAULT 'active',
  admission_date TEXT
);

-- Classes (stages/grades)
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage TEXT NOT NULL,
  grade_label TEXT NOT NULL,
  branch TEXT,
  shift TEXT,
  notes TEXT
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  notes TEXT
);

-- Sections (per class)
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  room TEXT,
  capacity INTEGER,
  notes TEXT,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT,
  phone TEXT,
  national_id TEXT,
  status TEXT DEFAULT 'active',
  hire_date TEXT
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  day_of_week TEXT NOT NULL,
  period_idx INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  UNIQUE(section_id, day_of_week, period_idx),
  UNIQUE(teacher_id, day_of_week, period_idx)
);

-- Fees
CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  fee_type TEXT,
  installment_no INTEGER,
  amount REAL NOT NULL,
  due_date TEXT,
  paid INTEGER DEFAULT 0,
  payment_date TEXT,
  non_refundable INTEGER DEFAULT 0,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT,
  expense_category TEXT,
  amount REAL,
  date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Salaries
CREATE TABLE IF NOT EXISTS salaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_name TEXT NOT NULL,
  position TEXT,
  contract_type TEXT,
  payment_frequency TEXT,
  amount REAL,
  date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Incomes (manual, separate from fees collected)
CREATE TABLE IF NOT EXISTS incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT,
  income_category TEXT,
  amount REAL,
  date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
