import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import * as geminiService from '../server/services/gemini';

describe('Gemini Resilience & Error Handling Verification', () => {
  it('returns graceful 500 JSON without crashing when Gemini throws', async () => {
    vi.spyOn(geminiService, 'extractEmergencyFacts').mockRejectedValueOnce(
      new Error('GEMINI_UNAVAILABLE: Service overloaded')
    );

    const res = await request(app)
      .post('/api/ai/extract-facts')
      .send({
        text: 'Nạn nhân ngất xỉu không thở được tại công viên',
        currentScenarioId: 'scen_01',
      });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('AI_SERVICE_ERROR');
    expect(res.body.message).toContain('GEMINI_UNAVAILABLE');
  });

  it('rejects malformed extraction payload with 400', async () => {
    const res = await request(app)
      .post('/api/ai/extract-facts')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});
