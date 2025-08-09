import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createStudentInputSchema,
  updateStudentInputSchema,
  createSubjectInputSchema,
  recordAttendanceInputSchema,
  getAttendanceInputSchema,
  recordGradeInputSchema,
  getTopStudentsInputSchema
} from './schema';

// Import all handlers
import { createStudent } from './handlers/create_student';
import { getStudents } from './handlers/get_students';
import { getStudentById } from './handlers/get_student_by_id';
import { updateStudent } from './handlers/update_student';
import { deleteStudent } from './handlers/delete_student';
import { createSubject } from './handlers/create_subject';
import { getSubjects } from './handlers/get_subjects';
import { recordAttendance } from './handlers/record_attendance';
import { getAttendance } from './handlers/get_attendance';
import { recordGrade } from './handlers/record_grade';
import { getGrades } from './handlers/get_grades';
import { getTopStudents } from './handlers/get_top_students';
import { getStudentStatistics } from './handlers/get_student_statistics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Student management routes
  createStudent: publicProcedure
    .input(createStudentInputSchema)
    .mutation(({ input }) => createStudent(input)),

  getStudents: publicProcedure
    .query(() => getStudents()),

  getStudentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStudentById(input.id)),

  updateStudent: publicProcedure
    .input(updateStudentInputSchema)
    .mutation(({ input }) => updateStudent(input)),

  deleteStudent: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteStudent(input.id)),

  // Subject management routes
  createSubject: publicProcedure
    .input(createSubjectInputSchema)
    .mutation(({ input }) => createSubject(input)),

  getSubjects: publicProcedure
    .query(() => getSubjects()),

  // Attendance management routes
  recordAttendance: publicProcedure
    .input(recordAttendanceInputSchema)
    .mutation(({ input }) => recordAttendance(input)),

  getAttendance: publicProcedure
    .input(getAttendanceInputSchema)
    .query(({ input }) => getAttendance(input)),

  // Grade management routes
  recordGrade: publicProcedure
    .input(recordGradeInputSchema)
    .mutation(({ input }) => recordGrade(input)),

  getGrades: publicProcedure
    .input(z.object({ studentId: z.number().optional() }))
    .query(({ input }) => getGrades(input.studentId)),

  // Analytics and ranking routes
  getTopStudents: publicProcedure
    .input(getTopStudentsInputSchema)
    .query(({ input }) => getTopStudents(input)),

  getStudentStatistics: publicProcedure
    .query(() => getStudentStatistics()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`School Management TRPC server listening at port: ${port}`);
}

start();