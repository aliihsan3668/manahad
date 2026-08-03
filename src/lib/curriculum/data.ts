/**
 * MANAHAD — Curriculum Data
 *
 * Multi-curriculum, multi-grade topic tree.
 * Each topic includes:
 *   - learning objective
 *   - Bloom's taxonomy level
 *   - estimated difficulty (1-5)
 *   - prerequisites (slugs)
 *
 * Currently populated for Grade 6 across all curricula (Pakistan, Cambridge,
 * IB, Common Core, CBSE). Architecture supports adding K-12 by appending
 * more topics here — no code changes needed.
 */

import type { BloomsLevel, CurriculumCode } from "@/lib/types";

export interface CurriculumTopicDef {
  slug: string;
  name: string;
  description: string;
  difficulty: number;
  learningObjective: string;
  bloomsLevel: BloomsLevel;
  estimatedMinutes: number;
  prerequisites: string[];
  gradeLevel: number;
  appliesTo: CurriculumCode[]; // which curricula include this topic
}

export interface CurriculumDef {
  code: CurriculumCode;
  name: string;
  description: string;
  region: string;
}

export const CURRICULA: CurriculumDef[] = [
  { code: "PAK-NATIONAL", name: "Pakistan National Curriculum", description: "Single National Curriculum (SNC) for Pakistan", region: "Pakistan" },
  { code: "CAMBRIDGE", name: "Cambridge Primary / Lower Secondary", description: "Cambridge Assessment International Education", region: "Global" },
  { code: "IB", name: "International Baccalaureate (PYP / MYP)", description: "IB Primary and Middle Years Programme", region: "Global" },
  { code: "COMMON-CORE", name: "US Common Core State Standards", description: "Mathematics standards adopted across US states", region: "United States" },
  { code: "CBSE", name: "CBSE (India) Mathematics", description: "Central Board of Secondary Education, India", region: "India" },
];

// ============================================================
// GRADE 6 TOPICS
// (Designed to be the union of all 5 curricula's grade 6 math topics.
//  Each topic tags which curricula include it.)
// ============================================================

const ALL_CURRICULA: CurriculumCode[] = ["PAK-NATIONAL", "CAMBRIDGE", "IB", "COMMON-CORE", "CBSE"];

export const GRADE_6_TOPICS: CurriculumTopicDef[] = [
  // ===== Numbers & Place Value =====
  {
    slug: "g6-place-value",
    name: "Place Value & Large Numbers",
    description: "Read, write, and compare numbers up to 1,000,000.",
    difficulty: 1,
    learningObjective: "Identify the place value of digits in numbers up to 1,000,000 and compare two multi-digit numbers.",
    bloomsLevel: "UNDERSTAND",
    estimatedMinutes: 8,
    prerequisites: [],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-negative-numbers",
    name: "Integers & Negative Numbers",
    description: "Understand positive and negative integers on the number line.",
    difficulty: 2,
    learningObjective: "Use positive and negative integers to represent quantities in real-world contexts.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 10,
    prerequisites: ["g6-place-value"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-factors-multiples",
    name: "Factors, Multiples & Primes",
    description: "Find factors, multiples, GCF, LCM, and identify prime numbers.",
    difficulty: 3,
    learningObjective: "Find the greatest common factor (GCF) and least common multiple (LCM) of two whole numbers.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-place-value"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Operations =====
  {
    slug: "g6-addition-subtraction",
    name: "Multi-Digit Addition & Subtraction",
    description: "Fluently add and subtract multi-digit whole numbers and decimals.",
    difficulty: 1,
    learningObjective: "Fluently add and subtract multi-digit decimals using the standard algorithm.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 8,
    prerequisites: ["g6-place-value"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-multiplication",
    name: "Multiplication",
    description: "Multiply multi-digit whole numbers and decimals.",
    difficulty: 2,
    learningObjective: "Fluently multiply multi-digit whole numbers and decimals.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 10,
    prerequisites: ["g6-addition-subtraction"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-division",
    name: "Division",
    description: "Divide multi-digit numbers; interpret remainders.",
    difficulty: 3,
    learningObjective: "Fluently divide multi-digit numbers and interpret remainders in context.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-multiplication"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Fractions =====
  {
    slug: "g6-fractions-understanding",
    name: "Understanding Fractions",
    description: "Equivalent fractions, simplifying, comparing.",
    difficulty: 2,
    learningObjective: "Generate equivalent fractions and compare fractions with different denominators.",
    bloomsLevel: "UNDERSTAND",
    estimatedMinutes: 10,
    prerequisites: ["g6-division"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-fractions-operations",
    name: "Adding & Subtracting Fractions",
    description: "Add and subtract fractions with unlike denominators and mixed numbers.",
    difficulty: 4,
    learningObjective: "Add and subtract fractions with unlike denominators (including mixed numbers).",
    bloomsLevel: "APPLY",
    estimatedMinutes: 14,
    prerequisites: ["g6-fractions-understanding"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-fractions-multiply-divide",
    name: "Multiplying & Dividing Fractions",
    description: "Multiply and divide fractions and mixed numbers.",
    difficulty: 4,
    learningObjective: "Multiply and divide fractions and mixed numbers, including in word problems.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 15,
    prerequisites: ["g6-fractions-operations"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Decimals & Percentages =====
  {
    slug: "g6-decimals",
    name: "Decimals",
    description: "Place value of decimals, compare, round, and convert to fractions.",
    difficulty: 2,
    learningObjective: "Read, write, compare, and round decimals to thousandths.",
    bloomsLevel: "UNDERSTAND",
    estimatedMinutes: 10,
    prerequisites: ["g6-place-value"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-percentages",
    name: "Percentages",
    description: "Convert between fractions, decimals, and percentages; find percentages of quantities.",
    difficulty: 3,
    learningObjective: "Find a percent of a quantity and convert between fractions, decimals, and percents.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-decimals", "g6-fractions-understanding"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Ratios & Proportions =====
  {
    slug: "g6-ratios",
    name: "Ratios & Rates",
    description: "Understand ratio concepts and use ratio language.",
    difficulty: 3,
    learningObjective: "Understand the concept of a ratio and use ratio language to describe relationships.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-fractions-understanding"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-proportions",
    name: "Proportions",
    description: "Solve proportion problems including unit conversion.",
    difficulty: 4,
    learningObjective: "Solve proportions and use them to solve real-world problems.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 14,
    prerequisites: ["g6-ratios"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Algebra =====
  {
    slug: "g6-algebra-expressions",
    name: "Algebraic Expressions",
    description: "Write, read, and evaluate expressions with variables.",
    difficulty: 3,
    learningObjective: "Write and evaluate numerical expressions involving whole-number exponents and variables.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-multiplication"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-algebra-equations",
    name: "One-Variable Equations",
    description: "Solve one-step and two-step equations.",
    difficulty: 4,
    learningObjective: "Solve one-step and two-step equations of the form x + p = q and px = q.",
    bloomsLevel: "ANALYZE",
    estimatedMinutes: 15,
    prerequisites: ["g6-algebra-expressions"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Geometry & Measurement =====
  {
    slug: "g6-area-perimeter",
    name: "Area & Perimeter",
    description: "Find area and perimeter of triangles, parallelograms, and composite shapes.",
    difficulty: 3,
    learningObjective: "Find the area of triangles, parallelograms, and composite figures.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-multiplication"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-volume",
    name: "Volume",
    description: "Find volume of rectangular prisms with fractional edge lengths.",
    difficulty: 4,
    learningObjective: "Find the volume of a right rectangular prism with fractional edge lengths.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 14,
    prerequisites: ["g6-area-perimeter", "g6-fractions-multiply-divide"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-angles",
    name: "Angles",
    description: "Measure, draw, and find unknown angles in triangles and on a line.",
    difficulty: 3,
    learningObjective: "Find unknown angles in triangles and on straight lines using angle properties.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 11,
    prerequisites: ["g6-addition-subtraction"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-coordinate-plane",
    name: "Coordinate Plane",
    description: "Plot points and draw polygons on the coordinate plane.",
    difficulty: 2,
    learningObjective: "Plot points on the coordinate plane and solve real-world problems.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 10,
    prerequisites: ["g6-negative-numbers"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Statistics & Probability =====
  {
    slug: "g6-statistics",
    name: "Statistics: Mean, Median, Mode",
    description: "Calculate measures of center and variability; display data.",
    difficulty: 3,
    learningObjective: "Calculate mean, median, mode, and range of a data set.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-addition-subtraction", "g6-division"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-probability",
    name: "Probability",
    description: "Understand and calculate basic probabilities as fractions.",
    difficulty: 3,
    learningObjective: "Calculate the probability of a simple event as a fraction, decimal, or percent.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 11,
    prerequisites: ["g6-fractions-understanding"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },

  // ===== Applied Math =====
  {
    slug: "g6-money",
    name: "Money & Financial Literacy",
    description: "Calculate totals, change, discounts, and simple interest.",
    difficulty: 3,
    learningObjective: "Solve real-world money problems including discounts and simple interest.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-percentages", "g6-decimals"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-time",
    name: "Time & Speed",
    description: "Convert time units; solve speed, distance, time problems.",
    difficulty: 3,
    learningObjective: "Solve problems involving speed, distance, and time.",
    bloomsLevel: "APPLY",
    estimatedMinutes: 12,
    prerequisites: ["g6-division"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
  {
    slug: "g6-word-problems",
    name: "Multi-Step Word Problems",
    description: "Solve complex multi-step word problems using all operations.",
    difficulty: 5,
    learningObjective: "Solve multi-step real-world problems using all four operations with whole numbers, fractions, and decimals.",
    bloomsLevel: "ANALYZE",
    estimatedMinutes: 18,
    prerequisites: ["g6-fractions-operations", "g6-decimals", "g6-division"],
    gradeLevel: 6,
    appliesTo: ALL_CURRICULA,
  },
];

// ============================================================
// HELPERS
// ============================================================

export function getTopicsForCurriculum(code: CurriculumCode): CurriculumTopicDef[] {
  return GRADE_6_TOPICS.filter((t) => t.appliesTo.includes(code));
}

export function getTopicBySlug(slug: string): CurriculumTopicDef | undefined {
  return GRADE_6_TOPICS.find((t) => t.slug === slug);
}

export function getTopicsForGrade(gradeLevel: number): CurriculumTopicDef[] {
  return GRADE_6_TOPICS.filter((t) => t.gradeLevel === gradeLevel);
}

// ============================================================
// FUTURE GRADES (placeholder data structure)
// Add K, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12 here in future iterations.
// Architecture already supports it — just append more arrays.
// ============================================================
