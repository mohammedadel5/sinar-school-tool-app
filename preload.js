const { contextBridge } = require('electron');
const path = require('path');
const db = require('./src/db/db');

contextBridge.exposeInMainWorld('api', {
  // Students
  listStudents: () => db.listStudents(),
  addStudent: (student) => db.addStudent(student),
  updateStudent: (id, updates) => db.updateStudent(id, updates),
  deleteStudent: (id) => db.deleteStudent(id),

  // Classes & Sections
  listClasses: () => db.listClasses(),
  addClass: (cls) => db.addClass(cls),
  updateClass: (id, updates) => db.updateClass(id, updates),
  deleteClass: (id) => db.deleteClass(id),
  listSectionsByClass: (classId) => db.listSectionsByClass(classId),
  addSection: (section) => db.addSection(section),
  updateSection: (id, updates) => db.updateSection(id, updates),
  deleteSection: (id) => db.deleteSection(id),

  // Timetable
  listTimetableBySection: (sectionId) => db.listTimetableBySection(sectionId),
  addTimetableEntry: (entry) => db.addTimetableEntry(entry),
  updateTimetableEntry: (id, updates) => db.updateTimetableEntry(id, updates),
  deleteTimetableEntry: (id) => db.deleteTimetableEntry(id),

  // Subjects
  listSubjects: () => db.listSubjects(),
  addSubject: (subject) => db.addSubject(subject),
  updateSubject: (id, updates) => db.updateSubject(id, updates),
  deleteSubject: (id) => db.deleteSubject(id),

  // Teachers
  listTeachers: () => db.listTeachers(),
  addTeacher: (teacher) => db.addTeacher(teacher),
  updateTeacher: (id, updates) => db.updateTeacher(id, updates),
  deleteTeacher: (id) => db.deleteTeacher(id),

  // Fees
  listFeesByStudent: (studentId) => db.listFeesByStudent(studentId),
  addFee: (fee) => db.addFee(fee),
  updateFee: (id, updates) => db.updateFee(id, updates),
  deleteFee: (id) => db.deleteFee(id),

  // Expenses
  listExpenses: () => db.listExpenses(),
  addExpense: (expense) => db.addExpense(expense),
  deleteExpense: (id) => db.deleteExpense(id),

  // Incomes
  listIncomes: () => db.listIncomes(),
  addIncome: (income) => db.addIncome(income),
  deleteIncome: (id) => db.deleteIncome(id),

  // Salaries
  listSalaries: () => db.listSalaries(),
  addSalary: (salary) => db.addSalary(salary),
  deleteSalary: (id) => db.deleteSalary(id),

  // Reports (basic MVP)
  reportOutstandingFees: () => db.reportOutstandingFees(),
  reportIncomeVsExpenses: () => db.reportIncomeVsExpenses(),

  // Settings
  getSetting: (key) => db.getSetting(key),
  setSetting: (key, value) => db.setSetting(key, value)
});
