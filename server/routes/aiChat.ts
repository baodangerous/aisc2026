import { generateText, gateway } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../supabaseAuth';

const chatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) })).min(1).max(30),
});

const systemPrompt = `Bạn là GoldenMinutes, trợ lý học sơ cứu bằng tiếng Việt. Trả lời ngắn gọn, rõ ràng, bình tĩnh và ưu tiên hành động an toàn. Không chẩn đoán, không thay thế nhân viên y tế. Nếu người dùng mô tả tình huống nguy hiểm, luôn khuyên gọi 115 trước, sau đó hướng dẫn các bước sơ cứu cơ bản phù hợp. Không bịa thông tin. Khi thiếu dữ kiện, hỏi tối đa 2 câu quan trọng. Chỉ dùng kiến thức có trong CONTEXT và kiến thức sơ cứu nền tảng an toàn; nếu không chắc, nói rõ giới hạn. Khi dùng CONTEXT, nêu nguồn và URL ở cuối câu trả lời.`;

async function retrieveKnowledge(query: string) {
  if (!supabaseAdmin) return [];
  const terms = query.toLowerCase().split(/\\s+/).filter((term: string) => term.length > 3).slice(0, 6);
  if (!terms.length) return [];
  const pattern = `%${terms.join('%')}%`;
  const { data } = await supabaseAdmin.from('knowledge_documents').select('title,source_name,source_url,content').eq('status', 'approved').or(`content.ilike.${pattern},title.ilike.${pattern},topic.ilike.${pattern}`).limit(3);
  return data ?? [];
}

export async function handleAIChat(req: any, res: any) {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ code: 'INVALID_CHAT', message: 'Tin nhắn không hợp lệ.' });
  try {
    const latestUserMessage = [...parsed.data.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const knowledge = await retrieveKnowledge(latestUserMessage);
    const context = knowledge.length
      ? `\\n\\nCONTEXT\\n${knowledge.map((item) => `Nguồn: ${item.source_name} | URL: ${item.source_url}\\n${item.content}`).join('\\n\\n')}`
      : '';
    const { text } = await generateText({
      model: gateway('google/gemini-2.5-flash'),
      system: systemPrompt + context,
      messages: parsed.data.messages,
      maxOutputTokens: 700,
      temperature: 0.2,
    });
    return res.json({ message: text });
  } catch (error) {
    console.error('[AI chat]', error instanceof Error ? error.message : error);
    return res.status(503).json({ code: 'AI_UNAVAILABLE', message: 'Trợ lý đang tạm bận. Nếu là tình huống khẩn cấp, hãy gọi 115.' });
  }
}
