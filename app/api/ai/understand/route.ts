import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import { buildUnderstandPrompt } from '@/lib/ai/prompts';
import type { CompatType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { goalText, previousUnderstanding, userNote, latestRoundQA, compatType, baseURL, apiKey, model } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured / API Key 未配置' }, { status: 400 });
    }

    const prompt = buildUnderstandPrompt(goalText, previousUnderstanding, userNote, latestRoundQA);

    if ((compatType as CompatType) === 'anthropic') {
      const client = new Anthropic({ apiKey, baseURL: baseURL || undefined });

      const msgs: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: prompt }];
      msgs.push({ role: 'assistant', content: '{' });

      const stream = client.messages.stream({ model, max_tokens: 800, messages: msgs });

      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode('{'));
          stream.on('text', (text) => {
            controller.enqueue(new TextEncoder().encode(text));
          });
          try { await stream.finalMessage(); } catch (e) { controller.error(e); return; }
          controller.close();
        },
        cancel() { stream.abort(); },
      });

      return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } else {
      const openai = createOpenAI({ apiKey, baseURL: baseURL || undefined });

      const result = streamText({
        model: openai.chat(model),
        prompt,
        temperature: 0.7,
      });

      return result.toTextStreamResponse();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/ai/understand] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
