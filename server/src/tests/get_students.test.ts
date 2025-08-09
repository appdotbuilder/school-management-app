import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable } from '../db/schema';
import { getStudents } from '../handlers/get_students';

describe('getStudents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no students exist', async () => {
    const result = await getStudents();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all students when they exist', async () => {
    // Create test students
    const testStudents = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        date_of_birth: '1995-05-15',
        enrollment_date: '2023-09-01'
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: null,
        date_of_birth: '1996-08-20',
        enrollment_date: '2023-09-01'
      },
      {
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@example.com',
        phone: '987-654-3210',
        date_of_birth: '1994-12-03',
        enrollment_date: '2023-08-15'
      }
    ];

    await db.insert(studentsTable)
      .values(testStudents)
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(3);
    expect(Array.isArray(result)).toBe(true);

    // Check that all required fields are present
    result.forEach(student => {
      expect(student.id).toBeDefined();
      expect(typeof student.id).toBe('number');
      expect(student.first_name).toBeDefined();
      expect(student.last_name).toBeDefined();
      expect(student.email).toBeDefined();
      expect(student.date_of_birth).toBeInstanceOf(Date);
      expect(student.enrollment_date).toBeInstanceOf(Date);
      expect(student.created_at).toBeInstanceOf(Date);
    });

    // Check specific student data
    const johnDoe = result.find(s => s.email === 'john.doe@example.com');
    expect(johnDoe).toBeDefined();
    expect(johnDoe!.first_name).toBe('John');
    expect(johnDoe!.last_name).toBe('Doe');
    expect(johnDoe!.phone).toBe('123-456-7890');

    // Check nullable field handling
    const janeSmith = result.find(s => s.email === 'jane.smith@example.com');
    expect(janeSmith).toBeDefined();
    expect(janeSmith!.phone).toBeNull();
  });

  it('should return students in consistent order', async () => {
    // Create test students with different creation times
    await db.insert(studentsTable)
      .values({
        first_name: 'First',
        last_name: 'Student',
        email: 'first@example.com',
        date_of_birth: '1995-01-01',
        enrollment_date: '2023-09-01'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(studentsTable)
      .values({
        first_name: 'Second',
        last_name: 'Student',
        email: 'second@example.com',
        date_of_birth: '1995-01-01',
        enrollment_date: '2023-09-01'
      })
      .execute();

    const result1 = await getStudents();
    const result2 = await getStudents();

    // Results should be consistent between calls
    expect(result1).toHaveLength(2);
    expect(result2).toHaveLength(2);
    expect(result1[0].id).toBe(result2[0].id);
    expect(result1[1].id).toBe(result2[1].id);
  });

  it('should handle large number of students', async () => {
    // Create multiple students to test performance
    const manyStudents = Array.from({ length: 50 }, (_, i) => ({
      first_name: `Student${i}`,
      last_name: `Last${i}`,
      email: `student${i}@example.com`,
      phone: i % 2 === 0 ? `555-000-${i.toString().padStart(4, '0')}` : null,
      date_of_birth: '1995-01-01',
      enrollment_date: '2023-09-01'
    }));

    await db.insert(studentsTable)
      .values(manyStudents)
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(50);
    expect(result.every(s => s.id !== undefined)).toBe(true);
    expect(result.every(s => s.first_name.startsWith('Student'))).toBe(true);
  });

  it('should handle date fields correctly', async () => {
    const testDate = new Date('1995-06-15');
    const enrollmentDate = new Date('2023-09-01');

    await db.insert(studentsTable)
      .values({
        first_name: 'Test',
        last_name: 'Student',
        email: 'test@example.com',
        date_of_birth: testDate.toISOString().split('T')[0],
        enrollment_date: enrollmentDate.toISOString().split('T')[0]
      })
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(1);
    const student = result[0];

    // Verify dates are properly converted to Date objects
    expect(student.date_of_birth).toBeInstanceOf(Date);
    expect(student.enrollment_date).toBeInstanceOf(Date);
    expect(student.created_at).toBeInstanceOf(Date);

    // Check date values (comparing date parts only due to timezone handling)
    expect(student.date_of_birth.getFullYear()).toBe(1995);
    expect(student.date_of_birth.getMonth()).toBe(5); // 0-indexed
    expect(student.date_of_birth.getDate()).toBe(15);
  });
});