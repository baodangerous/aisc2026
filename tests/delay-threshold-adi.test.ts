import { describe, it, expect } from 'vitest';
import { calculateSessionMetrics } from '../src/domain/metrics/calculator';
import { ScenarioThresholds, SessionEvent } from '../src/domain/schemas';

/**
 * Single source of truth delay_thresholds definitions from database migration
 * 202610170004_core_incident_and_resources.sql
 */
const SQL_DELAY_THRESHOLDS: Record<string, {
  time_to_guidance_sec: number;
  time_to_call_sec: number;
  time_to_action_sec: number;
  mro_threshold_sec: number;
}> = {
  cardiac_arrest: { time_to_guidance_sec: 15, time_to_call_sec: 45, time_to_action_sec: 60, mro_threshold_sec: 25 },
  stroke: { time_to_guidance_sec: 15, time_to_call_sec: 30, time_to_action_sec: 45, mro_threshold_sec: 20 },
  severe_bleeding: { time_to_guidance_sec: 15, time_to_call_sec: 40, time_to_action_sec: 50, mro_threshold_sec: 20 },
  choking: { time_to_guidance_sec: 10, time_to_call_sec: 30, time_to_action_sec: 40, mro_threshold_sec: 20 },
  trauma_general: { time_to_guidance_sec: 20, time_to_call_sec: 60, time_to_action_sec: 90, mro_threshold_sec: 35 },
  default: { time_to_guidance_sec: 15, time_to_call_sec: 45, time_to_action_sec: 60, mro_threshold_sec: 25 },
};

/**
 * Exact SQL logic as defined in v_incident_adi:
 *
 * greatest(0, coalesce(open_to_guidance_sec, dt.time_to_guidance_sec * 3) - dt.time_to_guidance_sec)
 * Note: When null in TS: penalty is thresholds.timeToGuidanceSec * 2.
 * (coalesce(null, 3*T) - T = 2*T) -> EXACT MATCH!
 */
function sqlCalculateADI(
  openToGuidanceSec: number | null,
  openToCallSec: number | null,
  openToFirstActionSec: number | null,
  category: string
) {
  const dt = SQL_DELAY_THRESHOLDS[category] || SQL_DELAY_THRESHOLDS.default;

  // SQL calculation of delays
  const guidanceEffective = openToGuidanceSec !== null ? openToGuidanceSec : dt.time_to_guidance_sec * 3;
  const guidanceDelay = Math.max(0, guidanceEffective - dt.time_to_guidance_sec);

  const callEffective = openToCallSec !== null ? openToCallSec : dt.time_to_call_sec * 3;
  const callDelay = Math.max(0, callEffective - dt.time_to_call_sec);

  const actionEffective = openToFirstActionSec !== null ? openToFirstActionSec : dt.time_to_action_sec * 2.5;
  const actionDelay = Math.max(0, actionEffective - dt.time_to_action_sec);

  const adiSec = Math.round(guidanceDelay + callDelay + actionDelay);
  const mroFlag = adiSec > dt.mro_threshold_sec;

  return {
    guidanceDelay,
    callDelay,
    actionDelay,
    adiSec,
    mroFlag,
  };
}

describe('Single Source of Truth: SQL View Formula vs TypeScript Calculator (>= 20 cases)', () => {
  const testScenarios = [
    // 1-5: Cardiac arrest variations
    { category: 'cardiac_arrest', ttg: 10, ttc: 30, tta: 50, desc: 'All below thresholds (Fast responder)' },
    { category: 'cardiac_arrest', ttg: 15, ttc: 45, tta: 60, desc: 'Exact thresholds boundary' },
    { category: 'cardiac_arrest', ttg: 25, ttc: 60, tta: 90, desc: 'Mild delay exceeding MRO' },
    { category: 'cardiac_arrest', ttg: 40, ttc: 120, tta: 180, desc: 'Severe delay' },
    { category: 'cardiac_arrest', ttg: null, ttc: 45, tta: 60, desc: 'Missing guidance event' },

    // 6-10: Stroke variations
    { category: 'stroke', ttg: 12, ttc: 25, tta: 40, desc: 'Stroke fast response' },
    { category: 'stroke', ttg: 15, ttc: 30, tta: 45, desc: 'Stroke exact boundary' },
    { category: 'stroke', ttg: 20, ttc: 50, tta: 65, desc: 'Stroke delayed recognition' },
    { category: 'stroke', ttg: 5, ttc: null, tta: 40, desc: 'Stroke without 115 call' },
    { category: 'stroke', ttg: null, ttc: null, tta: null, desc: 'Abandoned session (all missing)' },

    // 11-15: Severe bleeding variations
    { category: 'severe_bleeding', ttg: 8, ttc: 20, tta: 25, desc: 'Bleeding rapid tourniquet' },
    { category: 'severe_bleeding', ttg: 15, ttc: 40, tta: 50, desc: 'Bleeding exact threshold' },
    { category: 'severe_bleeding', ttg: 25, ttc: 45, tta: 55, desc: 'Bleeding slight delay' },
    { category: 'severe_bleeding', ttg: 30, ttc: 90, tta: 100, desc: 'Bleeding panic delay' },
    { category: 'severe_bleeding', ttg: 10, ttc: 30, tta: null, desc: 'Bleeding no physical action' },

    // 16-20: Choking variations
    { category: 'choking', ttg: 5, ttc: 15, tta: 20, desc: 'Choking Heimlich immediate' },
    { category: 'choking', ttg: 10, ttc: 30, tta: 40, desc: 'Choking exact boundary' },
    { category: 'choking', ttg: 18, ttc: 45, tta: 60, desc: 'Choking delayed' },
    { category: 'choking', ttg: 35, ttc: 80, tta: 90, desc: 'Choking critical bottleneck' },
    { category: 'choking', ttg: null, ttc: 20, tta: 35, desc: 'Choking direct action without guide' },

    // 21-25: Trauma & Default variations
    { category: 'trauma_general', ttg: 15, ttc: 40, tta: 70, desc: 'Trauma under threshold' },
    { category: 'trauma_general', ttg: 20, ttc: 60, tta: 90, desc: 'Trauma exact threshold' },
    { category: 'trauma_general', ttg: 35, ttc: 90, tta: 140, desc: 'Trauma significant delay' },
    { category: 'default', ttg: 12, ttc: 40, tta: 55, desc: 'Default normal' },
    { category: 'default', ttg: 22, ttc: 55, tta: 75, desc: 'Default exceeded MRO' },
  ];

  it('verifies that dataset covers at least 20 test cases', () => {
    expect(testScenarios.length).toBeGreaterThanOrEqual(20);
  });

  testScenarios.forEach((scenario, index) => {
    it(`Case #${index + 1} (${scenario.category}): ${scenario.desc}`, () => {
      const dt = SQL_DELAY_THRESHOLDS[scenario.category] || SQL_DELAY_THRESHOLDS.default;
      const tsThresholds: ScenarioThresholds = {
        scenarioCategory: scenario.category,
        timeToGuidanceSec: dt.time_to_guidance_sec,
        timeToCallSec: dt.time_to_call_sec,
        timeToActionSec: dt.time_to_action_sec,
        mroThresholdSec: dt.mro_threshold_sec,
      };

      // Construct simulated event stream
      const baseTime = 1700000000000;
      const events: SessionEvent[] = [
        {
          eventId: 'evt_start',
          sessionId: 'session_test',
          type: 'session_started',
          elapsedMs: 0,
          occurredAtClient: new Date(baseTime).toISOString(),
        },
      ];

      if (scenario.ttg !== null) {
        events.push({
          eventId: 'evt_guide',
          sessionId: 'session_test',
          type: 'guidance_opened',
          elapsedMs: scenario.ttg * 1000,
          occurredAtClient: new Date(baseTime + scenario.ttg * 1000).toISOString(),
        });
      }

      if (scenario.ttc !== null) {
        events.push({
          eventId: 'evt_call',
          sessionId: 'session_test',
          type: 'call_115_tapped',
          elapsedMs: scenario.ttc * 1000,
          occurredAtClient: new Date(baseTime + scenario.ttc * 1000).toISOString(),
        });
      }

      if (scenario.tta !== null) {
        events.push({
          eventId: 'evt_action',
          sessionId: 'session_test',
          type: 'action_started',
          elapsedMs: scenario.tta * 1000,
          occurredAtClient: new Date(baseTime + scenario.tta * 1000).toISOString(),
        });
      }

      events.push({
        eventId: 'evt_complete',
        sessionId: 'session_test',
        type: 'session_completed',
        elapsedMs: 120000,
        occurredAtClient: new Date(baseTime + 120000).toISOString(),
      });

      const tsResult = calculateSessionMetrics(events, tsThresholds, true);
      const sqlResult = sqlCalculateADI(scenario.ttg, scenario.ttc, scenario.tta, scenario.category);

      // Verify mathematical parity between SQL calculation and TS domain calculator
      expect(tsResult.delayBreakdown.guidanceDelaySec).toBe(sqlResult.guidanceDelay);
      expect(tsResult.delayBreakdown.callDelaySec).toBe(sqlResult.callDelay);
      expect(tsResult.delayBreakdown.actionDelaySec).toBe(sqlResult.actionDelay);
      expect(tsResult.adiSec).toBe(sqlResult.adiSec);
      expect(tsResult.mroFlag).toBe(sqlResult.mroFlag);
    });
  });
});
