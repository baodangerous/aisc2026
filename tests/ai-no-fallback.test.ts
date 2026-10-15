import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractEmergencyFacts, transcribeAndExtractFromAudio, extractVisualPracticeFacts } from '../server/services/gemini';

afterEach(() => vi.unstubAllEnvs());
describe('No fabricated medical AI output', () => {
  it('refuses to fabricate a transcript when the provider is unavailable', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(transcribeAndExtractFromAudio({ audioBase64: 'A'.repeat(100), mimeType: 'audio/webm' })).rejects.toThrow('AI_SERVICE_UNAVAILABLE');
  });
  it('refuses to certify camera posture without processing the image', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(extractVisualPracticeFacts({ imageBase64: 'A'.repeat(100), mimeType: 'image/jpeg' })).rejects.toThrow('AI_SERVICE_UNAVAILABLE');
  });
  it('does not silently impersonate the model with keyword matching', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(extractEmergencyFacts({ text: 'Tình huống luyện tập' })).rejects.toThrow('AI_SERVICE_UNAVAILABLE');
  });
});
