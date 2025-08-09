import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type CreateStudentInput } from '../schema';
import { createStudent } from '../handlers/create_student';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateStudentInput = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  date_of_birth: new Date('1995-06-15'),
  enrollment_date: new Date('2024-01-15')
};

// Test input with minimal required fields
const minimalInput: CreateStudentInput = {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@example.com',
  phone: null,
  date_of_birth: new Date('1996-03-22')
  // enrollment_date is optional and will use default
};

describe('createStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student with all fields', async () => {
    const result = await createStudent(testInput);

    // Basic field validation
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.date_of_birth).toEqual(new Date('1995-06-15'));
    expect(result.enrollment_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a student with minimal required fields', async () => {
    const result = await createStudent(minimalInput);

    // Basic field validation
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.phone).toBeNull();
    expect(result.date_of_birth).toEqual(new Date('1996-03-22'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.enrollment_date).toBeInstanceOf(Date); // Should have default value
  });

  it('should save student to database', async () => {
    const result = await createStudent(testInput);

    // Query database to verify student was saved
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, result.id))
      .execute();

    expect(students).toHaveLength(1);
    expect(students[0].first_name).toEqual('John');
    expect(students[0].last_name).toEqual('Doe');
    expect(students[0].email).toEqual('john.doe@example.com');
    expect(students[0].phone).toEqual('+1234567890');
    expect(new Date(students[0].date_of_birth)).toEqual(new Date('1995-06-15'));
    expect(new Date(students[0].enrollment_date)).toEqual(new Date('2024-01-15'));
    expect(students[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first student
    await createStudent(testInput);

    // Attempt to create another student with same email
    const duplicateInput: CreateStudentInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(createStudent(duplicateInput))
      .rejects
      .toThrow(/already exists/i);
  });

  it('should handle null phone numbers correctly', async () => {
    const nullPhoneInput: CreateStudentInput = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test.user@example.com',
      phone: null,
      date_of_birth: new Date('1990-01-01'),
      enrollment_date: new Date('2024-02-01')
    };

    const result = await createStudent(nullPhoneInput);

    expect(result.phone).toBeNull();

    // Verify in database
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, result.id))
      .execute();

    expect(students[0].phone).toBeNull();
  });

  it('should use current date as default for enrollment_date when not provided', async () => {
    const inputWithoutEnrollment: CreateStudentInput = {
      first_name: 'Auto',
      last_name: 'Enrolled',
      email: 'auto.enrolled@example.com',
      phone: null,
      date_of_birth: new Date('1992-12-25')
      // No enrollment_date provided
    };

    const result = await createStudent(inputWithoutEnrollment);

    expect(result.enrollment_date).toBeInstanceOf(Date);
    
    // Check that it's reasonably close to current date (within 24 hours)
    const now = new Date();
    const timeDifference = Math.abs(result.enrollment_date.getTime() - now.getTime());
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    expect(timeDifference).toBeLessThan(twentyFourHoursInMs);
  });

  it('should handle different date formats correctly', async () => {
    const dateInput: CreateStudentInput = {
      first_name: 'Date',
      last_name: 'Test',
      email: 'date.test@example.com',
      phone: '555-0123',
      date_of_birth: new Date('2000-12-31'),
      enrollment_date: new Date('2023-09-01')
    };

    const result = await createStudent(dateInput);

    expect(result.date_of_birth).toEqual(new Date('2000-12-31'));
    expect(result.enrollment_date).toEqual(new Date('2023-09-01'));

    // Verify dates are stored correctly in database
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, result.id))
      .execute();

    expect(new Date(students[0].date_of_birth)).toEqual(new Date('2000-12-31'));
    expect(new Date(students[0].enrollment_date)).toEqual(new Date('2023-09-01'));
  });
});