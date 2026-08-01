"use client";

/**
 * MathVerse — Practice View
 *
 * Three-phase practice flow:
 *   Phase 1 — Setup: pick curriculum / grade / topic / difficulty / mode
 *   Phase 2 — Question: render prompt, choices / input, hint, tutor, timer
 *   Phase 3 — Result: correct/incorrect feedback, explanation, rewards, mastery
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Brain, Coins, Zap, Trophy, Sparkles, Lightbulb, MessageCircle, Timer,
  CheckCircle2, XCircle, ChevronRight, RotateCcw, ArrowLeft, Flame, Crown,
  TrendingUp, Loader2, Target, Gauge,
} from "lucide-react";
import { CURRICULA, GRADE_6_TOPICS } from "@/lib/curriculum/data";
import type { CurriculumTopicDef } from "@/lib/curriculum/data";
import type {
  CurriculumCode, GeneratedQuestion, AttemptResult,
} from "@/lib/types";
import { TutorPanel } from "./tutor-panel";

type Phase = "setup" | "question" | "result";
type Mode = "PRACTICE" | "TIMED" | "ENDLESS" | "CHALLENGE" | "WEAK" | "REVISION";

const MODES: { id: Mode; label: string; icon: typeof Brain; hint: string }[] = [
  { id: "PRACTICE",  label: "Practice",     icon: Target,    hint: "Take your time, no pressure" },
  { id: "TIMED",     label: "Timed",        icon: Timer,     hint: "Beat the clock" },
  { id: "ENDLESS",   label: "Endless",      icon: Zap,       hint: "Auto-next until you stop" },
  { id: "CHALLENGE", label: "Challenge",    icon: Crown,     hint: "Harder questions, bigger rewards" },
  { id: "WEAK",      label: "Weak Topics",  icon: TrendingUp, hint: "Focus on what needs work" },
  { id: "REVISION",  label: "Revision",     icon: RotateCcw,  hint: "Re-attempt mastered topics" },
];

const BLOOMS_COLOR: Record<string, string> = {
  REMEMBER: "bg-slate-100 text-slate-700",
  UNDERSTAND: "bg-emerald-100 text-emerald-700",
  APPLY: "bg-amber-100 text-amber-700",
  ANALYZE: "bg-rose-100 text-rose-700",
  EVALUATE: "bg-purple-100 text-purple-700",
  CREATE: "bg-fuchsia-100 text-fuchsia-700",
};

export function PracticeView() {
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const setActivePractice = useAppStore((s) => s.setActivePractice);
  const setView = useAppStore((s) => s.setView);
  const activeTopicSlug = useAppStore((s) => s.activeTopicSlug);
  const activeDifficulty = useAppStore((s) => s.activeDifficulty);

  // Setup state
  const [curriculum, setCurriculum] = useState<CurriculumCode>("COMMON-CORE");
  const [topic, setTopic] = useState<CurriculumTopicDef | null>(
    GRADE_6_TOPICS.find((t) => t.slug === activeTopicSlug) ?? null,
  );
  const [difficulty, setDifficulty] = useState<number>(activeDifficulty ?? 3);
  const [mode, setMode] = useState<Mode>("PRACTICE");

  // Phase state
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);

  // Timed-mode cutoff
  const [timeLimit] = useState(45);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [tutorOpen, setTutorOpen] = useState(false);

  // ============== Question lifecycle ==============
  const loadQuestion = useCallback(async (topicSlug?: string) => {
    const slug = topicSlug ?? topic?.slug;
    if (!slug) {
      toast.error("Pick a topic first");
      return;
    }
    setLoadingQuestion(true);
    setUserAnswer("");
    setHintVisible(false);
    setHintsUsed(0);
    setResult(null);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug: slug,
          difficulty: mode === "CHALLENGE" ? Math.min(5, difficulty + 1) : difficulty,
          curriculumCode: curriculum,
          useAI: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load question");
      setQuestion(data as GeneratedQuestion);
      setPhase("question");
      startTimeRef.current = Date.now();
      setTimerSec(0);
      setActivePractice(slug, difficulty);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load question");
    } finally {
      setLoadingQuestion(false);
    }
  }, [topic, mode, difficulty, curriculum, setActivePractice]);

  // Weak-topics helper: fetch progress, find weakest, use it
  const loadWeakTopic = useCallback(async () => {
    try {
      const res = await fetch("/api/progress");
      const data = await res.json();
      const weakest = data.weakestTopics?.[0];
      if (weakest) {
        const t = GRADE_6_TOPICS.find((x) => x.slug === weakest.topicSlug);
        if (t) {
          setTopic(t);
          await loadQuestion(t.slug);
          return;
        }
      }
      // No weak topics — fall back to first topic
      const fallback = GRADE_6_TOPICS[0];
      setTopic(fallback);
      await loadQuestion(fallback.slug);
    } catch {
      const fallback = GRADE_6_TOPICS[0];
      setTopic(fallback);
      await loadQuestion(fallback.slug);
    }
  }, [loadQuestion]);

  // ============== Submit attempt ==============
  const submitAnswer = useCallback(async () => {
    if (!question?.id || !userAnswer.trim()) {
      toast.error("Enter an answer first");
      return;
    }
    setSubmitting(true);
    const timeTaken = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    try {
      const res = await fetch("/api/questions/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          userAnswer: userAnswer.trim(),
          timeTakenSec: timeTaken,
          hintsUsed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      const r = data as AttemptResult;
      setResult(r);
      setPhase("result");
      setSessionCount((n) => n + 1);
      if (r.isCorrect) {
        setStreak((s) => s + 1);
        setSessionCorrect((n) => n + 1);
      } else {
        setStreak(0);
      }
      // Sync user store
      updateUser({
        xp: (user?.xp ?? 0) + r.xpEarned,
        coins: (user?.coins ?? 0) + r.coinsEarned,
        brainEnergy: r.newBrainEnergy,
        level: r.newLevel,
      });
      if (r.leveledUp) {
        toast.success(`🎉 Level Up! You're now level ${r.newLevel}!`);
      }
      if (r.achievementsUnlocked?.length) {
        setShowAchievements(true);
        r.achievementsUnlocked.forEach((slug) => {
          toast.success(`🏆 Achievement Unlocked: ${slug}`, { duration: 5000 });
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit answer");
    } finally {
      setSubmitting(false);
    }
  }, [question, userAnswer, hintsUsed, user, updateUser]);

  // ============== Timer ==============
  useEffect(() => {
    if (phase !== "question") return;
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTimerSec(elapsed);
      if (mode === "TIMED" && elapsed >= timeLimit) {
        clearInterval(interval);
        toast.error("⏰ Time's up!");
        if (userAnswer.trim()) submitAnswer();
        else {
          setUserAnswer("__timeout__");
          setTimeout(submitAnswer, 100);
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [phase, mode, timeLimit, userAnswer, submitAnswer]);

  // ============== Endless mode auto-next ==============
  useEffect(() => {
    if (phase === "result" && mode === "ENDLESS") {
      const t = setTimeout(() => loadQuestion(), 1800);
      return () => clearTimeout(t);
    }
  }, [phase, mode, loadQuestion]);

  // ============== Hint ==============
  function useHint() {
    if (!question?.hint) return;
    setHintVisible(true);
    setHintsUsed((n) => n + 1);
    toast.info("🧠 Hint revealed (1 Brain Energy)");
    updateUser({ brainEnergy: Math.max(0, (user?.brainEnergy ?? 0) - 1) });
  }

  // ============== Brain energy gate ==============
  const brainEnergy = user?.brainEnergy ?? 0;
  useEffect(() => {
    if (brainEnergy <= 0 && phase === "question") {
      toast.info("Out of brain energy — practicing restores it!");
    }
  }, [brainEnergy, phase]);

  // ============== Setup phase ==============
  if (phase === "setup") {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-emerald-600" /> Practice Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a topic and sharpen your math skills.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setView("world")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to World
          </Button>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatPill icon={Brain} label="Brain Energy" value={`${brainEnergy} / ${user?.maxBrainEnergy ?? 100}`} color="text-emerald-600" />
          <StatPill icon={Zap} label="Level" value={`${user?.level ?? 1}`} color="text-amber-600" />
          <StatPill icon={Coins} label="Coins" value={`${user?.coins ?? 0}`} color="text-yellow-600" />
          <StatPill icon={Flame} label="Streak" value={`${user?.streak ?? 0} days`} color="text-rose-600" />
        </div>

        {/* Curriculum selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Curriculum</CardTitle>
            <CardDescription>Choose your country&apos;s curriculum.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={curriculum} onValueChange={(v) => setCurriculum(v as CurriculumCode)}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto">
                {CURRICULA.map((c) => (
                  <TabsTrigger key={c.code} value={c.code} className="text-xs">
                    {c.region}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Topic grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Grade 6 Topics</h2>
            <span className="text-sm text-muted-foreground">{GRADE_6_TOPICS.length} topics available</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {GRADE_6_TOPICS.map((t) => (
              <TopicCard
                key={t.slug}
                topic={t}
                selected={topic?.slug === t.slug}
                onClick={() => setTopic(t)}
              />
            ))}
          </div>
        </div>

        {/* Difficulty + Mode */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-600" /> Difficulty
              </CardTitle>
              <CardDescription>Higher = harder questions & bigger rewards.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Slider
                  value={[difficulty]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(v) => setDifficulty(v[0])}
                  className="flex-1"
                  aria-label="Difficulty"
                />
                <Badge variant="outline" className="text-base px-3 py-1">{difficulty} / 5</Badge>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Easy</span><span>Medium</span><span>Hard</span><span>Expert</span><span>Master</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-600" /> Practice Mode
              </CardTitle>
              <CardDescription>How do you want to play?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${
                      mode === m.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                    aria-pressed={mode === m.id}
                  >
                    <m.icon className={`w-5 h-5 ${mode === m.id ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {MODES.find((m) => m.id === mode)?.hint}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Start */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView("world")}>Cancel</Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="lg"
                    disabled={!topic || loadingQuestion}
                    onClick={() => {
                      if (mode === "WEAK") loadWeakTopic();
                      else if (mode === "REVISION") {
                        const mastered = GRADE_6_TOPICS[Math.floor(Math.random() * GRADE_6_TOPICS.length)];
                        setTopic(mastered);
                        loadQuestion(mastered.slug);
                      } else {
                        loadQuestion();
                      }
                    }}
                    className="min-w-[180px]"
                  >
                    {loadingQuestion ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                    ) : (
                      <>Start Practice <ChevronRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!topic && <TooltipContent>Pick a topic first</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  // ============== Question / Result phases ==============
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPhase("setup")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Setup
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Brain className="w-3 h-3 text-emerald-600" /> {brainEnergy}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Zap className="w-3 h-3 text-amber-600" /> Lvl {user?.level ?? 1}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Coins className="w-3 h-3 text-yellow-600" /> {user?.coins ?? 0}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Flame className="w-3 h-3 text-rose-600" /> {streak}
          </Badge>
          {mode === "TIMED" && (
            <Badge variant={timerSec >= timeLimit - 10 ? "destructive" : "secondary"} className="gap-1">
              <Timer className="w-3 h-3" /> {timerSec}s
            </Badge>
          )}
        </div>
      </div>

      {/* Topic banner */}
      {topic && (
        <Card className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Topic</p>
              <p className="font-semibold">{topic.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={BLOOMS_COLOR[topic.bloomsLevel]}>{topic.bloomsLevel}</Badge>
              <Badge variant="outline">Difficulty {difficulty}/5</Badge>
              <Badge variant="outline" className="gap-1">
                <Target className="w-3 h-3" /> {sessionCorrect}/{sessionCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {phase === "question" && question && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <QuestionCard
              question={question}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              hintVisible={hintVisible}
              onUseHint={useHint}
              onSubmit={submitAnswer}
              submitting={submitting}
              inputRef={inputRef}
              onAskTutor={() => setTutorOpen(true)}
              timerSec={timerSec}
              timed={mode === "TIMED"}
              timeLimit={timeLimit}
            />
          </motion.div>
        )}

        {phase === "result" && result && question && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <ResultCard
              result={result}
              question={question}
              userAnswer={userAnswer}
              onNext={() => loadQuestion()}
              loadingNext={loadingQuestion}
              endless={mode === "ENDLESS"}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutor panel */}
      <TutorPanel
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        questionId={question?.id}
      />

      {/* Achievement overlay */}
      <AnimatePresence>
        {showAchievements && result?.achievementsUnlocked?.length ? (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              className="bg-card rounded-2xl p-6 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-3" />
              <h3 className="text-2xl font-bold mb-2">Achievement Unlocked!</h3>
              <div className="space-y-2 my-4">
                {result.achievementsUnlocked.map((slug) => (
                  <Badge key={slug} className="text-sm px-3 py-1.5">
                    🏆 {slug}
                  </Badge>
                ))}
              </div>
              <Button onClick={() => setShowAchievements(false)} className="w-full">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Topic Card
// ============================================================
function TopicCard({ topic, selected, onClick }: {
  topic: CurriculumTopicDef;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left p-3 rounded-xl border-2 transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
          : "border-border hover:border-emerald-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-semibold text-sm leading-tight">{topic.name}</h4>
        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{topic.description}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-[10px]">Diff {topic.difficulty}</Badge>
        <Badge className={`text-[10px] ${BLOOMS_COLOR[topic.bloomsLevel]}`}>{topic.bloomsLevel}</Badge>
      </div>
    </button>
  );
}

// ============================================================
// Stat pill
// ============================================================
function StatPill({ icon: Icon, label, value, color }: {
  icon: typeof Brain;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Question Card
// ============================================================
function QuestionCard({
  question, userAnswer, setUserAnswer, hintVisible, onUseHint, onSubmit,
  submitting, inputRef, onAskTutor, timerSec, timed, timeLimit,
}: {
  question: GeneratedQuestion;
  userAnswer: string;
  setUserAnswer: (v: string) => void;
  hintVisible: boolean;
  onUseHint: () => void;
  onSubmit: () => void;
  submitting: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAskTutor: () => void;
  timerSec: number;
  timed: boolean;
  timeLimit: number;
}) {
  const isMC = question.questionType === "MULTIPLE_CHOICE" || question.questionType === "TRUE_FALSE";
  const isWord = question.questionType === "WORD_PROBLEM";

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{question.questionType.replace("_", " ")}</Badge>
            <Badge variant="outline">Diff {question.difficulty}/5</Badge>
            <span className="text-xs text-muted-foreground">
              ~{question.estimatedSolveSec}s est.
            </span>
          </div>
          {timed && (
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-600" />
              <span className={`font-mono font-bold ${timerSec >= timeLimit - 10 ? "text-rose-600" : ""}`}>
                {Math.max(0, timeLimit - timerSec)}s
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario / prompt */}
        {isWord && question.scenario ? (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📖 Story</p>
            <p className="text-sm">{question.scenario}</p>
          </div>
        ) : null}

        <div>
          <p className="text-xs text-muted-foreground mb-1">Question</p>
          <p className="text-lg md:text-xl font-semibold leading-relaxed">
            {question.prompt}
          </p>
        </div>

        {/* Hint */}
        {hintVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 p-3"
          >
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Hint
            </p>
            <p className="text-sm">{question.hint}</p>
          </motion.div>
        )}

        {/* Answer area */}
        {isMC && question.choices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {question.choices.map((choice, i) => (
              <Button
                key={i}
                variant={userAnswer === choice ? "default" : "outline"}
                className="justify-start text-left h-auto py-3 px-4"
                onClick={() => setUserAnswer(choice)}
              >
                <span className="font-mono mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{choice}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div>
            <Label htmlFor="answer">Your answer</Label>
            <Input
              id="answer"
              ref={inputRef}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) onSubmit();
              }}
              placeholder="Type your answer..."
              className="text-lg"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">Press Enter to submit</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          {!hintVisible && (
            <Button variant="outline" size="sm" onClick={onUseHint}>
              <Lightbulb className="w-4 h-4 mr-1 text-amber-500" /> Hint
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onAskTutor}>
            <MessageCircle className="w-4 h-4 mr-1 text-emerald-600" /> Ask Tutor
          </Button>
        </div>
        <Button onClick={onSubmit} disabled={submitting || !userAnswer.trim()}>
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Submit</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// Result Card with animated counters
// ============================================================
function ResultCard({ result, question, userAnswer, onNext, loadingNext, endless }: {
  result: AttemptResult;
  question: GeneratedQuestion;
  userAnswer: string;
  onNext: () => void;
  loadingNext: boolean;
  endless: boolean;
}) {
  const correct = result.isCorrect;
  return (
    <Card className={`border-2 ${correct ? "border-emerald-500" : "border-rose-500"}`}>
      <CardHeader>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            correct ? "bg-emerald-100" : "bg-rose-100"
          }`}
        >
          {correct ? (
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          ) : (
            <XCircle className="w-9 h-9 text-rose-600" />
          )}
        </motion.div>
        <CardTitle className={`text-center text-2xl ${correct ? "text-emerald-700" : "text-rose-700"}`}>
          {correct ? "Correct!" : "Not quite"}
        </CardTitle>
        <CardDescription className="text-center">
          {correct ? "Nice work — keep it up!" : "Every mistake makes you stronger."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rewards row */}
        <div className="grid grid-cols-3 gap-2">
          <AnimatedCounter icon={Zap} label="XP" value={result.xpEarned} color="text-amber-600" />
          <AnimatedCounter icon={Coins} label="Coins" value={result.coinsEarned} color="text-yellow-600" />
          <AnimatedCounter icon={Brain} label="Brain" value={result.brainEnergyEarned} color="text-emerald-600" />
        </div>

        {/* Mastery */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Topic Mastery</span>
            <span className="font-medium">{Math.round(result.newMasteryScore * 100)}%</span>
          </div>
          <Progress value={result.newMasteryScore * 100} className="h-2" />
        </div>

        {/* Correct answer if wrong */}
        {!correct && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
              Correct answer
            </p>
            <p className="font-mono font-semibold">{question.correctAnswer}</p>
            <p className="text-xs text-muted-foreground mt-1">
              You answered: <span className="font-mono">{userAnswer}</span>
            </p>
          </div>
        )}

        {/* Explanation */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Explanation
          </p>
          <ScrollArea className="max-h-48">
            <p className="text-sm leading-relaxed">{result.explanation || question.explanation}</p>
          </ScrollArea>
        </div>

        {/* Quest progress */}
        {result.questProgress?.filter((q) => q.completed).length > 0 && (
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 p-3">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
              🎯 Quest progress
            </p>
            {result.questProgress.filter((q) => q.completed).map((q) => (
              <p key={q.questId} className="text-sm">
                ✅ {q.title} — {q.progress}/{q.target}
              </p>
            ))}
          </div>
        )}

        {result.leveledUp && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 p-3 text-center">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
              <Crown className="w-4 h-4" /> Level Up! You reached level {result.newLevel}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onNext} disabled={loadingNext} className="w-full" size="lg">
          {loadingNext ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading next...</>
          ) : endless ? (
            <><Zap className="w-4 h-4 mr-2" /> Auto-continuing...</>
          ) : (
            <>Next Question <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// Animated counter (counts up to value)
// ============================================================
function AnimatedCounter({ icon: Icon, label, value, color }: {
  icon: typeof Zap;
  label: string;
  value: number;
  color: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const start = Date.now();
    const startVal = 0;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (t >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [value]);
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{display > 0 ? `+${display}` : "0"}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default PracticeView;
