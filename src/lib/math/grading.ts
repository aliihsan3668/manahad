/**
 * MathVerse — Deterministic Math Grading Engine
 *
 * Determines whether a student's answer is mathematically equivalent to
 * the correct answer WITHOUT relying on AI (which is slow + expensive + non-deterministic).
 *
 * Supports:
 *   - Integers, decimals, negative numbers
 *   - Fractions (1/2, 2/4 → equivalent)
 *   - Mixed numbers (1 1/2 == 3/2 == 1.5)
 *   - Percentages (50% == 0.5 == 1/2)
 *   - Algebraic expressions (2x+1 == 1+2x)
 *   - Units (5cm == 5 cm == 5 centimeters)
 *   - Scientific notation (1.5e3 == 1500)
 *   - Multiple accepted answers
 *
 * Strategy:
 *   1. Normalize both strings (trim, lowercase, strip units, standardize fraction syntax)
 *   2. Try exact match
 *   3. Try numeric comparison (int, float, fraction, percentage, scientific)
 *   4. Try symbolic comparison (algebraic expressions simplified)
 *   5. If all fail, return not equivalent
 */

export interface GradingResult {
  isCorrect: boolean;
  isEquivalent: boolean;
  normalizedUser: string;
  normalizedCorrect: string;
  method: "exact" | "numeric" | "fraction" | "percentage" | "symbolic" | "set" | "none";
}

const UNIT_ALIASES: Record<string, string> = {
  cm: "cm", centimeter: "cm", centimeters: "cm", centimetre: "cm", centimetres: "cm",
  m: "m", meter: "m", meters: "m", metre: "m", metres: "m",
  km: "km", kilometer: "km", kilometers: "km", kilometre: "km", kilometres: "km",
  mm: "mm", millimeter: "mm", millimeters: "mm",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  mg: "mg", milligram: "mg", milligrams: "mg",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  s: "s", sec: "s", second: "s", seconds: "s",
  min: "min", minute: "min", minutes: "min",
  h: "h", hr: "h", hour: "h", hours: "h",
  ft: "ft", feet: "ft", foot: "ft",
  in: "in", inch: "in", inches: "in",
  yd: "yd", yard: "yd", yards: "yd",
  mi: "mi", mile: "mi", miles: "mi",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
};

const UNIT_LIST = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);

function stripUnits(s: string): { value: string; unit: string | null } {
  const trimmed = s.trim().toLowerCase();
  for (const unit of UNIT_LIST) {
    const re = new RegExp(`\\s*${unit}\\s*$`, "i");
    if (re.test(trimmed)) {
      const value = trimmed.replace(re, "").trim();
      return { value, unit: UNIT_ALIASES[unit] };
    }
  }
  return { value: trimmed, unit: null };
}

function normalizeBasic(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[,$]/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/–|—/g, "-")
    .replace(/\.$/, "");
}

function parseNumeric(s: string): number | null {
  const v = s.trim().toLowerCase();
  if (!v) return null;

  const constants: Record<string, number> = {
    π: Math.PI, pi: Math.PI, e: Math.E,
    "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  };
  if (v in constants) return constants[v];

  const pctMatch = v.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) return parseFloat(pctMatch[1]) / 100;

  const sciMatch = v.match(/^(-?\d+(?:\.\d+)?)\s*[eE]\s*(-?\d+)$/);
  if (sciMatch) return parseFloat(sciMatch[1]) * Math.pow(10, parseInt(sciMatch[2], 10));

  const mixedMatch = v.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const sign = mixedMatch[1].startsWith("-") ? -1 : 1;
    const whole = Math.abs(parseInt(mixedMatch[1], 10));
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    return sign * (whole + num / den);
  }

  const fracMatch = v.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den === 0) return null;
    return num / den;
  }

  const numMatch = v.match(/^(-?\d+(?:\.\d+)?)$/);
  if (numMatch) return parseFloat(numMatch[1]);

  return null;
}

function toFraction(decimal: number): { num: number; den: number } | null {
  if (!Number.isFinite(decimal)) return null;
  const sign = decimal < 0 ? -1 : 1;
  const abs = Math.abs(decimal);
  for (let den = 1; den <= 1000; den++) {
    const num = abs * den;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      return { num: sign * Math.round(num), den };
    }
  }
  return null;
}

function normalizeSymbolic(s: string): string {
  let v = s.replace(/\s+/g, "").toLowerCase();

  v = v.replace(/(\d*)([a-z]?)\(([a-z0-9+\-]+)\)/g, (_, coef: string, _var: string, inner: string) => {
    const c = coef === "" ? 1 : parseInt(coef, 10);
    const terms = inner.split(/(?=[+-])/).filter(Boolean);
    return terms.map((t: string) => `${c}${t}`).join("");
  });

  if (v.includes("+") || v.includes("-")) {
    const terms: string[] = [];
    let current = "";
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      if ((ch === "+" || ch === "-") && i > 0 && v[i - 1] !== "(") {
        if (current) terms.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
    if (current) terms.push(current);
    const normalized = terms.map((t) => {
      if (!t.startsWith("-") && !t.startsWith("+")) return "+" + t;
      return t;
    });
    normalized.sort();
    v = normalized.join("").replace(/^\+/, "");
  }

  return v;
}

export function gradeAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptedAnswers: string[] = []
): GradingResult {
  const userNorm = normalizeBasic(userAnswer);
  const correctNorm = normalizeBasic(correctAnswer);

  if (userNorm === correctNorm) {
    return {
      isCorrect: true, isEquivalent: false,
      normalizedUser: userNorm, normalizedCorrect: correctNorm, method: "exact",
    };
  }

  for (const accepted of acceptedAnswers) {
    const accNorm = normalizeBasic(accepted);
    if (userNorm === accNorm) {
      return {
        isCorrect: true, isEquivalent: true,
        normalizedUser: userNorm, normalizedCorrect: accNorm, method: "set",
      };
    }
  }

  const userStripped = stripUnits(userNorm);
  const correctStripped = stripUnits(correctNorm);

  if (userStripped.unit && correctStripped.unit && userStripped.unit !== correctStripped.unit) {
    return {
      isCorrect: false, isEquivalent: false,
      normalizedUser: userNorm, normalizedCorrect: correctNorm, method: "none",
    };
  }

  const userNum = parseNumeric(userStripped.value);
  const correctNum = parseNumeric(correctStripped.value);

  if (userNum !== null && correctNum !== null) {
    const equal = Math.abs(userNum - correctNum) < 1e-9;
    if (equal) {
      const isFracForm = /\//.test(userStripped.value) || /\//.test(correctStripped.value);
      const isPctForm = /%/.test(userNorm) || /%/.test(correctNorm);
      return {
        isCorrect: true, isEquivalent: userNorm !== correctNorm,
        normalizedUser: userNorm, normalizedCorrect: correctNorm,
        method: isFracForm ? "fraction" : isPctForm ? "percentage" : "numeric",
      };
    }
  }

  const userSym = normalizeSymbolic(userNorm);
  const correctSym = normalizeSymbolic(correctNorm);
  if (userSym === correctSym && userSym.length > 0) {
    return {
      isCorrect: true, isEquivalent: true,
      normalizedUser: userSym, normalizedCorrect: correctSym, method: "symbolic",
    };
  }

  for (const accepted of acceptedAnswers) {
    const accNorm = normalizeBasic(accepted);
    const accSym = normalizeSymbolic(accNorm);
    if (userSym === accSym && userSym.length > 0) {
      return {
        isCorrect: true, isEquivalent: true,
        normalizedUser: userSym, normalizedCorrect: accSym, method: "symbolic",
      };
    }
  }

  return {
    isCorrect: false, isEquivalent: false,
    normalizedUser: userNorm, normalizedCorrect: correctNorm, method: "none",
  };
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  const frac = toFraction(n);
  if (frac && frac.den <= 100 && frac.den !== 1) {
    return `${frac.num}/${frac.den}`;
  }
  return n.toFixed(4).replace(/\.?0+$/, "");
}

export function isNumeric(s: string): boolean {
  return parseNumeric(s) !== null;
}
