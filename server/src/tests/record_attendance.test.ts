import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, attendanceTable } from '../db/schema';
import { type RecordAttendanceInput } from '../schema';
import { recordAttendance } from '../handlers/record_attendance';
import { eq, and } from 'drizzle-orm';

describe('recordAttendance', () => {
  let testStudentId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test student for attendance records
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        date_of_birth: '1998-05-15',
        enrollment_date: '2023-09-01'
      })
      .returning()
      .execute();
    
    testStudentId = studentResult[0].id;
  });

  afterEach(resetDB);

  it('should record attendance successfully', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-15'),
      status: 'present',
      reason: null
    };

    const result = await recordAttendance(testInput);

    // Verify basic fields
    expect(result.student_id).toEqual(testStudentId);
    expect(result.date).toEqual(testInput.date);
    expect(result.status).toEqual('present');
    expect(result.reason).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should record attendance with reason', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-16'),
      status: 'late',
      reason: 'Traffic delay'
    };

    const result = await recordAttendance(testInput);

    expect(result.status).toEqual('late');
    expect(result.reason).toEqual('Traffic delay');
  });

  it('should record absent status with reason', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-17'),
      status: 'absent',
      reason: 'Sick leave'
    };

    const result = await recordAttendance(testInput);

    expect(result.status).toEqual('absent');
    expect(result.reason).toEqual('Sick leave');
  });

  it('should save attendance to database', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-18'),
      status: 'present',
      reason: null
    };

    const result = await recordAttendance(testInput);

    // Query the database to verify record was saved
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, result.id))
      .execute();

    expect(attendanceRecords).toHaveLength(1);
    expect(attendanceRecords[0].student_id).toEqual(testStudentId);
    expect(attendanceRecords[0].date).toEqual('2024-01-18'); // Database stores as string
    expect(attendanceRecords[0].status).toEqual('present');
    expect(attendanceRecords[0].reason).toBeNull();
    expect(attendanceRecords[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent student', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: 99999, // Non-existent student ID
      date: new Date('2024-01-19'),
      status: 'present',
      reason: null
    };

    await expect(recordAttendance(testInput)).rejects.toThrow(/Student with ID 99999 does not exist/i);
  });

  it('should throw error for duplicate attendance record', async () => {
    const testInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-20'),
      status: 'present',
      reason: null
    };

    // Record attendance first time
    await recordAttendance(testInput);

    // Attempt to record attendance for same student and date
    const duplicateInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-20'),
      status: 'absent',
      reason: 'Changed status'
    };

    await expect(recordAttendance(duplicateInput)).rejects.toThrow(/Attendance record already exists/i);
  });

  it('should allow multiple students on same date', async () => {
    // Create second student
    const secondStudentResult = await db.insert(studentsTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '098-765-4321',
        date_of_birth: '1999-03-22',
        enrollment_date: '2023-09-01'
      })
      .returning()
      .execute();
    
    const secondStudentId = secondStudentResult[0].id;
    const sameDate = new Date('2024-01-21');

    // Record attendance for first student
    const firstInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: sameDate,
      status: 'present',
      reason: null
    };

    // Record attendance for second student on same date
    const secondInput: RecordAttendanceInput = {
      student_id: secondStudentId,
      date: sameDate,
      status: 'late',
      reason: 'Bus delay'
    };

    const firstResult = await recordAttendance(firstInput);
    const secondResult = await recordAttendance(secondInput);

    expect(firstResult.student_id).toEqual(testStudentId);
    expect(firstResult.status).toEqual('present');
    expect(secondResult.student_id).toEqual(secondStudentId);
    expect(secondResult.status).toEqual('late');
    expect(firstResult.date).toEqual(secondResult.date);
  });

  it('should allow same student on different dates', async () => {
    const firstInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-22'),
      status: 'present',
      reason: null
    };

    const secondInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-23'),
      status: 'absent',
      reason: 'Medical appointment'
    };

    const firstResult = await recordAttendance(firstInput);
    const secondResult = await recordAttendance(secondInput);

    expect(firstResult.student_id).toEqual(testStudentId);
    expect(secondResult.student_id).toEqual(testStudentId);
    expect(firstResult.status).toEqual('present');
    expect(secondResult.status).toEqual('absent');
    expect(firstResult.date).not.toEqual(secondResult.date);
  });

  it('should validate attendance status enum values', async () => {
    const presentInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-24'),
      status: 'present',
      reason: null
    };

    const lateInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-25'),
      status: 'late',
      reason: 'Traffic'
    };

    const absentInput: RecordAttendanceInput = {
      student_id: testStudentId,
      date: new Date('2024-01-26'),
      status: 'absent',
      reason: 'Sick'
    };

    const presentResult = await recordAttendance(presentInput);
    const lateResult = await recordAttendance(lateInput);
    const absentResult = await recordAttendance(absentInput);

    expect(presentResult.status).toEqual('present');
    expect(lateResult.status).toEqual('late');
    expect(absentResult.status).toEqual('absent');
  });
});