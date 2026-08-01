/**
 * POST /api/questions/generate
 * Body: { topicSlug, difficulty?, curriculumCode?, useAI? }
 * Generates a question via AI or template, persists to DB, returns GeneratedQuestion.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateQuestion } from "@/lib/ai/question-generator";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { topicSlug, difficulty, curriculumCode, useAI } = body;

    if (!topicSlug) {
      return NextResponse.json({ error: "topicSlug is required" }, { status: 400 });
    }

    const topic = await db.curriculumTopic.findFirst({
      where: { slug: topicSlug },
    });
    if (!topic) {
      return NextResponse.json({ error: `Unknown topic: ${topicSlug}` }, { status: 404 });
    }

    const generated = await generateQuestion({
      topicSlug,
      difficulty: difficulty ?? 3,
      curriculumCode: curriculumCode ?? "COMMON-CORE",
      useAI: useAI ?? true,
    });

    const question = await db.question.create({
      data: {
        topicId: topic.id,
        questionType: generated.questionType,
        prompt: generated.prompt,
        promptLatex: generated.promptLatex ?? "",
        choices: JSON.stringify(generated.choices ?? []),
        correctAnswer: generated.correctAnswer,
        acceptedAnswers: JSON.stringify(generated.acceptedAnswers ?? []),
        explanation: generated.explanation,
        hint: generated.hint,
        commonMistakes: JSON.stringify(generated.commonMistakes ?? []),
        difficulty: generated.difficulty,
        estimatedSolveSec: generated.estimatedSolveSec,
        bloomsLevel: generated.bloomsLevel,
        scenario: generated.scenario,
        metadata: JSON.stringify(generated.metadata ?? {}),
        generatedByAI: useAI ?? true,
        authorId: user.id,
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: "question_generated",
        eventProps: JSON.stringify({ topicSlug, difficulty: generated.difficulty, questionId: question.id }),
        anonymized: false,
      },
    });

    return NextResponse.json({
      ...generated,
      id: question.id,
      topicId: topic.id,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
