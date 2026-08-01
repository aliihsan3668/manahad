/**
 * POST /api/tutor
 * Body: { message, questionId?, sessionId? }
 * Chats with AI tutor; persists session messages.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tutorChat } from "@/lib/ai/tutor";
import type { GeneratedQuestion, TutorMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { message, questionId, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Load or start a session
    let session = sessionId
      ? await db.tutorSession.findUnique({ where: { id: sessionId } })
      : null;
    if (!session) {
      session = await db.tutorSession.create({
        data: {
          userId: user.id,
          questionId: questionId ?? null,
          messages: "[]",
        },
      });
    }

    // Load history
    let history: TutorMessage[] = [];
    try {
      history = JSON.parse(session.messages);
    } catch {
      history = [];
    }

    // Load question context if provided
    let question: GeneratedQuestion | undefined;
    if (questionId) {
      const q = await db.question.findUnique({
        where: { id: questionId },
        include: { topic: true },
      });
      if (q) {
        let choices: string[] = [];
        let acceptedAnswers: string[] = [];
        try { choices = JSON.parse(q.choices); } catch {}
        try { acceptedAnswers = JSON.parse(q.acceptedAnswers); } catch {}
        question = {
          id: q.id,
          topicId: q.topicId,
          topicSlug: q.topic.slug,
          topicName: q.topic.name,
          questionType: q.questionType as GeneratedQuestion["questionType"],
          prompt: q.prompt,
          promptLatex: q.promptLatex,
          choices,
          correctAnswer: q.correctAnswer,
          acceptedAnswers,
          explanation: q.explanation,
          hint: q.hint,
          commonMistakes: (() => {
            try { return JSON.parse(q.commonMistakes); } catch { return []; }
          })(),
          difficulty: q.difficulty,
          estimatedSolveSec: q.estimatedSolveSec,
          bloomsLevel: q.bloomsLevel as GeneratedQuestion["bloomsLevel"],
          scenario: q.scenario,
        };
      }
    }

    const response = await tutorChat({
      message,
      history,
      question,
      childName: user.displayName,
    });

    // Append the exchange
    const newMessages: TutorMessage[] = [
      ...history,
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: response.reply, timestamp: new Date().toISOString() },
    ];
    await db.tutorSession.update({
      where: { id: session.id },
      data: {
        messages: JSON.stringify(newMessages.slice(-50)),
        lastMessageAt: new Date(),
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: "tutor_chat",
        eventProps: JSON.stringify({ sessionId: session.id, questionId: questionId ?? null }),
        anonymized: false,
      },
    });

    return NextResponse.json({
      reply: response.reply,
      sessionId: session.id,
      suggestedActions: response.suggestedActions,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
