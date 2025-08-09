import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type CreateSubjectInput } from '../schema';
import { createSubject } from '../handlers/create_subject';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateSubjectInput = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  description: 'Basic concepts of programming and computer science',
  credits: 3
};

const minimalTestInput: CreateSubjectInput = {
  name: 'Mathematics',
  code: 'MATH101',
  description: null,
  credits: 4
};

describe('createSubject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a subject with all fields', async () => {
    const result = await createSubject(testInput);

    // Validate returned subject structure
    expect(result.name).toEqual('Introduction to Computer Science');
    expect(result.code).toEqual('CS101');
    expect(result.description).toEqual('Basic concepts of programming and computer science');
    expect(result.credits).toEqual(3);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a subject with null description', async () => {
    const result = await createSubject(minimalTestInput);

    expect(result.name).toEqual('Mathematics');
    expect(result.code).toEqual('MATH101');
    expect(result.description).toBeNull();
    expect(result.credits).toEqual(4);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save subject to database', async () => {
    const result = await createSubject(testInput);

    // Query database to verify persistence
    const subjects = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, result.id))
      .execute();

    expect(subjects).toHaveLength(1);
    expect(subjects[0].name).toEqual('Introduction to Computer Science');
    expect(subjects[0].code).toEqual('CS101');
    expect(subjects[0].description).toEqual('Basic concepts of programming and computer science');
    expect(subjects[0].credits).toEqual(3);
    expect(subjects[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate subject codes', async () => {
    // Create first subject
    await createSubject(testInput);

    // Attempt to create another subject with the same code
    const duplicateInput: CreateSubjectInput = {
      name: 'Advanced Computer Science',
      code: 'CS101', // Same code as first subject
      description: 'Advanced topics in computer science',
      credits: 4
    };

    await expect(createSubject(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different subjects with different codes', async () => {
    // Create first subject
    const firstSubject = await createSubject(testInput);

    // Create second subject with different code
    const secondInput: CreateSubjectInput = {
      name: 'Data Structures',
      code: 'CS102',
      description: 'Study of data structures and algorithms',
      credits: 3
    };

    const secondSubject = await createSubject(secondInput);

    expect(firstSubject.code).toEqual('CS101');
    expect(secondSubject.code).toEqual('CS102');
    expect(firstSubject.id).not.toEqual(secondSubject.id);

    // Verify both subjects exist in database
    const allSubjects = await db.select().from(subjectsTable).execute();
    expect(allSubjects).toHaveLength(2);
  });

  it('should handle subject codes with different cases', async () => {
    // Create subject with uppercase code
    await createSubject(testInput);

    // Attempt to create subject with same code in different case
    const caseVariantInput: CreateSubjectInput = {
      name: 'Computer Science Fundamentals',
      code: 'cs101', // lowercase version
      description: 'Basic computer science concepts',
      credits: 3
    };

    // Should allow different cases (database is case-sensitive for text fields)
    const result = await createSubject(caseVariantInput);
    expect(result.code).toEqual('cs101');

    // Verify both subjects exist
    const allSubjects = await db.select().from(subjectsTable).execute();
    expect(allSubjects).toHaveLength(2);
  });

  it('should handle various credit values correctly', async () => {
    const creditTestCases = [1, 2, 3, 4, 5, 6];

    for (const credits of creditTestCases) {
      const input: CreateSubjectInput = {
        name: `Test Subject ${credits}`,
        code: `TEST${credits}`,
        description: `Test subject with ${credits} credits`,
        credits: credits
      };

      const result = await createSubject(input);
      expect(result.credits).toEqual(credits);
      expect(typeof result.credits).toBe('number');
    }
  });

  it('should preserve timestamp accuracy', async () => {
    const beforeCreation = new Date();
    const result = await createSubject(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});