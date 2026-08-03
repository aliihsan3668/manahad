/**
 * MANAHAD — AI Question Generator
 *
 * Generates unlimited math questions per topic using LLM, then validates
 * them with the deterministic grading engine to ensure the expected answer
 * is parseable. If generation fails, falls back to a deterministic template-based
 * generator so the platform never stalls.
 *
 * Each generated question includes:
 *   - curriculum, grade, topic, subtopic
 *   - learning objective, Bloom's taxonomy level
 *   - estimated difficulty + estimated solve time
 *   - correct answer + accepted equivalent answers
 *   - explanation, hint, common mistakes
 *   - randomized scenario (names, numbers, contexts)
 */

import type { GeneratedQuestion, QuestionType } from "@/lib/types";
import { askAIForJSON } from "@/lib/ai/provider";
import { getTopicBySlug } from "@/lib/curriculum/data";
import { gradeAnswer } from "@/lib/math/grading";

// ============================================================
// RANDOMIZATION HELPERS
// ============================================================

// Diverse, inclusive name pool
const NAMES = [
  "Aisha", "Bilal", "Chen", "Dawood", "Elena", "Fatima", "Gabriel", "Hina",
  "Ibrahim", "Jasmin", "Khalid", "Leila", "Mateo", "Nadia", "Omar", "Priya",
  "Qasim", "Rabia", "Sami", "Tariq", "Uma", "Vikram", "Wendy", "Xander",
  "Yasmin", "Zainab", "Ali", "Bao", "Cleo", "Dev", "Esme", "Farhan",
];

const SCENARIOS = [
  "at the school fair",
  "during recess",
  "in the science lab",
  "at the local market",
  "on a field trip",
  "in the school garden",
  "during art class",
  "at the library",
  "in the cafeteria",
  "on the playground",
  "at the bake sale",
  "during the math competition",
  "in the robotics club",
  "at the sports day",
];

const OBJECTS = [
  "stickers", "marbles", "pencils", "books", "cards", "coins",
  "apples", "oranges", "cupcakes", "cookies", "balloons", "stickers",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

// ============================================================
// FALLBACK TEMPLATE GENERATOR
// (Used when AI is unavailable — guarantees the platform always works)
// ============================================================

function generateFromTemplate(
  topicSlug: string,
  difficulty: number
): GeneratedQuestion {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) throw new Error(`Unknown topic: ${topicSlug}`);

  const name = pick(NAMES);
  const scenario = pick(SCENARIOS);
  const object = pick(OBJECTS);

  let prompt = "";
  let correctAnswer = "";
  let explanation = "";
  let hint = "";
  let questionType: QuestionType = "NUMERIC";
  let choices: string[] | undefined;
  let acceptedAnswers: string[] = [];

  switch (topicSlug) {
    case "g6-place-value": {
      const n = randomInt(1000, 999999);
      const digit = String(n)[randomInt(0, String(n).length - 1)];
      const place = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands"][String(n).length - 1 - String(n).indexOf(digit)];
      prompt = `In the number ${n}, what is the place value of the digit ${digit}?`;
      correctAnswer = place;
      acceptedAnswers = [place, place.replace(" ", "-")];
      explanation = `The digit ${digit} in ${n} is in the ${place} place.`;
      hint = `Count positions from right to left: ones, tens, hundreds...`;
      questionType = "MULTIPLE_CHOICE";
      choices = [place, "ones", "tens", "hundreds"].sort(() => Math.random() - 0.5);
      break;
    }
    case "g6-addition-subtraction": {
      const a = randomInt(1000, 9999);
      const b = randomInt(1000, 9999);
      const op = difficulty >= 3 ? "-" : "+";
      if (op === "+") {
        prompt = `${name} has ${a.toLocaleString()} ${object} ${scenario}. A friend gives them ${b.toLocaleString()} more. How many ${object} does ${name} have now?`;
        correctAnswer = String(a + b);
        explanation = `${a} + ${b} = ${a + b}`;
      } else {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        prompt = `${name} had ${big.toLocaleString()} ${object}. They gave away ${small.toLocaleString()}. How many do they have left?`;
        correctAnswer = String(big - small);
        explanation = `${big} - ${small} = ${big - small}`;
      }
      hint = `Set up the equation carefully and align the place values.`;
      break;
    }
    case "g6-multiplication": {
      const a = difficulty >= 3 ? randomInt(12, 99) : randomInt(2, 12);
      const b = difficulty >= 3 ? randomInt(2, 12) : randomInt(100, 999);
      prompt = `${name} is arranging ${object} into ${a} rows of ${b}. How many ${object} are there in total?`;
      correctAnswer = String(a * b);
      explanation = `${a} × ${b} = ${a * b}`;
      hint = `Multiplication is repeated addition.`;
      break;
    }
    case "g6-division": {
      const b = randomInt(2, 12);
      const q = randomInt(10, 99);
      const dividend = b * q;
      prompt = `${name} has ${dividend} ${object} and wants to share them equally among ${b} friends. How many ${object} does each friend get?`;
      correctAnswer = String(q);
      explanation = `${dividend} ÷ ${b} = ${q}`;
      hint = `Divide the total by the number of friends.`;
      break;
    }
    case "g6-fractions-understanding": {
      const den = randomInt(4, 12);
      const num = randomInt(1, den - 1);
      const scale = randomInt(2, 5);
      prompt = `Write the fraction equivalent to ${num}/${den} with denominator ${den * scale}.`;
      correctAnswer = `${num * scale}/${den * scale}`;
      acceptedAnswers = [`${num * scale}/${den * scale}`, `${num}/${den}`];
      explanation = `Multiply both numerator and denominator by ${scale}: (${num}×${scale})/(${den}×${scale}) = ${num * scale}/${den * scale}`;
      hint = `Whatever you multiply the denominator by, multiply the numerator by the same number.`;
      questionType = "FRACTION";
      break;
    }
    case "g6-fractions-operations": {
      const d1 = randomInt(2, 8);
      let d2 = randomInt(2, 8);
      while (d2 === d1) d2 = randomInt(2, 8);
      const n1 = randomInt(1, d1 - 1);
      const n2 = randomInt(1, d2 - 1);
      const lcm = (d1 * d2) / gcd(d1, d2);
      const resultN = n1 * (lcm / d1) + n2 * (lcm / d2);
      prompt = `${name} ate ${n1}/${d1} of a pizza and ${n2}/${d2} of another pizza ${scenario}. How much pizza did ${name} eat in total? (Give your answer as a fraction)`;
      correctAnswer = `${resultN}/${lcm}`;
      acceptedAnswers = [`${resultN}/${lcm}`, (resultN / lcm).toFixed(4).replace(/\.?0+$/, "")];
      explanation = `Find a common denominator: ${d1} and ${d2} share LCM ${lcm}. So ${n1}/${d1} = ${n1 * (lcm / d1)}/${lcm} and ${n2}/${d2} = ${n2 * (lcm / d2)}/${lcm}. Add: ${resultN}/${lcm}.`;
      hint = `Find a common denominator first, then add the numerators.`;
      questionType = "FRACTION";
      break;
    }
    case "g6-fractions-multiply-divide": {
      const n1 = randomInt(1, 5);
      const d1 = randomInt(2, 8);
      const n2 = randomInt(1, 5);
      const d2 = randomInt(2, 8);
      prompt = `${name} has ${n1}/${d1} of a ${object.slice(0, -1)} and uses ${n2}/${d2} of it. What fraction of the whole ${object.slice(0, -1)} was used?`;
      correctAnswer = `${n1 * n2}/${d1 * d2}`;
      acceptedAnswers = [`${n1 * n2}/${d1 * d2}`, ((n1 * n2) / (d1 * d2)).toFixed(4).replace(/\.?0+$/, "")];
      explanation = `Multiply numerators: ${n1} × ${n2} = ${n1 * n2}. Multiply denominators: ${d1} × ${d2} = ${d1 * d2}. Result: ${n1 * n2}/${d1 * d2}.`;
      hint = `Multiply the tops together, multiply the bottoms together.`;
      questionType = "FRACTION";
      break;
    }
    case "g6-decimals": {
      const a = randomFloat(1, 99.99, 2);
      const b = randomFloat(1, 99.99, 2);
      prompt = `${name} bought items costing $${a.toFixed(2)} and $${b.toFixed(2)} ${scenario}. What is the total cost?`;
      correctAnswer = (a + b).toFixed(2);
      acceptedAnswers = [(a + b).toFixed(2), String(a + b)];
      explanation = `Add: ${a} + ${b} = ${(a + b).toFixed(2)}`;
      hint = `Line up the decimal points before adding.`;
      break;
    }
    case "g6-percentages": {
      const pct = pick([10, 20, 25, 50, 75, 15, 30]);
      const base = pick([100, 200, 80, 60, 40, 120, 240]);
      const result = (pct / 100) * base;
      prompt = `${name} has $${base}. They spend ${pct}% of it ${scenario}. How much did they spend?`;
      correctAnswer = String(result);
      acceptedAnswers = [String(result), `$${result}`, `${result}.00`];
      explanation = `${pct}% of $${base} = (${pct}/100) × ${base} = ${result}`;
      hint = `Convert the percentage to a decimal, then multiply.`;
      break;
    }
    case "g6-ratios": {
      const a = randomInt(2, 9);
      const b = randomInt(2, 9);
      const scale = randomInt(2, 6);
      prompt = `The ratio of cats to dogs ${scenario} is ${a}:${b}. If there are ${b * scale} dogs, how many cats are there?`;
      correctAnswer = String(a * scale);
      explanation = `If dogs = ${b * scale}, the multiplier is ${b * scale}/${b} = ${scale}. So cats = ${a} × ${scale} = ${a * scale}.`;
      hint = `Find what you multiply the dog ratio by, then apply it to the cat ratio.`;
      break;
    }
    case "g6-proportions": {
      const a = randomInt(2, 8);
      const b = randomInt(2, 8);
      const c = randomInt(2, 8);
      prompt = `If ${a} ${object} cost $${b * 10}, how much do ${c} ${object} cost?`;
      const unitPrice = (b * 10) / a;
      const total = unitPrice * c;
      correctAnswer = String(Math.round(total));
      acceptedAnswers = [String(Math.round(total)), `$${Math.round(total)}`];
      explanation = `Unit price = $${b * 10}/${a} = $${unitPrice.toFixed(2)}. So ${c} ${object} cost $${unitPrice.toFixed(2)} × ${c} = $${Math.round(total)}.`;
      hint = `Find the cost of ONE ${object.slice(0, -1)} first, then multiply.`;
      break;
    }
    case "g6-algebra-expressions": {
      const x = randomInt(2, 12);
      const coef = randomInt(2, 9);
      const constant = randomInt(1, 20);
      prompt = `Evaluate ${coef}x + ${constant} when x = ${x}.`;
      correctAnswer = String(coef * x + constant);
      explanation = `Substitute x = ${x}: ${coef}×${x} + ${constant} = ${coef * x} + ${constant} = ${coef * x + constant}.`;
      hint = `Substitute the value of x, then follow order of operations.`;
      break;
    }
    case "g6-algebra-equations": {
      const x = randomInt(2, 20);
      const coef = difficulty >= 4 ? randomInt(2, 6) : 1;
      const constant = randomInt(1, 30);
      const result = coef * x + constant;
      prompt = `Solve for x: ${coef === 1 ? "" : coef}x ${constant >= 0 ? "+" : "-"} ${Math.abs(constant)} = ${result}`;
      correctAnswer = String(x);
      explanation = `Subtract ${constant} from both sides: ${coef === 1 ? "" : coef}x = ${result - constant}. ${coef !== 1 ? `Divide by ${coef}: x = ${x}.` : `So x = ${x}.`}`;
      hint = `Isolate x by undoing the operations — addition first, then multiplication.`;
      break;
    }
    case "g6-area-perimeter": {
      const type = pick(["rectangle", "triangle", "square"]);
      if (type === "rectangle") {
        const l = randomInt(4, 20);
        const w = randomInt(3, 15);
        prompt = `${name} has a rectangular garden ${l} m long and ${w} m wide ${scenario}. What is its area?`;
        correctAnswer = String(l * w);
        acceptedAnswers = [`${l * w}`, `${l * w} m²`, `${l * w} m^2`, `${l * w} sq m`];
        explanation = `Area of rectangle = length × width = ${l} × ${w} = ${l * w} m².`;
        hint = `Area of rectangle = length × width.`;
      } else if (type === "square") {
        const s = randomInt(4, 20);
        prompt = `${name} has a square tile with side length ${s} cm. What is its area?`;
        correctAnswer = String(s * s);
        acceptedAnswers = [`${s * s}`, `${s * s} cm²`];
        explanation = `Area of square = side² = ${s}² = ${s * s} cm².`;
        hint = `Area of square = side × side.`;
      } else {
        const b = randomInt(4, 15);
        const h = randomInt(3, 12);
        prompt = `A triangle has base ${b} cm and height ${h} cm. What is its area?`;
        correctAnswer = String((b * h) / 2);
        acceptedAnswers = [`${(b * h) / 2}`, `${b * h / 2} cm²`, `${b * h / 2}`];
        explanation = `Area of triangle = ½ × base × height = ½ × ${b} × ${h} = ${(b * h) / 2} cm².`;
        hint = `Triangle area is half of base times height.`;
      }
      break;
    }
    case "g6-volume": {
      const l = randomInt(2, 8);
      const w = randomInt(2, 8);
      const h = randomInt(2, 8);
      prompt = `${name} has a rectangular box ${l} cm × ${w} cm × ${h} cm. What is its volume?`;
      correctAnswer = String(l * w * h);
      acceptedAnswers = [`${l * w * h}`, `${l * w * h} cm³`, `${l * w * h} cm^3`];
      explanation = `Volume = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cm³.`;
      hint = `Multiply all three dimensions together.`;
      break;
    }
    case "g6-angles": {
      const a1 = randomInt(30, 120);
      const a2 = 180 - a1;
      prompt = `Two angles on a straight line: one is ${a1}°. What is the other angle?`;
      correctAnswer = String(a2);
      acceptedAnswers = [`${a2}`, `${a2}°`, `${a2} degrees`];
      explanation = `Angles on a straight line add to 180°. So ${a2} = 180 - ${a1}.`;
      hint = `Angles on a straight line sum to 180°.`;
      break;
    }
    case "g6-coordinate-plane": {
      const x = randomInt(-8, 8);
      const y = randomInt(-8, 8);
      prompt = `What are the coordinates of a point that is ${x} units right and ${y} units up from the origin?`;
      correctAnswer = `(${x}, ${y})`;
      acceptedAnswers = [`(${x}, ${y})`, `${x},${y}`, `(${x},${y})`];
      explanation = `Coordinates are written as (x, y). Moving right ${x} and up ${y} gives (${x}, ${y}).`;
      hint = `Coordinates are written as (x, y) — horizontal first, then vertical.`;
      questionType = "EXPRESSION";
      break;
    }
    case "g6-statistics": {
      const n = 5;
      const nums = Array.from({ length: n }, () => randomInt(2, 20));
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      prompt = `Find the mean of these numbers: ${nums.join(", ")}.`;
      correctAnswer = String(mean);
      acceptedAnswers = [String(mean), mean.toFixed(1), mean.toFixed(2)];
      explanation = `Mean = sum ÷ count = (${nums.join(" + ")}) ÷ ${n} = ${sum} ÷ ${n} = ${mean}.`;
      hint = `Add all the numbers, then divide by how many there are.`;
      break;
    }
    case "g6-probability": {
      const total = randomInt(10, 30);
      const favorable = randomInt(1, Math.floor(total / 2));
      prompt = `A bag has ${total} marbles. ${favorable} are red. What is the probability of picking a red marble? (Give your answer as a fraction)`;
      correctAnswer = `${favorable}/${total}`;
      acceptedAnswers = [`${favorable}/${total}`, (favorable / total).toFixed(2), (favorable / total).toFixed(4).replace(/\.?0+$/, "")];
      explanation = `Probability = favorable outcomes ÷ total outcomes = ${favorable}/${total}.`;
      hint = `Probability = favorable ÷ total.`;
      questionType = "FRACTION";
      break;
    }
    case "g6-money": {
      const price = randomInt(20, 200);
      const discount = pick([10, 20, 25, 50]);
      const saved = (price * discount) / 100;
      prompt = `An item costs $${price}. It is on sale for ${discount}% off. How much money will ${name} save?`;
      correctAnswer = String(saved);
      acceptedAnswers = [String(saved), `$${saved}`, `${saved}.00`];
      explanation = `Discount = ${discount}% of $${price} = (${discount}/100) × ${price} = $${saved}.`;
      hint = `Convert the percentage to a decimal, then multiply by the price.`;
      break;
    }
    case "g6-time": {
      const speed = randomInt(30, 120);
      const time = randomInt(2, 6);
      const distance = speed * time;
      prompt = `${name} is traveling at ${speed} km/h for ${time} hours. How far does ${name} travel?`;
      correctAnswer = String(distance);
      acceptedAnswers = [`${distance}`, `${distance} km`, `${distance} kilometers`];
      explanation = `Distance = Speed × Time = ${speed} × ${time} = ${distance} km.`;
      hint = `Distance = Speed × Time.`;
      break;
    }
    case "g6-word-problems": {
      const a = randomInt(3, 12);
      const b = randomInt(2, 8);
      const c = randomInt(5, 20);
      prompt = `${name} buys ${a} packs of ${object}, each containing ${b} items. They give ${c} items to a friend and split the rest equally among 3 friends. How many ${object} does each of the 3 friends get?`;
      const total = a * b;
      const remaining = total - c;
      const per = remaining / 3;
      correctAnswer = String(per);
      acceptedAnswers = [String(per), per.toFixed(2)];
      explanation = `Total = ${a} × ${b} = ${total}. After giving away ${c}: ${remaining}. Split among 3: ${remaining} ÷ 3 = ${per}.`;
      hint = `Find the total first, then subtract what's given away, then divide by 3.`;
      break;
    }
    case "g6-factors-multiples": {
      const a = randomInt(6, 30);
      const b = randomInt(6, 30);
      const g = gcd(a, b);
      prompt = `What is the greatest common factor (GCF) of ${a} and ${b}?`;
      correctAnswer = String(g);
      explanation = `The factors of ${a} that also divide ${b}: GCF = ${g}.`;
      hint = `List factors of each number and find the largest one they share.`;
      break;
    }
    case "g6-negative-numbers": {
      const a = randomInt(5, 20);
      const b = randomInt(5, 20);
      prompt = `The temperature was ${a}°C at noon. By midnight it dropped by ${a + b}°C. What was the temperature at midnight?`;
      correctAnswer = String(-b);
      acceptedAnswers = [`-${b}`, `- ${b}`, `${-b}`, `-${b}°C`, `${-b}°C`];
      explanation = `${a} - ${a + b} = -${b}. The temperature was -${b}°C.`;
      hint = `Subtracting a larger number from a smaller one gives a negative result.`;
      break;
    }
    default: {
      // Generic fallback
      const a = randomInt(10, 99);
      const b = randomInt(10, 99);
      prompt = `What is ${a} + ${b}?`;
      correctAnswer = String(a + b);
      explanation = `${a} + ${b} = ${a + b}`;
      hint = `Add the two numbers.`;
    }
  }

  return {
    topicId: topicSlug,
    topicSlug,
    topicName: topic.name,
    questionType,
    prompt,
    choices,
    correctAnswer,
    acceptedAnswers,
    explanation,
    hint,
    commonMistakes: [],
    difficulty,
    estimatedSolveSec: 30 + difficulty * 15,
    bloomsLevel: topic.bloomsLevel,
    scenario: `${name} ${scenario}`,
    metadata: { generatedBy: "template", name, scenario },
  };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// ============================================================
// AI-POWERED GENERATION
// ============================================================

const QUESTION_GEN_SYSTEM_PROMPT = `You are an expert mathematics question generator for children aged 8-13.

Generate a single math question for the given topic, difficulty, and curriculum.

Return ONLY a JSON object with these fields:
{
  "questionType": "MULTIPLE_CHOICE" | "NUMERIC" | "FRACTION" | "EXPRESSION" | "WORD_PROBLEM" | "TRUE_FALSE",
  "prompt": "the question text (use child-friendly language, include a brief story/scenario)",
  "choices": ["a","b","c","d"],   // only for MULTIPLE_CHOICE; empty array otherwise
  "correctAnswer": "the exact correct answer as a string",
  "acceptedAnswers": ["other acceptable forms"],  // equivalent answers (e.g. ["0.5", "1/2"])
  "explanation": "step-by-step explanation of how to solve it",
  "hint": "a Socratic hint that guides without giving the answer",
  "commonMistakes": ["common mistake 1", "common mistake 2"],
  "estimatedSolveSec": 30,
  "scenario": "brief description of the scenario used"
}

Rules:
- Use diverse, inclusive names (rotate through different cultures).
- Numbers must be age-appropriate (avoid unrealistically large numbers unless testing place value).
- The scenario must be relatable to a child (school, family, friends, sports, games, food, animals).
- The correctAnswer must be a single, exact value.
- The explanation must be educational — explain the concept, not just the computation.
- The hint must be Socratic: ask a guiding question or suggest a strategy, never reveal the answer.
- For MULTIPLE_CHOICE, the correct answer must be one of the choices. The other 3 choices must be plausible distractors based on common mistakes.
- For FRACTION answers, the correctAnswer should be in simplest form (e.g. "3/4" not "6/8").
- Vary the wording and scenarios — never repeat verbatim.
- Match the difficulty level: 1=very easy, 2=easy, 3=medium, 4=hard, 5=very hard.
- Output JSON only, no markdown.`;

export async function generateQuestionWithAI(
  topicSlug: string,
  difficulty: number,
  curriculumCode: string,
  gradeLevel: number = 6
): Promise<GeneratedQuestion> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) throw new Error(`Unknown topic: ${topicSlug}`);

  // Randomize scenario seed so AI doesn't repeat
  const seedName = pick(NAMES);
  const seedScenario = pick(SCENARIOS);
  const seedObject = pick(OBJECTS);

  const prompt = `Generate a math question:
- Curriculum: ${curriculumCode}
- Grade: ${gradeLevel}
- Topic: ${topic.name} (slug: ${topic.slug})
- Topic description: ${topic.description}
- Learning objective: ${topic.learningObjective}
- Bloom's level: ${topic.bloomsLevel}
- Difficulty: ${difficulty}/5
- Random scenario seed (use as inspiration, vary if you want): ${seedName}, ${seedScenario}, ${seedObject}`;

  try {
    const result = await askAIForJSON<{
      questionType: QuestionType;
      prompt: string;
      choices: string[];
      correctAnswer: string;
      acceptedAnswers: string[];
      explanation: string;
      hint: string;
      commonMistakes: string[];
      estimatedSolveSec: number;
      scenario: string;
    }>(prompt, QUESTION_GEN_SYSTEM_PROMPT);

    const question: GeneratedQuestion = {
      topicId: topicSlug,
      topicSlug,
      topicName: topic.name,
      questionType: result.questionType ?? "NUMERIC",
      prompt: result.prompt,
      choices: result.choices,
      correctAnswer: String(result.correctAnswer),
      acceptedAnswers: (result.acceptedAnswers ?? []).map(String),
      explanation: result.explanation,
      hint: result.hint,
      commonMistakes: result.commonMistakes ?? [],
      difficulty,
      estimatedSolveSec: result.estimatedSolveSec ?? 30 + difficulty * 15,
      bloomsLevel: topic.bloomsLevel,
      scenario: result.scenario ?? `${seedName} ${seedScenario}`,
      metadata: { generatedBy: "ai", provider: "configured" },
    };

    // Validate: ensure the correct answer is gradeable
    const validation = gradeAnswer(
      question.correctAnswer,
      question.correctAnswer,
      question.acceptedAnswers
    );
    if (!validation.isCorrect) {
      console.warn("[question-gen] AI returned unparseable correctAnswer:", question.correctAnswer);
      // Fall back to template
      return generateFromTemplate(topicSlug, difficulty);
    }

    // For MC, ensure correctAnswer is among choices
    if (question.questionType === "MULTIPLE_CHOICE" && question.choices) {
      const inChoices = question.choices.some(
        (c) => gradeAnswer(c, question.correctAnswer, question.acceptedAnswers).isCorrect
      );
      if (!inChoices) {
        // Force correctAnswer into choices
        question.choices = [
          question.correctAnswer,
          ...question.choices.slice(0, 3),
        ];
      }
    }

    return question;
  } catch (err) {
    console.error("[question-gen] AI generation failed, using template:", err);
    return generateFromTemplate(topicSlug, difficulty);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export async function generateQuestion(opts: {
  topicSlug: string;
  difficulty?: number;
  curriculumCode?: string;
  gradeLevel?: number;
  useAI?: boolean;
}): Promise<GeneratedQuestion> {
  const difficulty = opts.difficulty ?? 3;
  const useAI = opts.useAI ?? true;

  if (useAI) {
    return generateQuestionWithAI(
      opts.topicSlug,
      difficulty,
      opts.curriculumCode ?? "COMMON-CORE",
      opts.gradeLevel ?? 6
    );
  }
  return generateFromTemplate(opts.topicSlug, difficulty);
}

/**
 * Generate a batch of questions (used for endless mode, challenge mode).
 */
export async function generateQuestionBatch(
  topicSlug: string,
  count: number,
  difficulty: number = 3,
  curriculumCode: string = "COMMON-CORE"
): Promise<GeneratedQuestion[]> {
  const promises = Array.from({ length: count }, () =>
    generateQuestion({ topicSlug, difficulty, curriculumCode, useAI: true }).catch(() =>
      generateFromTemplate(topicSlug, difficulty)
    )
  );
  return Promise.all(promises);
}
