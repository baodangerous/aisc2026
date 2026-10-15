import { generateText, gateway } from 'ai';
import { z } from 'zod';

const chatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) })).min(1).max(30),
});

const systemPrompt = `Bạn là GoldenMinutes, trợ lý học sơ cứu bằng tiếng Việt. Trả lời ngắn gọn, rõ ràng, bình tĩnh và ưu tiên hành động an toàn. Không chẩn đoán, không thay thế nhân viên y tế. Nếu người dùng mô tả tình huống nguy hiểm, luôn khuyên gọi 115 trước, sau đó hướng dẫn các bước sơ cứu cơ bản phù hợp. Không bịa thông tin. Khi thiếu dữ kiện, hỏi tối đa 2 câu quan trọng.`;

export async function handleAIChat(req: any, res: any) {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ code: 'INVALID_CHAT', message: 'Tin nhắn không hợp lệ.' });
  try {
    const { text } = await generateText({
      model: gateway('google/gemini-2.5-flash'),
      system: systemPrompt,
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
