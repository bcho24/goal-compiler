'use client';

import { parsePartialJson } from 'ai';

/**
 * Reads a text/plain streaming response containing JSON,
 * calling onPartial with each successfully parsed partial object.
 * Returns the fully accumulated text for final parsing.
 */
export async function readStreamingJson<T>(
  response: Response,
  onPartial: (partial: DeepPartial<T>) => void
): Promise<T> {
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    try {
      const partial = parsePartialJson(accumulated);
      if (partial && typeof partial === 'object') {
        onPartial(partial as DeepPartial<T>);
      }
    } catch {
      // partial parse failed - keep accumulating
    }
  }

  // Final parse of complete response
  try {
    return JSON.parse(accumulated) as T;
  } catch {
    // Try extracting JSON object if there's surrounding text
    const match = accumulated.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Failed to parse final JSON response');
  }
}

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;
