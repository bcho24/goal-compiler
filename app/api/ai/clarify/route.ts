import { NextRequest, NextResponse } from 'next/server';
import { callAI, extractJsonObject, cleanJsonString } from '@/lib/ai/providers';
import { buildClarifyPrompt, buildClarifyQuestionsPrompt } from '@/lib/ai/prompts';
import type { CompatType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { goalText, existingQA, aiUnderstanding, mode, compatType, baseURL, apiKey, model, enablePromptCaching } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured / API Key 未配置' }, { status: 400 });
    }

    // V2.1: questions_only mode uses AI understanding context
    const prompt = mode === 'questions_only' && aiUnderstanding
      ? buildClarifyQuestionsPrompt(goalText, aiUnderstanding, existingQA || [])
      : buildClarifyPrompt(goalText, existingQA || []);

    const text = await callAI(
      { compatType: compatType as CompatType, baseURL, apiKey, model, temperature: 0.7, maxTokens: 500, prefill: '{', enableCache: enablePromptCaching },
      prompt
    );

    const extracted = extractJsonObject(text);
    if (!extracted) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const parsed = JSON.parse(cleanJsonString(extracted));
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/ai/clarify] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
