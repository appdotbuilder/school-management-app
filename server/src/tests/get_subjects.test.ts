import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type CreateSubjectInput } from '../schema';
import { getSubjects } from '../handlers/get_subjects';

// Test subjects data
const testSubjects: CreateSubjectInput[] = [
  {
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Introduction to Mathematics',
    credits: 3
  },
  {
    name: 'Physics',
    code: 'PHYS101',
    description: 'Introduction to Physics',
    credits: 4
  },
  {
    name: 'Chemistry',
    code: 'CHEM101',
    description: null,
    credits: 3
  }
];

describe('getSubjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no subjects exist', async () => {
    const result = await getSubjects();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all subjects', async () => {
    // Create test subjects
    await db.insert(subjectsTable)
      .values(testSubjects)
      .execute();

    const result = await getSubjects();

    expect(result).toHaveLength(3);
    
    // Verify each subject has correct structure and data
    const mathSubject = result.find(s => s.code === 'MATH101');
    expect(mathSubject).toBeDefined();
    expect(mathSubject!.name).toEqual('Mathematics');
    expect(mathSubject!.description).toEqual('Introduction to Mathematics');
    expect(mathSubject!.credits).toEqual(3);
    expect(mathSubject!.id).toBeDefined();
    expect(mathSubject!.created_at).toBeInstanceOf(Date);

    const physicsSubject = result.find(s => s.code === 'PHYS101');
    expect(physicsSubject).toBeDefined();
    expect(physicsSubject!.name).toEqual('Physics');
    expect(physicsSubject!.credits).toEqual(4);

    const chemSubject = result.find(s => s.code === 'CHEM101');
    expect(chemSubject).toBeDefined();
    expect(chemSubject!.description).toBeNull();
    expect(chemSubject!.credits).toEqual(3);
  });

  it('should return subjects in database insertion order', async () => {
    // Insert subjects one by one to ensure predictable order
    for (const subject of testSubjects) {
      await db.insert(subjectsTable)
        .values(subject)
        .execute();
    }

    const result = await getSubjects();

    expect(result).toHaveLength(3);
    // Verify order matches insertion order (by ID ascending)
    expect(result[0].code).toEqual('MATH101');
    expect(result[1].code).toEqual('PHYS101');
    expect(result[2].code).toEqual('CHEM101');
    
    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle nullable description field correctly', async () => {
    // Insert subject with null description
    const subjectWithNullDesc = {
      name: 'Biology',
      code: 'BIO101',
      description: null,
      credits: 2
    };

    await db.insert(subjectsTable)
      .values(subjectWithNullDesc)
      .execute();

    const result = await getSubjects();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toEqual('Biology');
    expect(result[0].credits).toEqual(2);
  });

  it('should include all required subject fields', async () => {
    await db.insert(subjectsTable)
      .values(testSubjects[0])
      .execute();

    const result = await getSubjects();

    expect(result).toHaveLength(1);
    const subject = result[0];

    // Verify all required fields are present
    expect(subject.id).toBeDefined();
    expect(typeof subject.id).toBe('number');
    expect(subject.name).toBeDefined();
    expect(typeof subject.name).toBe('string');
    expect(subject.code).toBeDefined();
    expect(typeof subject.code).toBe('string');
    expect(subject.credits).toBeDefined();
    expect(typeof subject.credits).toBe('number');
    expect(subject.created_at).toBeDefined();
    expect(subject.created_at).toBeInstanceOf(Date);
    
    // Description can be null or string
    expect(typeof subject.description === 'string' || subject.description === null).toBe(true);
  });
});