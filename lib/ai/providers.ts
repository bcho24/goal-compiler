import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import type { CompatType } from '@/lib/types';

/**
 * Extracts the first complete JSON object from a string using brace-depth counting.
 * Unlike a greedy regex, this correctly handles cases where the model appends
 * explanatory text after the JSON that also contains { } characters.
 */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }

  return null;
}

/**
 * Cleans common model output artifacts from a JSON string before parsing:
 * - Single-line comments injected inside JSON
 * - Trailing commas before } or ]
 */
export function cleanJsonString(jsonStr: string): string {
  return jsonStr
    .replace(/(?<=[,\[\{:\s])\/\/[^\n]*/g, '')
    .replace(/,\s*([}\]])/g, '$1');
}

export interface CallAIParams {
  compatType: CompatType;
  baseURL: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** For Anthropic: prefill the assistant turn (e.g. '{') to skip preamble */
  prefill?: string;
  /**
   * Enable Anthropic prompt caching. When true, the static portion of the prompt
   * (everything except dynamic user data) is sent with cache_control to reduce TTFT.
   * Only works with official Anthropic API — disable for third-party endpoints.
   */
  enableCache?: boolean;
  /**
   * Split point index in the prompt string. Characters [0..staticEnd] are treated
   * as the static (cacheable) portion; the rest is dynamic.
   * If omitted, the first 80% of the prompt is treated as static.
   */
  staticEnd?: number;
}

export async function callAI(params: CallAIParams, prompt: string): Promise<string> {
  const { compatType, baseURL, apiKey, model, temperature = 0.7, maxTokens, prefill, enableCache, staticEnd } = params;

  if (compatType === 'anthropic') {
    return callAnthropic({ baseURL, apiKey, model, temperature, maxTokens, prefill, enableCache, staticEnd }, prompt);
  }

  return callOpenAICompat({ baseURL, apiKey, model, temperature, maxTokens }, prompt);
}

async function callAnthropic(
  params: { baseURL: string; apiKey: string; model: string; temperature: number; maxTokens?: number; prefill?: string; enableCache?: boolean; staticEnd?: number },
  prompt: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    baseURL: params.baseURL || undefined,
  });

  // Build user content — optionally split into cacheable static + dynamic segments
  let userContent: Anthropic.Messages.MessageParam['content'];
  if (params.enableCache) {
    const splitAt = params.staticEnd ?? Math.floor(prompt.length * 0.8);
    const staticPart = prompt.slice(0, splitAt);
    const dynamicPart = prompt.slice(splitAt);
    userContent = [
      { type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } } as Anthropic.Messages.TextBlockParam & { cache_control: { type: 'ephemeral' } },
      ...(dynamicPart ? [{ type: 'text' as const, text: dynamicPart }] : []),
    ];
  } else {
    userContent = prompt;
  }

  const msgs: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: userContent }];
  if (params.prefill) {
    msgs.push({ role: 'assistant', content: params.prefill });
  }

  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature,
    messages: msgs,
  });

  let text = '';
  if (response.content && Array.isArray(response.content)) {
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        text = block.text;
        break;
      }
    }
    if (!text) {
      const firstBlock = response.content[0];
      if (typeof firstBlock === 'string') {
        text = firstBlock;
      } else if (firstBlock && typeof firstBlock === 'object' && 'text' in firstBlock) {
        text = (firstBlock as { text: string }).text;
      }
    }
  }

  if (!text) {
    const raw = response as unknown as Record<string, unknown>;
    if (typeof raw.content === 'string') text = raw.content;
    else if (raw.completion && typeof raw.completion === 'string') text = raw.completion;
  }

  if (!text) {
    throw new Error('Cannot extract text from Anthropic-compatible API response');
  }

  return params.prefill ? params.prefill + text : text;
}

async function callOpenAICompat(
  params: { baseURL: string; apiKey: string; model: string; temperature: number; maxTokens?: number },
  prompt: string
): Promise<string> {
  const openai = createOpenAI({
    apiKey: params.apiKey,
    baseURL: params.baseURL || undefined,
  });

  const result = await generateText({
    model: openai.chat(params.model),
    prompt,
    temperature: params.temperature,
  });

  return result.text;
}
