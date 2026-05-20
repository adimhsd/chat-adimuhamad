import { createOpenAI } from '@ai-sdk/openai';
import { retrieveRelevantDocuments, buildRAGContext } from '@/lib/rag';
import { saveChatHistory } from '@/lib/postgres';

export const runtime = 'nodejs';
const maxDuration = 60;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * System prompt untuk blog assistant
 */
function getSystemPrompt(): string {
  return process.env.NEXT_PUBLIC_SYSTEM_PROMPT || `Anda adalah asisten personal blog Adi Muhamad yang helpful dan friendly. Anda membantu menjawab pertanyaan berdasarkan konten blog yang tersedia. Gunakan informasi dari konteks yang diberikan untuk memberikan jawaban yang akurat dan relevan. gunakan emote saat merespon chat agar terlihat hangat dan freindly. jangan menjawab hal di luar konteks atau pengetahuan yang ada di databse vektor. jika user bertanya hal-hal di luar itu anda jawab dengan mohon maaf saya tidak bisa menjawab pertanyaan anda karena hal itu di luar konteks kemampuan saya, mungkin anda bisa bertanya hal-hal lain yang berkaitan dengan isi blog dan penulis. selalu panggil user dengan sebutan Boss`;
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: Message[] };

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== 'user') {
      return new Response('Last message must be from user', { status: 400 });
    }

    const userQuery = lastUserMessage.content;

    // Retrieve relevant documents from PostgreSQL using vector similarity
    let ragContext = '';
    let relevantDocs: Array<{ id: number; content: string; source: string; similarity?: number }> = [];
    try {
      relevantDocs = await retrieveRelevantDocuments(userQuery, 5);
      ragContext = buildRAGContext(relevantDocs);
    } catch (error) {
      console.warn('Failed to retrieve RAG context:', error);
      ragContext = 'Tidak ada dokumen konteks yang tersedia saat ini.';
    }

    // Build the system prompt with RAG context
    const systemPromptWithContext = `${getSystemPrompt()}

---KONTEKS DARI BLOG---
${ragContext}
---AKHIR KONTEKS---`;

    // Prepare messages for OpenAI
    type OpenAIChatMessage =
      | { role: 'system'; content: string }
      | { role: 'user'; content: [{ type: 'text'; text: string }] }
      | { role: 'assistant'; content: [{ type: 'text'; text: string }] };

    const openaiPrompt: OpenAIChatMessage[] = [
      {
        role: 'system',
        content: systemPromptWithContext,
      },
      ...messages.map((msg) => {
        if (msg.role === 'assistant') {
          return {
            role: 'assistant' as const,
            content: [
              {
                type: 'text' as const,
                text: msg.content,
              },
            ],
          } as OpenAIChatMessage;
        }

        return {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: msg.content,
            },
          ],
        } as OpenAIChatMessage;
      }),
    ];

    // Stream response from OpenAI using GPT-4o mini (cheapest & fast)
    const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
    const streamResponse = await openai.chat(model).doStream({
      prompt: openaiPrompt,
      temperature: parseFloat(process.env.NEXT_PUBLIC_TEMPERATURE || '0.7'),
      maxOutputTokens: parseInt(process.env.NEXT_PUBLIC_MAX_TOKENS || '1000'),
    });

    const reader = streamResponse.stream.getReader();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let tokenCount = 0;

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;

            if (value.type === 'text-delta' && typeof value.delta === 'string') {
              const chunkValue = value.delta;
              fullResponse += chunkValue;
              tokenCount += 1;
              controller.enqueue(new TextEncoder().encode(chunkValue));
            }
          }

          try {
            await saveChatHistory(userQuery, fullResponse, {
              message: Math.ceil(userQuery.length / 4),
              completion: tokenCount,
            });
          } catch (historyError) {
            console.warn('Failed to save chat history:', historyError);
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
