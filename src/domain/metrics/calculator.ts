import {
  ScenarioThresholds,
  SessionEvent,
  TrainingSession,
  DailyAggregate,
  DelayFunnelStep,
} from '../schemas';

/**
 * Calculates Avoidable Delay Index (ADI) for a given session.
 * 
 * Formula:
 * For each interval i:
 *   delay_i = max(0, actual_i_seconds - threshold_i_seconds)
 * ADI_seconds = sum(delay_i)
 * MRO_flag = ADI_seconds > mroThresholdSeconds
 */
export interface SessionMetricsResult {
  durationSec: number;
  timeToGuidanceSec: number | null;
  timeToCallSec: number | null;
  timeToActionSec: number | null;
  adiSec: number;
  mroFlag: boolean;
  readinessScore: number;
  delayBreakdown: {
    guidanceDelaySec: number;
    callDelaySec: number;
    actionDelaySec: number;
  };
}

export function calculateSessionMetrics(
  events: SessionEvent[],
  thresholds: ScenarioThresholds,
  completedNormally: boolean = true
): SessionMetricsResult {
  // Sort events chronologically to be resilient against out-of-order logs
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.occurredAtClient).getTime() - new Date(b.occurredAtClient).getTime()
  );

  const startEvent = sortedEvents.find((e) => e.type === 'session_started');
  const startTime = startEvent ? new Date(startEvent.occurredAtClient).getTime() : (sortedEvents[0] ? new Date(sortedEvents[0].occurredAtClient).getTime() : Date.now());

  const findFirstElapsedSec = (types: string[]): number | null => {
    const ev = sortedEvents.find((e) => types.includes(e.type));
    if (!ev) return null;
    const evTime = new Date(ev.occurredAtClient).getTime();
    const diffSec = Math.max(0, Math.round((evTime - startTime) / 1000));
    return diffSec;
  };

  const guidanceSec = findFirstElapsedSec(['guidance_opened']);
  const callSec = findFirstElapsedSec(['call_115_tapped']);
  const actionSec = findFirstElapsedSec(['action_started', 'metronome_started', 'step_completed']);
  
  const endEvent = sortedEvents.find((e) => e.type === 'session_completed');
  const durationSec = endEvent
    ? Math.max(1, Math.round((new Date(endEvent.occurredAtClient).getTime() - startTime) / 1000))
    : (sortedEvents.length > 0
        ? Math.max(1, Math.round((new Date(sortedEvents[sortedEvents.length - 1].occurredAtClient).getTime() - startTime) / 1000))
        : 0);

  // Compute individual avoidable delays
  const guidanceDelaySec = guidanceSec !== null
    ? Math.max(0, guidanceSec - thresholds.timeToGuidanceSec)
    : thresholds.timeToGuidanceSec * 2; // Penalty if never accessed guidance

  const callDelaySec = callSec !== null
    ? Math.max(0, callSec - thresholds.timeToCallSec)
    : thresholds.timeToCallSec * 2; // Penalty if never called 115

  const actionDelaySec = actionSec !== null
    ? Math.max(0, actionSec - thresholds.timeToActionSec)
    : thresholds.timeToActionSec * 1.5;

  const adiSec = Math.round(guidanceDelaySec + callDelaySec + actionDelaySec);
  const mroFlag = adiSec > thresholds.mroThresholdSec;

  // Readiness Score 0 - 100
  // 1. Completion: 35 points
  // 2. Action sequence sanity: 25 points
  // 3. Speed to guidance: up to 20 points
  // 4. Speed to call 115: up to 20 points
  let score = 0;
  if (completedNormally) score += 35;

  // Sequence: did user answer questions and tap guidance/call?
  const hasAnswers = sortedEvents.some((e) => e.type === 'answer_selected');
  const hasGuidance = guidanceSec !== null;
  const hasCall = callSec !== null;
  const hasAction = actionSec !== null;

  let sequencePoints = 0;
  if (hasAnswers) sequencePoints += 5;
  if (hasGuidance) sequencePoints += 10;
  if (hasCall) sequencePoints += 5;
  if (hasAction) sequencePoints += 5;
  score += Math.min(25, sequencePoints);

  // Speed to guidance (20 pts max)
  if (guidanceSec !== null) {
    if (guidanceSec <= thresholds.timeToGuidanceSec) {
      score += 20;
    } else {
      const guidanceRatio = Math.max(0, 1 - (guidanceSec - thresholds.timeToGuidanceSec) / (thresholds.timeToGuidanceSec * 2));
      score += Math.round(guidanceRatio * 20);
    }
  }

  // Speed to 115 call (20 pts max)
  if (callSec !== null) {
    if (callSec <= thresholds.timeToCallSec) {
      score += 20;
    } else {
      const callRatio = Math.max(0, 1 - (callSec - thresholds.timeToCallSec) / (thresholds.timeToCallSec * 2));
      score += Math.round(callRatio * 20);
    }
  }

  const readinessScore = Math.max(0, Math.min(100, score));

  return {
    durationSec,
    timeToGuidanceSec: guidanceSec,
    timeToCallSec: callSec,
    timeToActionSec: actionSec,
    adiSec,
    mroFlag,
    readinessScore,
    delayBreakdown: {
      guidanceDelaySec,
      callDelaySec,
      actionDelaySec,
    },
  };
}

/**
 * Robust median calculation that ignores null / undefined values
 */
export function calculateMedian(numbers: (number | null | undefined)[]): number {
  const valid = numbers.filter((n): n is number => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    return Math.round(((valid[mid - 1] + valid[mid]) / 2) * 10) / 10;
  }
  return valid[mid];
}

/**
 * Aggregates a list of sessions into a standardized DailyAggregate.
 */
export function aggregateSessions(
  sessions: TrainingSession[],
  dateStr: string,
  dataOrigin: TrainingSession['dataOrigin'] = 'training_user'
): DailyAggregate {
  const completed = sessions.filter((s) => s.status === 'completed');
  const sampleSize = sessions.length;
  const completionCount = completed.length;
  const completionRate = sampleSize > 0 ? Math.round((completionCount / sampleSize) * 100) : 0;

  const medianTimeToGuidanceSec = calculateMedian(completed.map((s) => s.timeToGuidanceSec));
  const medianTimeToCallSec = calculateMedian(completed.map((s) => s.timeToCallSec));
  const medianTimeToActionSec = calculateMedian(completed.map((s) => s.timeToActionSec));
  const medianAdiSec = calculateMedian(completed.map((s) => s.adiSec));

  const mroCount = completed.filter((s) => s.mroFlag === true).length;
  const mroRate = completionCount > 0 ? Math.round((mroCount / completionCount) * 100) : 0;

  const readinessScores = completed
    .map((s) => s.readinessScore)
    .filter((n): n is number => typeof n === 'number');
  const avgReadinessScore = readinessScores.length > 0
    ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
    : 0;

  const confDeltas = completed
    .map((s) => s.confidenceDelta)
    .filter((n): n is number => typeof n === 'number');
  const confidenceDeltaAvg = confDeltas.length > 0
    ? Math.round((confDeltas.reduce((a, b) => a + b, 0) / confDeltas.length) * 10) / 10
    : 0;

  return {
    aggregateId: `agg_${dateStr}_${dataOrigin}`,
    date: dateStr,
    dataOrigin,
    sessionCount: sampleSize,
    completionCount,
    completionRate,
    medianTimeToGuidanceSec,
    medianTimeToCallSec,
    medianTimeToActionSec,
    medianAdiSec,
    mroCount,
    mroRate,
    avgReadinessScore,
    confidenceDeltaAvg,
    sampleSize,
    computedAt: new Date().toISOString(),
    schemaVersion: '2.0.0',
  };
}

/**
 * Calculates Funnel steps and bottleneck rates across sessions
 */
export function calculateDelayFunnel(sessions: TrainingSession[]): DelayFunnelStep[] {
  const completed = sessions.filter((s) => s.status === 'completed');
  const total = Math.max(1, completed.length);

  const ttgVals = completed.map((s) => s.timeToGuidanceSec || 0);
  const ttcVals = completed.map((s) => s.timeToCallSec || 0);
  const ttaVals = completed.map((s) => s.timeToActionSec || 0);

  const medianTTG = calculateMedian(ttgVals);
  const medianTTC = calculateMedian(ttcVals);
  const medianTTA = calculateMedian(ttaVals);

  return [
    {
      stepKey: 'open_app',
      stepLabel: 'Phát hiện sự cố & Mở ứng dụng',
      medianTimeSec: 0,
      standardTargetSec: 0,
      avoidableDelaySec: 0,
      bottleneckRate: 0,
    },
    {
      stepKey: 'recognize_symptoms',
      stepLabel: 'Đánh giá an toàn & Triệu chứng',
      medianTimeSec: Math.round(medianTTG * 0.4),
      standardTargetSec: 8,
      avoidableDelaySec: Math.max(0, Math.round(medianTTG * 0.4) - 8),
      bottleneckRate: Math.round((completed.filter((s) => (s.timeToGuidanceSec || 0) > 15).length / total) * 100),
    },
    {
      stepKey: 'start_guidance',
      stepLabel: 'Mở thẻ hướng dẫn thao tác chuẩn',
      medianTimeSec: medianTTG,
      standardTargetSec: 15,
      avoidableDelaySec: Math.max(0, medianTTG - 15),
      bottleneckRate: Math.round((completed.filter((s) => (s.timeToGuidanceSec || 0) > 20).length / total) * 100),
    },
    {
      stepKey: 'call_115',
      stepLabel: 'Bấm gọi 115 kết nối cấp cứu',
      medianTimeSec: medianTTC,
      standardTargetSec: 45,
      avoidableDelaySec: Math.max(0, medianTTC - 45),
      bottleneckRate: Math.round((completed.filter((s) => (s.timeToCallSec || 0) > 60).length / total) * 100),
    },
    {
      stepKey: 'first_compression_or_action',
      stepLabel: 'Bắt đầu ép tim / Cầm máu / Tư thế an toàn',
      medianTimeSec: medianTTA,
      standardTargetSec: 60,
      avoidableDelaySec: Math.max(0, medianTTA - 60),
      bottleneckRate: Math.round((completed.filter((s) => (s.timeToActionSec || 0) > 90).length / total) * 100),
    },
  ];
}
