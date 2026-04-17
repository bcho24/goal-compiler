import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import type { CompatType } from '@/lib/types';
import { buildFreeChatPrompt } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const { goalText, aiUnderstanding, messages, compatType, baseURL, apiKey, model } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured / API Key 未配置' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recentMessages = messages.slice(-10);
    const prompt = buildFreeChatPrompt(goalText, aiUnderstanding, recentMessages);

    if ((compatType as CompatType) === 'anthropic') {
      // Anthropic-compat: use @anthropic-ai/sdk streaming
      const client = new Anthropic({
        apiKey,
        baseURL: baseURL || undefined,
      });

      const stream = client.messages.stream({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const readable = new ReadableStream({
        async start(controller) {
          stream.on('text', (text) => {
            controller.enqueue(new TextEncoder().encode(text));
          });
          try {
            await stream.finalMessage();
          } catch (e) {
            controller.error(e);
            return;
          }
          controller.close();
        },
        cancel() {
          stream.abort();
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      // OpenAI-compat: use Vercel AI SDK streamText
      const openai = createOpenAI({
        apiKey,
        baseURL: baseURL || undefined,
      });

      const result = streamText({
        model: openai.chat(model),
        prompt,
        temperature: 0.7,
      });

      return result.toTextStreamResponse();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/ai/free-chat] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
