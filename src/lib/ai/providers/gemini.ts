import { AiError } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

/**
 * Call Google Gemini's generateContent endpoint with the caller's own key.
 * Returns the raw assistant text.
 */
export async function generateGemini(args: ProviderArgs): Promise<string> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args

  // Map model name: if user just typed 'gemini-2.5-flash', we use it,
  // but if they put an empty one or something, we default.
  const modelName = model || 'gemini-2.5-flash'
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  // Map messages to Gemini format (role: user / model)
  const mappedMessages = mergeConsecutive(messages).map((msg) => {
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }
  })

  // Build body
  const body: Record<string, any> = {
    contents: mappedMessages,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  }

  if (systemPrompt && systemPrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    }
  }

  let res: Response
  try {
    res = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Gemini', res)
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AiError('Gemini returned an empty response.', {
      code: 'empty_response',
    })
  }

  return text
}
