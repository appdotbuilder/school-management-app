import { serial, text, pgTable, timestamp, integer, numeric, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late']);
export const gradeTypeEnum = pgEnum('grade_type', ['midterm', 'final', 'assignment', 'quiz']);

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'), // Nullable by default
  date_of_birth: date('date_of_birth').notNull(),
  enrollment_date: date('enrollment_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Subjects table
export const subjectsTable = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'), // Nullable by default
  credits: integer('credits').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  date: date('date').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  reason: text('reason'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Grades table
export const gradesTable = pgTable('grades', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  subject_id: integer('subject_id').notNull().references(() => subjectsTable.id),
  grade: numeric('grade', { precision: 5, scale: 2 }).notNull(), // Use numeric for precise grade calculations
  grade_type: gradeTypeEnum('grade_type').notNull(),
  max_score: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
  comments: text('comments'), // Nullable by default
  recorded_date: date('recorded_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const studentsRelations = relations(studentsTable, ({ many }) => ({
  attendance: many(attendanceTable),
  grades: many(gradesTable),
}));

export const subjectsRelations = relations(subjectsTable, ({ many }) => ({
  grades: many(gradesTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [attendanceTable.student_id],
    references: [studentsTable.id],
  }),
}));

export const gradesRelations = relations(gradesTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [gradesTable.student_id],
    references: [studentsTable.id],
  }),
  subject: one(subjectsTable, {
    fields: [gradesTable.subject_id],
    references: [subjectsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Student = typeof studentsTable.$inferSelect;
export type NewStudent = typeof studentsTable.$inferInsert;

export type Subject = typeof subjectsTable.$inferSelect;
export type NewSubject = typeof subjectsTable.$inferInsert;

export type Attendance = typeof attendanceTable.$inferSelect;
export type NewAttendance = typeof attendanceTable.$inferInsert;

export type Grade = typeof gradesTable.$inferSelect;
export type NewGrade = typeof gradesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  students: studentsTable,
  subjects: subjectsTable,
  attendance: attendanceTable,
  grades: gradesTable,
};