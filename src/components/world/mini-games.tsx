"use client";

/**
 * MANAHAD — Mini-Games Collection (single file)
 * 9 games: Math Race, Number Ninja, Treasure Hunt, Brain Puzzle,
 * Math Battle, Tower Siege, Pattern Master, Math Memory, Boss Battle
 * Plus: Leaper Quest (Mario-style platformer)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, RotateCcw, Trophy, Zap, Brain, Target, Check, Heart, Sparkles, Coins, Flame, Gamepad2 } from "lucide-react";

export type GameId = "math-race" | "number-ninja" | "treasure-hunt" | "brain-puzzle" | "math-battle" | "tower-siege" | "pattern-master" | "math-memory" | "boss-battle" | "leaper-quest";

export interface GameResult {
  score: number;
  xpEarned: number;
  brainEnergyEarned: number;
  correct: number;
  total: number;
}

export interface MiniGamesMenuProps {
  onClose: (result: GameResult) => void;
}

// ============================================================
// GAMES MENU
// ============================================================

const ALL_GAMES: { id: GameId; label: string; emoji: string; description: string }[] = [
  { id: "math-race", label: "Math Race", emoji: "⚡", description: "30s quick-fire math!" },
  { id: "number-ninja", label: "Number Ninja", emoji: "🥷", description: "Slice the right numbers!" },
  { id: "treasure-hunt", label: "Treasure Hunt", emoji: "💰", description: "Find hidden treasures!" },
  { id: "brain-puzzle", label: "Brain Puzzle", emoji: "🧩", description: "Make the target number!" },
  { id: "math-battle", label: "Math Battle", emoji: "⚔️", description: "1v1 battle vs AI!" },
  { id: "tower-siege", label: "Tower Siege", emoji: "🏰", description: "Defend your base!" },
  { id: "pattern-master", label: "Pattern Master", emoji: "🔮", description: "Find the next number!" },
  { id: "math-memory", label: "Math Memory", emoji: "🃏", description: "Match equivalents!" },
  { id: "boss-battle", label: "Boss Battle", emoji: "🐉", description: "Defeat the Math Dragon!" },
  { id: "leaper-quest", label: "Leaper Quest", emoji: "🍄", description: "Mario-style platformer!" },
];

export function MiniGamesMenu({ onClose }: MiniGamesMenuProps) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  function handleClose(result: GameResult) {
    setActiveGame(null);
    if (result.score > 0) {
      onClose(result);
    }
  }

  if (activeGame) {
    return <GameWrapper game={activeGame} onClose={handleClose} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => onClose({ score: 0, xpEarned: 0, brainEnergyEarned: 0, correct: 0, total: 0 })}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-rose-500 text-white p-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" /> Mini-Games
            </h2>
            <p className="text-xs opacity-90">Pick a game and earn XP + Brain Energy!</p>
          </div>
          <button
            onClick={() => onClose({ score: 0, xpEarned: 0, brainEnergyEarned: 0, correct: 0, total: 0 })}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGame(g.id)}
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition text-center active:scale-95"
              >
                <span className="text-3xl">{g.emoji}</span>
                <span className="font-bold text-sm">{g.label}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-2">{g.description}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// GAME WRAPPER
// ============================================================

function GameWrapper({ game, onClose }: { game: GameId; onClose: (r: GameResult) => void }) {
  switch (game) {
    case "math-race": return <MathRaceGame onClose={onClose} />;
    case "number-ninja": return <NumberNinjaGame onClose={onClose} />;
    case "treasure-hunt": return <TreasureHuntGame onClose={onClose} />;
    case "brain-puzzle": return <BrainPuzzleGame onClose={onClose} />;
    case "math-battle": return <MathBattleGame onClose={onClose} />;
    case "tower-siege": return <TowerSiegeGame onClose={onClose} />;
    case "pattern-master": return <PatternMasterGame onClose={onClose} />;
    case "math-memory": return <MathMemoryGame onClose={onClose} />;
    case "boss-battle": return <BossBattleGame onClose={onClose} />;
    case "leaper-quest": return <LeaperQuestGame onClose={onClose} />;
    default: return <MathRaceGame onClose={onClose} />;
  }
}

// ============================================================
// RESULTS SCREEN
// ============================================================

function ResultsScreen({ score, correct, total, onPlayAgain, onClose }: {
  score: number; correct: number; total: number; onPlayAgain: () => void; onClose: () => void;
}) {
  const xp = Math.floor(score / 5);
  const be = correct * 3;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-6 gap-4"
    >
      <div className="text-5xl">{score > 0 ? "🎉" : "📚"}</div>
      <h3 className="text-xl font-bold">{score > 0 ? "Great job!" : "Keep practicing!"}</h3>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{score}</div>
          <div className="text-xs text-muted-foreground">Score</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">+{xp}</div>
          <div className="text-xs text-muted-foreground">XP Earned</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-cyan-600">+{be}</div>
          <div className="text-xs text-muted-foreground">Brain Energy</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-rose-600">{correct}/{total}</div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </Card>
      </div>
      <div className="flex gap-2 mt-2">
        <Button onClick={onPlayAgain} className="rounded-full">
          <RotateCcw className="w-4 h-4 mr-1" /> Play Again
        </Button>
        <Button variant="outline" onClick={() => onClose()} className="rounded-full">
          Close
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// MATH HELPERS
// ============================================================

function genQuestion(): { question: string; answer: number; choices: number[] } {
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  switch (op) {
    case "+": a = 1 + Math.floor(Math.random() * 99); b = 1 + Math.floor(Math.random() * 99); answer = a + b; break;
    case "-": a = 10 + Math.floor(Math.random() * 90); b = 1 + Math.floor(Math.random() * (a - 1)); answer = a - b; break;
    case "×": a = 2 + Math.floor(Math.random() * 11); b = 2 + Math.floor(Math.random() * 11); answer = a * b; break;
    case "÷": b = 2 + Math.floor(Math.random() * 11); answer = 1 + Math.floor(Math.random() * 11); a = b * answer; break;
    default: a = 1; b = 1; answer = 2;
  }
  const choices = [answer];
  while (choices.length < 4) {
    const wrong = answer + Math.floor(Math.random() * 10) - 5;
    if (wrong > 0 && !choices.includes(wrong)) choices.push(wrong);
  }
  choices.sort(() => Math.random() - 0.5);
  return { question: `${a} ${op} ${b} = ?`, answer, choices };
}

function genPattern(): { sequence: number[]; answer: number; explanation: string } {
  const type = Math.floor(Math.random() * 4);
  const start = 1 + Math.floor(Math.random() * 10);
  switch (type) {
    case 0: { // arithmetic
      const d = 2 + Math.floor(Math.random() * 8);
      const seq = [start, start + d, start + 2 * d, start + 3 * d];
      return { sequence: seq, answer: start + 4 * d, explanation: `Add ${d} each time` };
    }
    case 1: { // geometric
      const r = 2 + Math.floor(Math.random() * 3);
      const seq = [start, start * r, start * r * r, start * r * r * r];
      return { sequence: seq, answer: start * r * r * r * r, explanation: `Multiply by ${r} each time` };
    }
    case 2: { // squares
      const seq = [1, 4, 9, 16];
      return { sequence: seq, answer: 25, explanation: "Perfect squares: 1², 2², 3², 4², 5²" };
    }
    case 3: { // fibonacci-like
      const seq = [start, start + 1, start * 2 + 1, start * 3 + 2];
      return { sequence: seq, answer: start * 5 + 3, explanation: "Each number is the sum of the previous two" };
    }
    default: return { sequence: [2, 4, 6, 8], answer: 10, explanation: "Add 2 each time" };
  }
}

// ============================================================
// GAME 1: MATH RACE
// ============================================================

function MathRaceGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [time, setTime] = useState(30);
  const [q, setQ] = useState(genQuestion());
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"play" | "results">("play");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { setPhase("results"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [q]);

  function submit() {
    if (!answer.trim()) return;
    const num = parseInt(answer);
    setTotal(t => t + 1);
    if (num === q.answer) {
      setScore(s => s + 10);
      setCorrect(c => c + 1);
    } else {
      setScore(s => Math.max(0, s - 5));
    }
    setAnswer("");
    setQ(genQuestion());
  }

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={total} onPlayAgain={() => { setScore(0); setCorrect(0); setTotal(0); setTime(30); setPhase("play"); setQ(genQuestion()); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total })} />;
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full flex justify-between items-center">
        <div className="text-2xl font-bold text-amber-600">{score}</div>
        <div className={`text-2xl font-bold ${time <= 5 ? "text-red-500 animate-pulse" : "text-emerald-600"}`}>{time}s</div>
      </div>
      <Card className="p-6 w-full max-w-md text-center">
        <div className="text-3xl font-bold mb-4">{q.question}</div>
        <Input
          ref={inputRef}
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your answer"
          className="text-center text-xl h-12 rounded-xl"
        />
        <Button onClick={submit} className="w-full mt-3 rounded-full" disabled={!answer.trim()}>
          Submit
        </Button>
      </Card>
      <div className="text-sm text-muted-foreground">✅ {correct} correct · {total} total</div>
    </div>
  );
}

// ============================================================
// GAME 2: NUMBER NINJA
// ============================================================

function NumberNinjaGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [time, setTime] = useState(60);
  const [numbers, setNumbers] = useState<{ id: number; value: number; x: number; y: number }[]>([]);
  const [phase, setPhase] = useState<"play" | "results">("play");
  const conditions = ["EVEN", "ODD", "PRIME", "MULT3", "GT50"];
  const [condition] = useState(() => conditions[Math.floor(Math.random() * conditions.length)]);
  const nextId = useRef(0);

  const checkMatch = (n: number) => {
    switch (condition) {
      case "EVEN": return n % 2 === 0;
      case "ODD": return n % 2 !== 0;
      case "PRIME": { for (let i = 2; i < n; i++) if (n % i === 0) return false; return n > 1; }
      case "MULT3": return n % 3 === 0;
      case "GT50": return n > 50;
      default: return false;
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => { if (t <= 1) { setPhase("results"); return 0; } return t - 1; });
    }, 1000);
    const spawner = setInterval(() => {
      setNumbers((prev) => {
        const newNum = { id: nextId.current++, value: 1 + Math.floor(Math.random() * 100), x: Math.random() * 80 + 10, y: -10 };
        return [...prev, newNum].slice(-8);
      });
    }, 1500);
    return () => { clearInterval(timer); clearInterval(spawner); };
  }, []);

  useEffect(() => {
    const mover = setInterval(() => {
      setNumbers((prev) => prev.map((n) => ({ ...n, y: n.y + 3 })).filter((n) => n.y < 110));
    }, 100);
    return () => clearInterval(mover);
  }, []);

  function tap(id: number, value: number) {
    setNumbers((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => t + 1);
    if (checkMatch(value)) {
      setScore((s) => s + 10);
      setCorrect((c) => c + 1);
    } else {
      setScore((s) => Math.max(0, s - 5));
    }
  }

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={total} onPlayAgain={() => { setScore(0); setCorrect(0); setTotal(0); setTime(60); setPhase("play"); setNumbers([]); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total })} />;
  }

  const condText = condition === "EVEN" ? "Tap only EVEN numbers!" :
    condition === "ODD" ? "Tap only ODD numbers!" :
    condition === "PRIME" ? "Tap only PRIME numbers!" :
    condition === "MULT3" ? "Tap multiples of 3!" : "Tap numbers > 50!";

  return (
    <div className="p-4 flex flex-col items-center gap-2">
      <div className="w-full flex justify-between">
        <div className="text-xl font-bold text-amber-600">{score}</div>
        <div className={`text-xl font-bold ${time <= 10 ? "text-red-500" : "text-emerald-600"}`}>{time}s</div>
      </div>
      <div className="text-lg font-bold text-purple-600">{condText}</div>
      <div className="relative w-full max-w-md h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
        {numbers.map((n) => (
          <button
            key={n.id}
            onClick={() => tap(n.id, n.value)}
            className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white font-bold text-lg flex items-center justify-center shadow-lg active:scale-90 transition"
            style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
          >
            {n.value}
          </button>
        ))}
      </div>
      <div className="text-sm text-muted-foreground">✅ {correct} · {total} total</div>
    </div>
  );
}

// ============================================================
// GAME 3: TREASURE HUNT
// ============================================================

function TreasureHuntGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [chests, setChests] = useState(() => {
    const arr = [];
    for (let i = 0; i < 20; i++) {
      const tier = i < 5 ? "gold" : i < 15 ? "silver" : "bronze";
      const pts = tier === "gold" ? 50 : tier === "silver" ? 25 : 10;
      const q = genQuestion();
      arr.push({ id: i, tier, pts, opened: false, ...q });
    }
    return arr.sort(() => Math.random() - 0.5);
  });
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [opened, setOpened] = useState(0);
  const [active, setActive] = useState<typeof chests[0] | null>(null);
  const [phase, setPhase] = useState<"play" | "results">("play");

  function openChest(chest: typeof chests[0]) {
    if (chest.opened) return;
    setActive(chest);
  }

  function answerChest(val: number) {
    if (!active) return;
    setOpened(o => o + 1);
    setTotal(t => t + 1);
    if (val === active.answer) {
      setScore(s => s + active.pts);
      setCorrect(c => c + 1);
    }
    setChests(prev => prev.map(c => c.id === active.id ? { ...c, opened: true } : c));
    setActive(null);
    if (opened + 1 >= 20) setPhase("results");
  }

  const total = opened;

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={total} onPlayAgain={() => { window.location.reload(); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total })} />;
  }

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-full flex justify-between">
        <div className="text-xl font-bold text-amber-600">{score} pts</div>
        <div className="text-sm text-muted-foreground">{opened}/20 opened</div>
      </div>
      <div className="text-sm text-muted-foreground">🥇 50pts · 🥈 25pts · 🥉 10pts</div>
      <div className="grid grid-cols-5 gap-2">
        {chests.map((c) => (
          <button
            key={c.id}
            onClick={() => openChest(c)}
            disabled={c.opened}
            className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center ${c.opened ? "opacity-20" : "hover:scale-110 active:scale-95"} ${c.tier === "gold" ? "bg-amber-100" : c.tier === "silver" ? "bg-slate-200" : "bg-orange-100"}`}
          >
            {c.opened ? "✓" : "🎁"}
          </button>
        ))}
      </div>
      <div className="text-sm">✅ {correct} · {total} total</div>

      {active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <Card className="p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-4xl mb-3">{active.tier === "gold" ? "🥇" : active.tier === "silver" ? "🥈" : "🥉"}</div>
            <div className="text-lg font-bold text-center mb-3">{active.question}</div>
            <div className="grid grid-cols-2 gap-2">
              {active.choices.map((c) => (
                <Button key={c} onClick={() => answerChest(c)} className="rounded-full">{c}</Button>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// GAME 4: BRAIN PUZZLE
// ============================================================

function BrainPuzzleGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<"play" | "results">("play");

  const [puzzle] = useState(() => {
    const target = 20 + Math.floor(Math.random() * 20);
    const nums = [1 + Math.floor(Math.random() * 9), 1 + Math.floor(Math.random() * 9), 1 + Math.floor(Math.random() * 9), 1 + Math.floor(Math.random() * 9)];
    return { target, nums };
  });
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null, null, null]);

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={5} onPlayAgain={() => { setRound(1); setScore(0); setCorrect(0); setStreak(0); setPhase("play"); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total: 5 })} />;
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full flex justify-between">
        <div className="text-lg font-bold">Round {round}/5</div>
        <div className="text-lg font-bold text-amber-600">{score}</div>
      </div>
      <Card className="p-4 w-full max-w-md text-center">
        <div className="text-sm text-muted-foreground mb-2">Make the target:</div>
        <div className="text-4xl font-bold text-purple-600 mb-4">{puzzle.target}</div>
        <div className="flex items-center justify-center gap-1 text-xl mb-4">
          {slots.map((s, i) => (
            <span key={i} className="w-10 h-10 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
              {s}
            </span>
          ))}
          <span className="px-2">= ?</span>
        </div>
        <div className="flex gap-2 justify-center">
          {puzzle.nums.map((n, i) => (
            <button key={i} className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg active:scale-95">
              {n}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            if (round >= 5) setPhase("results");
            else { setRound(r => r + 1); setStreak(s => s + 1); setScore(s => s + 20); }
          }}
          className="w-full mt-4 rounded-full"
        >
          Check Answer
        </Button>
      </Card>
      <div className="text-sm">🔥 {streak} streak</div>
    </div>
  );
}

// ============================================================
// GAME 5: MATH BATTLE
// ============================================================

function MathBattleGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [turn, setTurn] = useState(1);
  const [q, setQ] = useState(genQuestion());
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<"play" | "results">("play");

  function submit() {
    if (!answer.trim()) return;
    const num = parseInt(answer);
    if (num === q.answer) {
      setEnemyHP(h => Math.max(0, h - 20));
      setScore(s => s + 10);
      setCorrect(c => c + 1);
    } else {
      setPlayerHP(h => Math.max(0, h - 15));
    }
    setAnswer("");
    setQ(genQuestion());
    setTurn(t => t + 1);
    if (enemyHP - 20 <= 0 || playerHP - 15 <= 0) setPhase("results");
  }

  if (phase === "results") {
    const won = enemyHP <= 0;
    return <ResultsScreen score={score + (won ? 50 : 0)} correct={correct} total={turn} onPlayAgain={() => { setPlayerHP(100); setEnemyHP(100); setTurn(1); setScore(0); setCorrect(0); setPhase("play"); setQ(genQuestion()); }} onClose={() => onClose({ score: score + (won ? 50 : 0), xpEarned: Math.floor((score + (won ? 50 : 0)) / 5), brainEnergyEarned: correct * 3, correct, total: turn })} />;
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-3xl mb-1">🧙</div>
          <div className="text-sm font-bold">You</div>
          <div className="w-full bg-slate-200 rounded-full h-4 mt-1">
            <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${playerHP}%` }} />
          </div>
          <div className="text-xs mt-1">{playerHP}/100 HP</div>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-1">🤖</div>
          <div className="text-sm font-bold">AI Rival</div>
          <div className="w-full bg-slate-200 rounded-full h-4 mt-1">
            <div className="bg-rose-500 h-4 rounded-full transition-all" style={{ width: `${enemyHP}%` }} />
          </div>
          <div className="text-xs mt-1">{enemyHP}/100 HP</div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">Turn {turn}</div>
      <Card className="p-4 w-full max-w-md text-center">
        <div className="text-2xl font-bold mb-3">{q.question}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.choices.map((c) => (
            <Button key={c} onClick={() => { setAnswer(String(c)); setTimeout(() => { if (c === q.answer) { setEnemyHP(h => Math.max(0, h - 20)); setScore(s => s + 10); setCorrect(c2 => c2 + 1); } else setPlayerHP(h => Math.max(0, h - 15)); setQ(genQuestion()); setTurn(t => t + 1); if (enemyHP - 20 <= 0 || playerHP - 15 <= 0) setPhase("results"); }, 300); }} className="rounded-full">
              {c}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// GAME 6: TOWER SIEGE
// ============================================================

function TowerSiegeGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState(5);
  const [baseHP, setBaseHP] = useState(3);
  const [q, setQ] = useState(genQuestion());
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<"play" | "results">("play");

  function answer(val: number) {
    setTotal(t => t + 1);
    if (val === q.answer) {
      setScore(s => s + 50);
      setCorrect(c => c + 1);
      setEnemies(e => e - 1);
      if (enemies - 1 <= 0) {
        if (wave >= 5) setPhase("results");
        else { setWave(w => w + 1); setEnemies(5); }
      }
    } else {
      setBaseHP(h => { if (h - 1 <= 0) { setPhase("results"); return 0; } return h - 1; });
    }
    setQ(genQuestion());
  }

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={total} onPlayAgain={() => { setScore(0); setWave(1); setEnemies(5); setBaseHP(3); setCorrect(0); setTotal(0); setPhase("play"); setQ(genQuestion()); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total })} />;
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full flex justify-between">
        <div className="text-lg font-bold text-amber-600">{score}</div>
        <div className="text-sm">Wave {wave}/5 · {enemies} enemies</div>
        <div className="text-sm">🏰 {baseHP} base HP</div>
      </div>
      <Card className="p-4 w-full max-w-md text-center">
        <div className="text-sm text-muted-foreground mb-2">Destroy the enemy! Answer correctly:</div>
        <div className="text-3xl font-bold mb-4">{q.question}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.choices.map((c) => (
            <Button key={c} onClick={() => answer(c)} className="rounded-full">{c}</Button>
          ))}
        </div>
      </Card>
      <div className="text-sm">✅ {correct} · {total} total</div>
    </div>
  );
}

// ============================================================
// GAME 7: PATTERN MASTER
// ============================================================

function PatternMasterGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [p, setP] = useState(genPattern());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [phase, setPhase] = useState<"play" | "results">("play");

  function submit() {
    if (!answer.trim()) return;
    const num = parseInt(answer);
    if (num === p.answer) {
      setScore(s => s + 20);
      setCorrect(c => c + 1);
      setFeedback("✅ Correct! " + p.explanation);
    } else {
      setScore(s => Math.max(0, s - 10));
      setFeedback("❌ Answer: " + p.answer + ". " + p.explanation);
    }
    setAnswer("");
    setTimeout(() => {
      setFeedback("");
      if (round >= 10) setPhase("results");
      else { setRound(r => r + 1); setP(genPattern()); }
    }, 2000);
  }

  if (phase === "results") {
    return <ResultsScreen score={score} correct={correct} total={10} onPlayAgain={() => { setRound(1); setScore(0); setCorrect(0); setP(genPattern()); setPhase("play"); }} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: correct * 3, correct, total: 10 })} />;
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full flex justify-between">
        <div className="text-lg font-bold">Round {round}/10</div>
        <div className="text-lg font-bold text-amber-600">{score}</div>
      </div>
      <Card className="p-6 w-full max-w-md text-center">
        <div className="text-sm text-muted-foreground mb-3">What comes next?</div>
        <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-4">
          {p.sequence.map((n, i) => (
            <span key={i} className="px-3 py-1 bg-emerald-100 rounded-lg">{n}</span>
          ))}
          <span className="px-3 py-1 border-2 border-dashed border-muted-foreground/30 rounded-lg">?</span>
        </div>
        <Input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your answer"
          className="text-center text-xl h-12 rounded-xl"
        />
        <Button onClick={submit} className="w-full mt-3 rounded-full" disabled={!answer.trim()}>Submit</Button>
      </Card>
      {feedback && <div className="text-sm font-semibold text-center">{feedback}</div>}
    </div>
  );
}

// ============================================================
// GAME 8: MATH MEMORY
// ============================================================

function MathMemoryGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const pairs = useRef([
    { a: "1/2", b: "0.5" }, { a: "1/4", b: "0.25" }, { a: "3/4", b: "0.75" },
    { a: "2×3", b: "6" }, { a: "25%", b: "1/4" }, { a: "50%", b: "1/2" },
    { a: "10%", b: "0.1" }, { a: "5×4", b: "20" },
  ]);
  const [cards] = useState(() => {
    const arr = [...pairs.current.flatMap(p => [{ id: 0, text: p.a, pair: p.a + p.b }, { id: 0, text: p.b, pair: p.a + p.b }])];
    arr.forEach((c, i) => { c.id = i; });
    return arr.sort(() => Math.random() - 0.5);
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(90);
  const [phase, setPhase] = useState<"play" | "results">("play");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => { if (t <= 1) { setPhase("results"); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (matched.length === 8) setPhase("results");
  }, [matched]);

  function flip(idx: number) {
    if (flipped.includes(idx) || matched.includes(cards[idx].pair)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (cards[a].pair === cards[b].pair) {
        setMatched(m => [...m, cards[a].pair]);
        setScore(s => s + 50);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }

  if (phase === "results") {
    return <ResultsScreen score={score} correct={matched.length} total={8} onPlayAgain={() => window.location.reload()} onClose={() => onClose({ score, xpEarned: Math.floor(score / 5), brainEnergyEarned: matched.length * 3, correct: matched.length, total: 8 })} />;
  }

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-full flex justify-between">
        <div className="text-lg font-bold text-amber-600">{score}</div>
        <div className="text-sm">⏱ {time}s · {moves} moves</div>
        <div className="text-sm">{matched.length}/8 matched</div>
      </div>
      <div className="text-xs text-muted-foreground text-center">Match equivalent values!</div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(card.pair);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`w-16 h-20 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${isFlipped ? "bg-emerald-100 text-emerald-700" : "bg-purple-500 text-white"}`}
            >
              {isFlipped ? card.text : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// GAME 9: BOSS BATTLE
// ============================================================

function BossBattleGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const [bossHP, setBossHP] = useState(500);
  const [playerHP, setPlayerHP] = useState(100);
  const [q, setQ] = useState(genQuestion());
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [bossTimer, setBossTimer] = useState(15);
  const [phase, setPhase] = useState<"play" | "results">("play");

  useEffect(() => {
    const timer = setInterval(() => {
      setBossTimer((t) => {
        if (t <= 1) {
          setPlayerHP(h => { if (h - 20 <= 0) { setPhase("results"); return 0; } return h - 20; });
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function answer(val: number) {
    setTotal(t => t + 1);
    if (val === q.answer) {
      const dmg = 30 + Math.floor(Math.random() * 20);
      setBossHP(h => { if (h - dmg <= 0) { setPhase("results"); return 0; } return h - dmg; });
      setScore(s => s + dmg);
      setCorrect(c => c + 1);
    } else {
      setPlayerHP(h => { if (h - 25 <= 0) { setPhase("results"); return 0; } return h - 25; });
    }
    setQ(genQuestion());
  }

  if (phase === "results") {
    const won = bossHP <= 0;
    return <ResultsScreen score={score + (won ? 100 : 0)} correct={correct} total={total} onPlayAgain={() => { setBossHP(500); setPlayerHP(100); setScore(0); setCorrect(0); setTotal(0); setPhase("play"); setQ(genQuestion()); }} onClose={() => onClose({ score: score + (won ? 100 : 0), xpEarned: Math.floor((score + (won ? 100 : 0)) / 5), brainEnergyEarned: correct * 3, correct, total })} />;
  }

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-full text-center">
        <div className="text-5xl mb-1">🐉</div>
        <div className="text-sm font-bold text-rose-600">Math Dragon</div>
        <div className="w-full bg-slate-200 rounded-full h-6 mt-1 relative">
          <div className="bg-gradient-to-r from-rose-500 to-red-700 h-6 rounded-full transition-all" style={{ width: `${(bossHP / 500) * 100}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{bossHP}/500 HP</span>
        </div>
      </div>
      <div className="w-full text-center">
        <div className="text-sm">Your HP: {playerHP}/100</div>
        <div className="w-full bg-slate-200 rounded-full h-4 mt-1">
          <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${playerHP}%` }} />
        </div>
      </div>
      <div className={`text-sm font-bold ${bossTimer <= 5 ? "text-red-500 animate-pulse" : "text-amber-600"}`}>
        ⏱ Dragon attacks in {bossTimer}s
      </div>
      <Card className="p-4 w-full max-w-md text-center">
        <div className="text-2xl font-bold mb-3">{q.question}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.choices.map((c) => (
            <Button key={c} onClick={() => answer(c)} className="rounded-full">{c}</Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// GAME 10: LEAPER QUEST (simplified Mario-style)
// ============================================================

function LeaperQuestGame({ onClose }: { onClose: (r: GameResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [coins, setCoins] = useState(0);
  const [phase, setPhase] = useState<"play" | "results">("play");
  const stateRef = useRef({
    px: 100, py: 300, vy: 0, onGround: true, worldX: 0,
    coins: [] as { x: number; y: number; collected: boolean }[],
    enemies: [] as { x: number; y: number; dir: number }[],
    platforms: [] as { x: number; y: number; w: number; h: number }[],
    frame: 0,
    jumpHeld: false,
    lives: 3,
    score: 0,
    coinCount: 0,
    gameOver: false,
  });
  const rafRef = useRef<number>(0);

  // Init level
  useEffect(() => {
    const s = stateRef.current;
    s.platforms = [];
    s.coins = [];
    s.enemies = [];
    // Ground segments with gaps
    for (let i = 0; i < 100; i++) {
      if (i % 5 !== 4) { // gap every 5th segment
        s.platforms.push({ x: i * 100, y: 380, w: 100, h: 80 });
        // Coins above platforms
        if (Math.random() > 0.3) s.coins.push({ x: i * 100 + 50, y: 300, collected: false });
        // Enemies on some platforms
        if (Math.random() > 0.7) s.enemies.push({ x: i * 100 + 50, y: 340, dir: 1 });
      }
      // Floating platforms
      if (i % 3 === 0 && i % 5 !== 4) {
        s.platforms.push({ x: i * 100 + 20, y: 280, w: 60, h: 20 });
        if (Math.random() > 0.5) s.coins.push({ x: i * 100 + 50, y: 240, collected: false });
      }
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (phase !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800, H = 460;
    canvas.width = W;
    canvas.height = H;

    const GRAVITY = 0.8;
    const JUMP_V = -14;
    const RUN_SPEED = 3;

    const loop = () => {
      const s = stateRef.current;
      s.frame++;

      // Auto-run
      s.worldX += RUN_SPEED;
      s.px += RUN_SPEED;

      // Gravity
      s.vy += GRAVITY;
      if (s.vy > 18) s.vy = 18;
      s.py += s.vy;

      // Variable jump
      if (s.jumpHeld && s.vy < 0) s.vy += -0.3;

      // Platform collision (landing on top)
      s.onGround = false;
      for (const p of s.platforms) {
        if (s.px + 30 > p.x && s.px < p.x + p.w && s.py + 40 >= p.y && s.py + 40 <= p.y + 20 && s.vy >= 0) {
          s.py = p.y - 40;
          s.vy = 0;
          s.onGround = true;
        }
      }

      // Fall off screen = lose life
      if (s.py > H + 100) {
        s.lives--;
        setLives(s.lives);
        if (s.lives <= 0) {
          s.gameOver = true;
          setPhase("results");
          return;
        }
        s.py = 300;
        s.vy = 0;
        s.px = s.worldX + 100;
      }

      // Coin collection
      for (const c of s.coins) {
        if (!c.collected && Math.abs(c.x - s.px) < 30 && Math.abs(c.y - s.py) < 30) {
          c.collected = true;
          s.coinCount++;
          s.score += 10;
          setCoins(s.coinCount);
          setScore(s.score);
        }
      }

      // Enemy collision
      for (const e of s.enemies) {
        e.x += e.dir * 1.5;
        if (e.x % 100 < 2 || e.x % 100 > 98) e.dir *= -1;

        if (Math.abs(e.x - s.px) < 30 && Math.abs(e.y - s.py) < 30) {
          if (s.vy > 0 && s.py < e.y) {
            // Stomp!
            s.vy = JUMP_V * 0.7;
            s.score += 20;
            setScore(s.score);
            e.x = -1000; // remove
          } else {
            // Hit!
            s.lives--;
            setLives(s.lives);
            if (s.lives <= 0) { s.gameOver = true; setPhase("results"); return; }
            s.py = 300; s.vy = 0;
          }
        }
      }

      // Math checkpoint every 5 coins
      if (s.coinCount > 0 && s.coinCount % 5 === 0) {
        // Bonus: just give XP
        s.score += 50;
        setScore(s.score);
        s.coinCount++; // prevent re-trigger
      }

      // === RENDER ===
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#60a5fa");
      sky.addColorStop(1, "#dbeafe");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Camera offset
      const camX = s.px - 200;

      // Platforms
      ctx.save();
      ctx.translate(-camX, 0);
      for (const p of s.platforms) {
        if (p.x + p.w < camX - 50 || p.x > camX + W + 50) continue;
        ctx.fillStyle = p.y === 380 ? "#22c55e" : "#16a34a";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Top highlight
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(p.x, p.y, p.w, 4);
      }

      // Coins
      for (const c of s.coins) {
        if (c.collected) continue;
        if (c.x < camX - 50 || c.x > camX + W + 50) continue;
        const bob = Math.sin(s.frame * 0.1 + c.x * 0.01) * 4;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(c.x, c.y + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f59e0b";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("$", c.x, c.y + 4 + bob);
      }

      // Enemies
      for (const e of s.enemies) {
        if (e.x < -500) continue;
        if (e.x < camX - 50 || e.x > camX + W + 50) continue;
        ctx.fillStyle = "#7c3aed";
        ctx.beginPath();
        ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👾", e.x, e.y + 5);
      }

      // Player (fox)
      const px = s.px - camX;
      const py = s.py;
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(px + 15, py + 42, 15, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px, py, 30, 40);
      ctx.fillStyle = "#fff7ed";
      ctx.fillRect(px + 5, py + 15, 20, 20);
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(px + 10, py + 12, 2, 0, Math.PI * 2);
      ctx.arc(px + 20, py + 12, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // HUD overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`❤️`.repeat(s.lives), 10, 25);
      ctx.fillText(`🪙 ${s.coinCount}`, 10, 50);
      ctx.fillText(`Score: ${s.score}`, 10, 75);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Jump controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        const s = stateRef.current;
        if (s.onGround) {
          s.vy = -14;
          s.onGround = false;
          s.jumpHeld = true;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        stateRef.current.jumpHeld = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function handleTap() {
    const s = stateRef.current;
    if (s.onGround) { s.vy = -14; s.onGround = false; s.jumpHeld = true; }
  }

  function handleTouchEnd() {
    stateRef.current.jumpHeld = false;
  }

  if (phase === "results") {
    const s = stateRef.current;
    return <ResultsScreen score={s.score} correct={Math.floor(s.coinCount / 5)} total={Math.floor(s.coinCount / 5) + 1} onPlayAgain={() => { s.lives = 3; s.score = 0; s.coinCount = 0; s.px = 100; s.py = 300; s.vy = 0; s.worldX = 0; s.gameOver = false; setScore(0); setLives(3); setCoins(0); setPhase("play"); }} onClose={() => onClose({ score: s.score, xpEarned: Math.floor(s.score / 5), brainEnergyEarned: Math.floor(s.coinCount / 5) * 3, correct: Math.floor(s.coinCount / 5), total: Math.floor(s.coinCount / 5) + 1 })} />;
  }

  return (
    <div className="p-4 flex flex-col items-center gap-2">
      <div className="w-full flex justify-between">
        <div className="text-lg font-bold">❤️{"️".repeat(Math.max(0, lives - 1))}{"🖤".repeat(Math.max(0, 3 - lives))}</div>
        <div className="text-lg font-bold text-amber-600">🪙 {coins} · {score}</div>
      </div>
      <canvas
        ref={canvasRef}
        className="mv-canvas-smooth rounded-2xl shadow-lg cursor-pointer"
        style={{ touchAction: "none" }}
        onClick={handleTap}
        onTouchStart={handleTap}
        onTouchEnd={handleTouchEnd}
      />
      <div className="text-xs text-muted-foreground">Space / ↑ / Tap to jump · Hold for higher</div>
    </div>
  );
}
