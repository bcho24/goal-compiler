import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import type { CompatType } from '@/lib/types';

function buildFreeChatPrompt(
  goalText: string,
  aiUnderstanding: string | null,
  messages: { role: 'user' | 'assistant'; content: string }[]
): string {
  const understandingContext = aiUnderstanding
    ? `\n\nCurrent AI understanding of the goal:\n${aiUnderstanding}`
    : '';

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `You are a helpful assistant supporting a user who is currently in the "goal clarification" stage of a goal-planning process.

Current goal being clarified: "${goalText}"${understandingContext}

Your role:
- Answer the user's questions honestly and helpfully
- Keep responses focused and relevant to the goal clarification context
- Gently remind the user if they are drifting far from goal clarification
- Do NOT automatically modify the left-side goal understanding - the user must do that manually
- Be concise but thorough

Conversation so far:
${conversationHistory}

Respond to the user's latest message. Use the same language as the user.`;
}

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

    const prompt = buildFreeChatPrompt(goalText, aiUnderstanding, messages);

    if ((compatType as CompatType) === 'anthropic') {
      // Anthropic-compat: use @anthropic-ai/sdk streaming
      const client = new Anthropic({
        apiKey,
        baseURL: baseURL || undefined,
      });

      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
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
