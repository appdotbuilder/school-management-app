import { z } from 'zod';

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  date_of_birth: z.coerce.date(),
  enrollment_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Input schema for creating students
export const createStudentInputSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().nullable(),
  date_of_birth: z.coerce.date(),
  enrollment_date: z.coerce.date().optional()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

// Input schema for updating students
export const updateStudentInputSchema = z.object({
  id: z.number(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  date_of_birth: z.coerce.date().optional()
});

export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

// Subject schema
export const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  credits: z.number().int(),
  created_at: z.coerce.date()
});

export type Subject = z.infer<typeof subjectSchema>;

// Input schema for creating subjects
export const createSubjectInputSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  description: z.string().nullable(),
  credits: z.number().int().positive("Credits must be positive")
});

export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  date: z.coerce.date(),
  status: z.enum(['present', 'absent', 'late']),
  reason: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schema for recording attendance
export const recordAttendanceInputSchema = z.object({
  student_id: z.number(),
  date: z.coerce.date(),
  status: z.enum(['present', 'absent', 'late']),
  reason: z.string().nullable()
});

export type RecordAttendanceInput = z.infer<typeof recordAttendanceInputSchema>;

// Input schema for getting attendance by date range
export const getAttendanceInputSchema = z.object({
  student_id: z.number().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type GetAttendanceInput = z.infer<typeof getAttendanceInputSchema>;

// Grade schema
export const gradeSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  subject_id: z.number(),
  grade: z.number(),
  grade_type: z.enum(['midterm', 'final', 'assignment', 'quiz']),
  max_score: z.number(),
  comments: z.string().nullable(),
  recorded_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Grade = z.infer<typeof gradeSchema>;

// Input schema for recording grades
export const recordGradeInputSchema = z.object({
  student_id: z.number(),
  subject_id: z.number(),
  grade: z.number().min(0, "Grade cannot be negative"),
  grade_type: z.enum(['midterm', 'final', 'assignment', 'quiz']),
  max_score: z.number().positive("Max score must be positive"),
  comments: z.string().nullable(),
  recorded_date: z.coerce.date().optional()
});

export type RecordGradeInput = z.infer<typeof recordGradeInputSchema>;

// Schema for student with average grade (for rankings)
export const studentRankingSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  average_grade: z.number(),
  total_subjects: z.number().int(),
  rank: z.number().int()
});

export type StudentRanking = z.infer<typeof studentRankingSchema>;

// Input schema for getting top students
export const getTopStudentsInputSchema = z.object({
  limit: z.number().int().positive().optional(),
  grade_type: z.enum(['midterm', 'final', 'assignment', 'quiz']).optional()
});

export type GetTopStudentsInput = z.infer<typeof getTopStudentsInputSchema>;

// Schema for detailed student attendance with related data
export const attendanceWithStudentSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  student_name: z.string(),
  date: z.coerce.date(),
  status: z.enum(['present', 'absent', 'late']),
  reason: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AttendanceWithStudent = z.infer<typeof attendanceWithStudentSchema>;

// Schema for grade with student and subject details
export const gradeWithDetailsSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  student_name: z.string(),
  subject_id: z.number(),
  subject_name: z.string(),
  subject_code: z.string(),
  grade: z.number(),
  grade_type: z.enum(['midterm', 'final', 'assignment', 'quiz']),
  max_score: z.number(),
  percentage: z.number(),
  comments: z.string().nullable(),
  recorded_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type GradeWithDetails = z.infer<typeof gradeWithDetailsSchema>;