import { NextRequest, NextResponse } from 'next/server';
import { callAI, extractJsonObject, cleanJsonString } from '@/lib/ai/providers';
import { buildClarifyIteratePrompt } from '@/lib/ai/prompts';
import type { CompatType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { goalText, previousUnderstanding, latestRoundQA, compatType, baseURL, apiKey, model, enablePromptCaching } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured / API Key 未配置' }, { status: 400 });
    }

    if (!previousUnderstanding || !latestRoundQA?.length) {
      return NextResponse.json({ error: 'previousUnderstanding and latestRoundQA are required' }, { status: 400 });
    }

    const prompt = buildClarifyIteratePrompt(goalText, previousUnderstanding, latestRoundQA);

    const text = await callAI(
      { compatType: compatType as CompatType, baseURL, apiKey, model, temperature: 0.7, maxTokens: 1200, prefill: '{', enableCache: enablePromptCaching },
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
    console.error('[/api/ai/clarify-iterate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
