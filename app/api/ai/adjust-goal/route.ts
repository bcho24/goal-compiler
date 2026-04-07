import { NextRequest, NextResponse } from 'next/server';
import { callAI, extractJsonObject, cleanJsonString } from '@/lib/ai/providers';
import { buildAdjustGoalPrompt } from '@/lib/ai/prompts';
import type { CompatType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { goalText, clarifications, userRequest, adjustmentQA, compatType, baseURL, apiKey, model } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured / API Key 未配置' }, { status: 400 });
    }

    const prompt = buildAdjustGoalPrompt(
      goalText,
      clarifications || [],
      userRequest,
      adjustmentQA || []
    );

    const text = await callAI(
      { compatType: compatType as CompatType, baseURL, apiKey, model, temperature: 0.5 },
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
    console.error('[/api/ai/adjust-goal] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
