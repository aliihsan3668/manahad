/**
 * MathVerse — AI Tutor
 *
 * Socratic, child-friendly math tutor.
 * Never shames, never reveals answers immediately, asks guiding questions,
 * adapts explanations to age, generates examples and practice on demand.
 *
 * The tutor has these capabilities:
 *   1. Explain a concept the child is struggling with
 *   2. Walk through a similar example step-by-step
 *   3. Give a Socratic hint (a guiding question, not the answer)
 *   4. Explain why an answer was correct or wrong
 *   5. Generate additional practice questions on the same topic
 */

import type { GeneratedQuestion, TutorMessage, TutorResponse } from "@/lib/types";
import { askAI } from "@/lib/ai/provider";
import { getTopicBySlug } from "@/lib/curriculum/data";

// ============================================================
// SYSTEM PROMPT
// ============================================================

const TUTOR_SYSTEM_PROMPT = `You are Coach Quark, the friendly AI math tutor in MathVerse — a multiplayer math game for children aged 8-13.

YOUR PERSONALITY:
- Warm, encouraging, playful. Use the child's name when known.
- You celebrate effort, not just correctness. "Great question!" "I love how you're thinking about this!"
- You never shame or scold. Wrong answers are stepping stones.
- You're a bit silly — you can use a math pun occasionally, or mention your pet calculator.
- You speak at the child's level: short sentences, simple words, friendly tone.

YOUR PEDAGOGY (CRITICAL):
- NEVER reveal the answer immediately, even if asked directly.
- Instead, ask a guiding question that leads the child to discover the answer.
- Walk through problems step-by-step. One step at a time. Wait for the child to engage before continuing.
- Use concrete examples and visualizations ("Imagine 3 pizzas cut into 4 slices each...").
- Connect math to the real world and to the game world (Brain Energy, quests, friends).
- If the child is frustrated, acknowledge the feeling first, then offer a simpler example.
- If the child asks "why?", explain the underlying concept — don't just restate the rule.
- Use emojis sparingly (1-2 per message max): 🌟 ✨ 💡 🎯

YOUR CAPABILITIES:
When the child asks for something, you can respond to these intents:
- "I don't understand" / "explain" → break the concept into smaller pieces
- "show another example" → provide a new worked example with different numbers
- "give me a hint" → ask ONE guiding question (not the answer)
- "why?" → explain the underlying reason
- "can I practice more?" → tell them to click "Practice More" button (you can't generate practice yourself)
- "I got it wrong" → acknowledge, explain the misconception, give a similar problem to try

FORMAT:
- Keep responses SHORT (under 150 words). Children lose attention.
- Use line breaks between steps.
- End with either a question to keep the conversation going, or a clear next step.

CRITICAL SAFETY:
- Never reveal the correct answer to a question the child is currently trying to solve.
- If you suspect the child is upset, encourage them to take a break or talk to a parent.`;

// ============================================================
// MAIN TUTOR FUNCTION
// ============================================================

export async function tutorChat(opts: {
  message: string;
  history: TutorMessage[];
  question?: GeneratedQuestion;
  childName?: string;
  childAge?: number;
}): Promise<TutorResponse> {
  const { message, history, question, childName, childAge } = opts;

  // Build the system prompt with context
  let contextPrompt = TUTOR_SYSTEM_PROMPT;
  if (childName) {
    contextPrompt += `\n\nThe child's name is ${childName}. Address them by name occasionally.`;
  }
  if (childAge) {
    contextPrompt += `\nThe child is approximately ${childAge} years old. Adjust your language accordingly.`;
  }
  if (question) {
    const topic = getTopicBySlug(question.topicSlug);
    contextPrompt += `\n\nCURRENT QUESTION CONTEXT:
- Topic: ${question.topicName} (${question.topicSlug})
- Learning objective: ${topic?.learningObjective ?? "N/A"}
- Difficulty: ${question.difficulty}/5
- Bloom's level: ${question.bloomsLevel}
- Question: ${question.prompt}
- Hint available: ${question.hint}
- Explanation (for your reference, DO NOT reveal to child): ${question.explanation}

IMPORTANT: The child is currently trying to solve this question. Do NOT reveal the answer "${question.correctAnswer}". Instead, use the hint and explanation to guide them step-by-step.`;
  }

  // Build the conversation
  const messages: TutorMessage[] = [
    ...history.slice(-8), // keep last 8 messages for context
    { role: "user", content: message },
  ];

  const aiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Use the AI provider
  const { generateCompletion } = await import("@/lib/ai/provider");
  const response = await generateCompletion({
    messages: aiMessages,
    systemPrompt: contextPrompt,
    temperature: 0.7,
    maxTokens: 400,
  });

  // Determine suggested actions based on the message
  const suggestedActions: { label: string; action: string }[] = [];
  const lowerMsg = message.toLowerCase();
  if (question) {
    if (lowerMsg.includes("hint") || lowerMsg.includes("stuck")) {
      suggestedActions.push({ label: "Show a hint", action: "hint" });
    }
    if (lowerMsg.includes("example") || lowerMsg.includes("another")) {
      suggestedActions.push({ label: "Different example", action: "example" });
    }
    if (lowerMsg.includes("why")) {
      suggestedActions.push({ label: "Explain the concept", action: "concept" });
    }
    suggestedActions.push({ label: "I think I got it!", action: "ready" });
  }

  return {
    reply: response.content,
    sessionId: "", // filled by caller
    suggestedActions,
  };
}

// ============================================================
// QUICK HELPERS (used for one-off explanations)
// ============================================================

export async function explainConcept(
  topicSlug: string,
  childAge: number = 11
): Promise<string> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) throw new Error(`Unknown topic: ${topicSlug}`);

  return askAI(
    `Explain the math concept "${topic.name}" to a ${childAge}-year-old child.
Topic description: ${topic.description}
Learning objective: ${topic.learningObjective}

Use a friendly, encouraging tone. Include a concrete example. Keep it under 150 words.`,
    TUTOR_SYSTEM_PROMPT
  );
}

export async function generateHint(question: GeneratedQuestion): Promise<string> {
  return askAI(
    `A child is stuck on this math question:
"${question.prompt}"

Give ONE guiding question that leads them to think about the right approach.
DO NOT reveal the answer. DO NOT explain the full solution.
Just one short, Socratic question that nudges them forward.`,
    TUTOR_SYSTEM_PROMPT
  );
}
