import { GoogleGenAI, Type } from '@google/genai';
import {
  FactExtractionInput,
  FactExtractionOutput,
  InsightInput,
  InsightOutput,
  AudioTranscribeInput,
  AudioTranscribeOutput,
  VisualFactExtractionInput,
  VisualFactExtractionOutput,
  VisualFactExtractionOutputSchema,
} from '../../src/domain/schemas';

// PII Redactor: removes phone numbers, email addresses, specific ID numbers from emergency text
export function redactPII(input: string): string {
  if (!input) return '';
  return input
    // Phone numbers (e.g. 0901234567, +84901234567, 090-123-4567)
    .replace(/(\+?84|0)(3|5|7|8|9)[0-9]{8}/g, '[SĐT_ĐÃ_ẨN]')
    .replace(/[0-9]{3,4}[-.\s][0-9]{3,4}[-.\s][0-9]{3,4}/g, '[SĐT_ĐÃ_ẨN]')
    // Email addresses
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_ĐÃ_ẨN]')
    // Citizen ID (12 digits)
    .replace(/\b\d{12}\b/g, '[CCCD_ĐÃ_ẨN]');
}

// Lazy/Safe GoogleGenAI client instance
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

/**
 * Feature A: Vietnamese Emergency Fact Extractor
 * Extracts objective structured facts from raw Vietnamese text.
 * Strictly forbidden from medical diagnosis or prescribing treatment.
 */
export async function extractEmergencyFacts(
  input: FactExtractionInput
): Promise<FactExtractionOutput> {
  const sanitizedText = redactPII(input.text.trim().slice(0, 1000));
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }

  const systemInstruction = `
Bạn là Bộ Trích Xuất Dữ Kiệu Khẩn Cấp (Emergency Fact Extractor) cho hệ thống GoldenMinutes Việt Nam.
NHIỆM VỤ DUY NHẤT: Trích xuất các sự kiện khách quan có cấu trúc từ lời kể của người chứng kiến.
QUY TẮC AN TOÀN TUYỆT ĐỐI:
1. KHÔNG chẩn đoán bệnh.
2. KHÔNG đưa ra hướng dẫn hay phác đồ điều trị y tế.
3. KHÔNG bịa đặt thông tin không có trong văn bản.
4. Chỉ phân tích các dấu hiệu: tri giác (consciousness: responsive | unresponsive | unknown), hô hấp (breathing: normal | abnormal | not_breathing | unknown), chảy máu nghiêm trọng (severeBleeding: boolean | null), dấu hiệu đột quỵ FAST (strokeFace, strokeArm, strokeSpeech: boolean | null), hóc dị vật (choking: boolean | null).
5. Output bắt buộc là JSON hợp lệ theo schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Phân tích mô tả tình huống khẩn cấp sau: "${sanitizedText}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consciousness: {
              type: Type.STRING,
              enum: ['responsive', 'unresponsive', 'unknown'],
            },
            breathing: {
              type: Type.STRING,
              enum: ['normal', 'abnormal', 'not_breathing', 'unknown'],
            },
            severeBleeding: { type: Type.BOOLEAN, nullable: true },
            strokeFace: { type: Type.BOOLEAN, nullable: true },
            strokeArm: { type: Type.BOOLEAN, nullable: true },
            strokeSpeech: { type: Type.BOOLEAN, nullable: true },
            choking: { type: Type.BOOLEAN, nullable: true },
            extractedEvidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            missingFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidence: { type: Type.NUMBER },
            recommendedEmergencyPrompt: { type: Type.STRING },
          },
          required: [
            'consciousness',
            'breathing',
            'extractedEvidence',
            'missingFacts',
            'confidence',
            'recommendedEmergencyPrompt',
          ],
        },
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}') as FactExtractionOutput;
    return {
      consciousness: parsed.consciousness || 'unknown',
      breathing: parsed.breathing || 'unknown',
      severeBleeding: parsed.severeBleeding ?? null,
      strokeFace: parsed.strokeFace ?? null,
      strokeArm: parsed.strokeArm ?? null,
      strokeSpeech: parsed.strokeSpeech ?? null,
      choking: parsed.choking ?? null,
      extractedEvidence: parsed.extractedEvidence || [],
      missingFacts: parsed.missingFacts || [],
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85,
      recommendedEmergencyPrompt: parsed.recommendedEmergencyPrompt || 'Xác nhận thông tin triệu chứng với ứng dụng',
    };
  } catch (err) {
    console.warn('Fact extraction unavailable');
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }
}

// Deterministic fallback fact extractor when offline or without API key
function extractEmergencyFactsFallback(text: string): FactExtractionOutput {
  const lower = text.toLowerCase();
  const evidence: string[] = [];
  const missing: string[] = [];

  let consciousness: FactExtractionOutput['consciousness'] = 'unknown';
  if (lower.includes('bất tỉnh') || lower.includes('ngất') || lower.includes('nằm bất động') || lower.includes('không phản ứng') || lower.includes('gọi không trả lời')) {
    consciousness = 'unresponsive';
    evidence.push('Nạn nhân không có phản ứng / bất tỉnh');
  } else if (lower.includes('tỉnh táo') || lower.includes('vẫn nói được') || lower.includes('còn cử động')) {
    consciousness = 'responsive';
    evidence.push('Nạn nhân còn tỉnh táo / có phản ứng');
  } else {
    missing.push('Chưa rõ mức độ tri giác / phản ứng của nạn nhân');
  }

  let breathing: FactExtractionOutput['breathing'] = 'unknown';
  if (lower.includes('ngừng thở') || lower.includes('không thở') || lower.includes('tắt thở')) {
    breathing = 'not_breathing';
    evidence.push('Nạn nhân không có nhịp thở');
  } else if (lower.includes('thở ngáp') || lower.includes('ngáp cá') || lower.includes('thở khò khè') || lower.includes('khó thở')) {
    breathing = 'abnormal';
    evidence.push('Thở ngáp cá hoặc thở bất thường');
  } else if (lower.includes('thở bình thường') || lower.includes('nhịp thở đều')) {
    breathing = 'normal';
    evidence.push('Nhịp thở bình thường');
  } else {
    missing.push('Chưa xác định rõ tình trạng hô hấp lồng ngực');
  }

  const severeBleeding =
    lower.includes('phun máu') || lower.includes('chảy máu nhiều') || lower.includes('máu đỏ tươi') || lower.includes('đứt mạch')
      ? true
      : lower.includes('trầy xước') || lower.includes('chảy máu ít')
      ? false
      : null;
  if (severeBleeding) evidence.push('Phát hiện dấu hiệu chảy máu ồ ạt hoặc động mạch');

  const strokeFace = lower.includes('méo miệng') || lower.includes('xệ mặt') || lower.includes('lệch mặt') ? true : null;
  const strokeArm = lower.includes('yếu tay') || lower.includes('liệt tay') || lower.includes('rơi đũa') ? true : null;
  const strokeSpeech = lower.includes('nói ngọng') || lower.includes('nói đớ') || lower.includes('không nói được') || lower.includes('ú ớ') ? true : null;

  if (strokeFace || strokeArm || strokeSpeech) {
    evidence.push('Phát hiện dấu hiệu nghi ngờ đột quỵ (FAST)');
  }

  const choking = lower.includes('nghẹn') || lower.includes('hóc') || lower.includes('ôm cổ') ? true : null;
  if (choking) evidence.push('Phát hiện dấu hiệu nghẹn dị vật đường thở');

  return {
    consciousness,
    breathing,
    severeBleeding,
    strokeFace,
    strokeArm,
    strokeSpeech,
    choking,
    extractedEvidence: evidence.length > 0 ? evidence : ['Đã trích xuất đặc trưng văn bản cơ bản'],
    missingFacts: missing,
    confidence: 0.8,
    recommendedEmergencyPrompt: 'Vui lòng xác nhận các thông tin trên màn hình để nhận chỉ dẫn chính xác',
  };
}

/**
 * Feature B: Aggregate Data Insight Copilot
 * Generates grounded analytic narrative strictly from aggregated metrics snapshot.
 * No user PII, no ungrounded claims.
 */
export async function generateAnalyticsInsight(
  input: InsightInput
): Promise<InsightOutput> {
  const ai = getGeminiClient();
  const snap = input.metricsSnapshot;
  const provenanceLabel =
    input.dataOrigin === 'synthetic_seed'
      ? 'Bộ dữ liệu mô phỏng 90 ngày (Synthetic Baseline)'
      : input.dataOrigin === 'pilot_verified'
      ? 'Dữ liệu thử nghiệm thực địa đã kiểm chứng (Pilot Dataset)'
      : 'Dữ liệu huấn luyện người dùng đã đồng thuận (User Training Dataset)';

  if (!ai) {
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }

  const prompt = `
DỮ LIỆU TỔNG HỢP (AGGREGATE METRICS SNAPSHOT):
- Nguồn dữ liệu: ${provenanceLabel}
- Khoảng thời gian: ${input.timeRangeDays} ngày gần nhất
- Tổng số phiên huấn luyện (Sample size): ${snap.totalSessions}
- Số phiên hoàn thành: ${snap.completedSessions}
- Thời gian trung vị mở hướng dẫn (Median Time-to-Guidance): ${snap.medianTimeToGuidanceSec} giây
- Thời gian trung vị gọi 115 (Median Time-to-Call): ${snap.medianTimeToCallSec} giây
- Chỉ số trễ có thể phòng tránh (Median ADI): ${snap.medianAdiSec} giây
- Tỷ lệ cơ hội cứu sống bị bỏ lỡ (MRO Rate): ${snap.mroRate}%
- Điểm sẵn sàng trung bình (Avg Readiness Score): ${snap.avgReadinessScore}/100
- Mức tăng tự tin trung bình: +${snap.confidenceDeltaAvg}/5
- Điểm nghẽn gây trễ lớn nhất: ${snap.largestDelayStep}
`;

  const systemInstruction = `
Bạn là Chuyên Gia Phân Tích Trí Tuệ Cấp Cứu (Emergency Response Intelligence Copilot) của GoldenMinutes.
QUY TẮC BẮT BUỘC:
1. Mọi nhận định, số liệu bạn nêu ra PHẢI TỒN TẠI trong snapshot được cung cấp. Tuyệt đối không suy diễn số liệu ngoài dữ liệu.
2. Nêu rõ nguồn gốc dữ liệu (${provenanceLabel}) và kích thước mẫu (${snap.totalSessions} phiên).
3. Đề xuất 1 hành động huấn luyện cộng đồng cụ thể dựa trên điểm nghẽn lớn nhất (${snap.largestDelayStep}).
4. Luôn ghi rõ các giới hạn dữ liệu (limitations).
5. Xuất JSON theo đúng schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            observations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  claim: { type: Type.STRING },
                  metricKeys: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  impactLevel: {
                    type: Type.STRING,
                    enum: ['high', 'medium', 'low'],
                  },
                },
                required: ['claim', 'metricKeys', 'impactLevel'],
              },
            },
            recommendedTrainingAction: { type: Type.STRING },
            limitations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            dataProvenanceNote: { type: Type.STRING },
          },
          required: [
            'summary',
            'observations',
            'recommendedTrainingAction',
            'limitations',
            'dataProvenanceNote',
          ],
        },
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}') as InsightOutput;
    return {
      summary: parsed.summary,
      observations: parsed.observations || [],
      recommendedTrainingAction: parsed.recommendedTrainingAction,
      limitations: parsed.limitations || [],
      dataProvenanceNote: `${provenanceLabel} (N = ${snap.totalSessions} phiên)`,
    };
  } catch (err) {
    console.warn('Analytics insight unavailable');
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }
}

function generateAnalyticsInsightFallback(input: InsightInput, provenanceLabel: string): InsightOutput {
  const snap = input.metricsSnapshot;
  return {
    summary: `Tổng quan từ ${provenanceLabel} với ${snap.totalSessions} phiên ghi nhận: Chỉ số trễ có thể phòng tránh (ADI) trung vị đạt ${snap.medianAdiSec}s, tỷ lệ nguy cơ bỏ lỡ cơ hội cứu hộ (MRO) là ${snap.mroRate}%. Thời gian trung vị mở hướng dẫn là ${snap.medianTimeToGuidanceSec}s và bấm gọi 115 là ${snap.medianTimeToCallSec}s.`,
    observations: [
      {
        claim: `Điểm nghẽn thời gian chính nằm ở khâu "${snap.largestDelayStep}", đóng góp đáng kể vào ADI tổng thể.`,
        metricKeys: ['medianAdiSec', 'largestDelayStep'],
        impactLevel: 'high',
      },
      {
        claim: `Mức độ tự tin xử trí tình huống tăng trung bình +${snap.confidenceDeltaAvg} điểm sau khi hoàn thành bài luyện phản xạ 3 phút.`,
        metricKeys: ['confidenceDeltaAvg', 'avgReadinessScore'],
        impactLevel: 'medium',
      },
    ],
    recommendedTrainingAction: `Tổ chức chiến dịch huấn luyện vi mô tập trung vào kỹ năng thao tác nhanh tại bước "${snap.largestDelayStep}" để kéo giảm ADI dưới 15 giây.`,
    limitations: [
      input.dataOrigin === 'synthetic_seed'
        ? 'Dữ liệu được mô phỏng dựa trên phân phối y văn AHA 2020 và khảo sát mẫu, chưa phải dữ liệu ca bệnh thực địa.'
        : 'Cần tiếp tục mở rộng quy mô mẫu đa dạng theo địa bàn và độ tuổi để nâng cao tính đại diện.',
    ],
    dataProvenanceNote: `${provenanceLabel} (N = ${snap.totalSessions} phiên)`,
  };
}

/**
 * Feature C: Multimodal Vietnamese Audio Transcription & Fact Extraction (Fallback for browsers lacking Web Speech API)
 * Transcribes audio clip (<= 30s), redacts PII, and extracts structured facts.
 * Ephemeral processing: Audio data is never stored in DB or filesystem.
 */
export async function transcribeAndExtractFromAudio(
  input: AudioTranscribeInput
): Promise<AudioTranscribeOutput> {
  const ai = getGeminiClient();
  let cleanBase64 = input.audioBase64;
  if (cleanBase64.includes('base64,')) {
    cleanBase64 = cleanBase64.split('base64,')[1];
  }

  // Sanitize mimeType
  const mimeType = input.mimeType ? input.mimeType.split(';')[0].trim() : 'audio/webm';

  if (!ai) {
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }

  const systemInstruction = `
Bạn là Bộ Chuyển Đổi Giọng Nói Tiếng Việt & Trích Xuất Dữ Liệu Cấp Cứu cho GoldenMinutes.
NHIỆM VỤ:
1. Chuyển đổi chính xác âm thanh tiếng Việt thành văn bản (transcript).
2. Trích xuất các sự kiện khách quan có cấu trúc từ nội dung nghe được.
QUY TẮC AN TOÀN:
- KHÔNG chẩn đoán bệnh, KHÔNG đưa ra phác đồ điều trị.
- Chỉ phân tích: consciousness (responsive/unresponsive/unknown), breathing (normal/abnormal/not_breathing/unknown), severeBleeding, strokeFace, strokeArm, strokeSpeech, choking.
- Bắt buộc trả về JSON hợp lệ theo schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
        {
          text: `Hãy nghe đoạn âm thanh cấp cứu và xuất ra văn bản tiếng Việt cùng các dữ liệu triệu chứng đã phân loại. Ngữ cảnh hỗ trợ: "${input.scenarioContextHint || 'Cấp cứu ngoại viện'}"`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            consciousness: {
              type: Type.STRING,
              enum: ['responsive', 'unresponsive', 'unknown'],
            },
            breathing: {
              type: Type.STRING,
              enum: ['normal', 'abnormal', 'not_breathing', 'unknown'],
            },
            severeBleeding: { type: Type.BOOLEAN, nullable: true },
            strokeFace: { type: Type.BOOLEAN, nullable: true },
            strokeArm: { type: Type.BOOLEAN, nullable: true },
            strokeSpeech: { type: Type.BOOLEAN, nullable: true },
            choking: { type: Type.BOOLEAN, nullable: true },
            extractedEvidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            missingFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidence: { type: Type.NUMBER },
            recommendedEmergencyPrompt: { type: Type.STRING },
          },
          required: [
            'transcript',
            'consciousness',
            'breathing',
            'extractedEvidence',
            'missingFacts',
            'confidence',
            'recommendedEmergencyPrompt',
          ],
        },
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const rawTranscript = parsed.transcript || 'Đã ghi âm giọng nói thành công.';
    const sanitizedTranscript = redactPII(rawTranscript);

    return {
      transcript: sanitizedTranscript,
      facts: {
        consciousness: parsed.consciousness || 'unknown',
        breathing: parsed.breathing || 'unknown',
        severeBleeding: parsed.severeBleeding ?? null,
        strokeFace: parsed.strokeFace ?? null,
        strokeArm: parsed.strokeArm ?? null,
        strokeSpeech: parsed.strokeSpeech ?? null,
        choking: parsed.choking ?? null,
        extractedEvidence: parsed.extractedEvidence || ['Nhận dạng từ bản thu âm giọng nói'],
        missingFacts: parsed.missingFacts || [],
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.88,
        recommendedEmergencyPrompt: parsed.recommendedEmergencyPrompt || 'Vui lòng kiểm tra lại thông tin và xác nhận',
      },
      transcribedBy: 'gemini_server',
    };
  } catch (err) {
    console.warn('Audio transcription unavailable');
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }
}

/**
 * Feature D: Visual Practice Posture & Fact Extraction (Training Mode ONLY)
 * Strictly bounded physical positioning feedback (hand placement, angle, safety).
 * STRICTLY FORBIDDEN:
 * - NO medical diagnosis
 * - NO facial recognition or biometric scanning
 * - NO speculation on identity, age, gender, race
 * - NO autonomous treatment recommendations
 * Ephemeral processing: Image is discarded immediately after response.
 */
export async function extractVisualPracticeFacts(
  input: VisualFactExtractionInput
): Promise<VisualFactExtractionOutput> {
  const ai = getGeminiClient();
  let cleanBase64 = input.imageBase64;
  if (cleanBase64.includes('base64,')) {
    cleanBase64 = cleanBase64.split('base64,')[1];
  }

  const mimeType = input.mimeType ? input.mimeType.split(';')[0].trim() : 'image/jpeg';

  if (!ai) {
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }

  const systemInstruction = `
Bạn là Cố Vấn Thị Giác Kỹ Thuật Thực Hành Sơ Cứu (First Aid Practice Visual Assistant) của GoldenMinutes.
MỤC ĐÍCH: Chỉ đánh giá tư thế cơ học (hand placement, arm alignment, scene safety) cho người dùng trong chế độ LUYỆN TẬP.
CÁC ĐIỀU CẤM TUYỆT ĐỐI THEO NGHỊ ĐỊNH 13/2023/NĐ-CP & ĐẠO ĐỨC Y KHOA:
1. TUYỆT ĐỐI KHÔNG nhận diện khuôn mặt hay danh tính con người.
2. TUYỆT ĐỐI KHÔNG đoán tuổi tác, giới tính, chủng tộc.
3. TUYỆT ĐỐI KHÔNG chẩn đoán bệnh hay tình trạng bệnh lý y khoa.
4. TUYỆT ĐỐI KHÔNG kê đơn hay đưa ra phác đồ điều trị.
5. CHỈ ĐÁNH GIÁ TƯ THẾ THỰC HÀNH:
   - CPR: Gốc bàn tay đặt ở 1/2 dưới xương ức lồng ngực, cánh tay thẳng góc 90 độ, khuỷu tay khóa thẳng.
   - Tư thế hồi sức nghiêng an toàn (Recovery position).
   - Vị trí băng ép cầm máu hoặc nghiệm pháp Heimlich.
6. Trả về JSON theo đúng schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
        {
          text: `Hãy phân tích tư thế thực hành sơ cứu trong bức ảnh. Kịch bản luyện tập: "${input.scenarioId || 'sc_ohca_01'}". Bước thao tác: "${input.stepContext || 'Tư thế ép tim / vị trí tay'}". Hãy đưa ra nhận xét tư thế khách quan.`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            postureAssessment: {
              type: Type.STRING,
              enum: ['good', 'needs_adjustment', 'unclear'],
            },
            handPlacement: { type: Type.STRING },
            armAngle: { type: Type.STRING },
            environmentSafety: { type: Type.STRING },
            observations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctiveTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            simulatedFactsExtracted: {
              type: Type.OBJECT,
              properties: {
                consciousness: {
                  type: Type.STRING,
                  enum: ['responsive', 'unresponsive', 'unknown'],
                },
                breathing: {
                  type: Type.STRING,
                  enum: ['normal', 'abnormal', 'not_breathing', 'unknown'],
                },
                severeBleeding: { type: Type.BOOLEAN, nullable: true },
              },
            },
            safetyDisclaimer: { type: Type.STRING },
          },
          required: [
            'postureAssessment',
            'handPlacement',
            'armAngle',
            'environmentSafety',
            'observations',
            'correctiveTips',
            'safetyDisclaimer',
          ],
        },
        temperature: 0.1,
      },
    });

    return VisualFactExtractionOutputSchema.parse(JSON.parse(response.text || '{}'));
  } catch (err) {
    console.warn('Visual analysis unavailable');
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }
}
