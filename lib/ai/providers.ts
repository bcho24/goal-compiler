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
}

export async function callAI(params: CallAIParams, prompt: string): Promise<string> {
  const { compatType, baseURL, apiKey, model, temperature = 0.7 } = params;

  if (compatType === 'anthropic') {
    return callAnthropic({ baseURL, apiKey, model, temperature }, prompt);
  }

  return callOpenAICompat({ baseURL, apiKey, model, temperature }, prompt);
}

async function callAnthropic(
  params: { baseURL: string; apiKey: string; model: string; temperature: number },
  prompt: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    baseURL: params.baseURL || undefined,
  });

  const response = await client.messages.create({
    model: params.model,
    max_tokens: 4096,
    temperature: params.temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  console.log('[Anthropic-compat] Raw response:', JSON.stringify(response, null, 2));

  if (response.content && Array.isArray(response.content)) {
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        return block.text;
      }
    }
    // Some providers return content blocks without a type field
    const firstBlock = response.content[0];
    if (typeof firstBlock === 'string') {
      return firstBlock;
    }
    if (firstBlock && typeof firstBlock === 'object' && 'text' in firstBlock) {
      return (firstBlock as { text: string }).text;
    }
  }

  // Fallback: try common alternative response shapes
  const raw = response as unknown as Record<string, unknown>;
  if (typeof raw.content === 'string') {
    return raw.content;
  }
  if (raw.completion && typeof raw.completion === 'string') {
    return raw.completion;
  }

  console.error('[Anthropic-compat] Cannot extract text from response:', JSON.stringify(response));
  throw new Error('Cannot extract text from Anthropic-compatible API response');
}

async function callOpenAICompat(
  params: { baseURL: string; apiKey: string; model: string; temperature: number },
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
