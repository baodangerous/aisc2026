import { FactExtractionOutput, GuidanceStep, ScenarioVersion } from '../schemas';
import { APPROVED_SCENARIOS } from '../../content/approvedScenarios';

export interface AssessmentResult {
  scenarioId: string;
  scenarioVersionId: string;
  triagePriority: 'critical' | 'urgent' | 'moderate';
  primaryEmergency: 'cardiac_arrest' | 'stroke' | 'severe_bleeding' | 'choking' | 'general';
  rationaleVi: string;
  recommendedGuidanceSteps: GuidanceStep[];
  metronomeRequired: boolean;
  metronomeBpm?: number;
  call115RequiredImmediately: boolean;
  vitalActionPrompt: string;
}

/**
 * Deterministic Emergency Rule Engine:
 * Maps structured facts (from manual choices or verified Gemini extraction)
 * to standard AHA / VN MOH triage flow and guidance steps.
 */
export function evaluateEmergencyRules(facts: {
  consciousness: 'responsive' | 'unresponsive' | 'unknown';
  breathing: 'normal' | 'abnormal' | 'not_breathing' | 'unknown';
  severeBleeding?: boolean | null;
  strokeFace?: boolean | null;
  strokeArm?: boolean | null;
  strokeSpeech?: boolean | null;
  choking?: boolean | null;
  preferredScenarioId?: string;
}): AssessmentResult {
  // 1. CARDIAC ARREST RULE (AHA 2020: Unresponsive + Not breathing or abnormal/gasping breathing)
  if (
    facts.consciousness === 'unresponsive' &&
    (facts.breathing === 'not_breathing' || facts.breathing === 'abnormal')
  ) {
    const ohca = APPROVED_SCENARIOS.find((s) => s.id === 'sc_ohca_01')!;
    const ver = ohca.versions[0];
    return {
      scenarioId: ohca.id,
      scenarioVersionId: ver.versionId,
      triagePriority: 'critical',
      primaryEmergency: 'cardiac_arrest',
      rationaleVi: 'Nạn nhân bất tỉnh và không thở bình thường (hoặc thở ngáp cá). Nghi ngờ ngừng tuần hoàn ngoài bệnh viện. Ép tim CPR 110 bpm và gọi 115 ngay lập tức.',
      recommendedGuidanceSteps: ver.guidanceSteps,
      metronomeRequired: true,
      metronomeBpm: 110,
      call115RequiredImmediately: true,
      vitalActionPrompt: 'Bắt đầu ép tim 110 nhịp/phút và gọi 115 bật loa ngoài',
    };
  }

  // 2. SEVERE BLEEDING RULE (Active arterial or massive blood loss)
  if (facts.severeBleeding === true) {
    const bleeding = APPROVED_SCENARIOS.find((s) => s.id === 'sc_bleeding_03')!;
    const ver = bleeding.versions[0];
    return {
      scenarioId: bleeding.id,
      scenarioVersionId: ver.versionId,
      triagePriority: 'critical',
      primaryEmergency: 'severe_bleeding',
      rationaleVi: 'Phát hiện chảy máu ồ ạt hoặc động mạch. Nguy cơ sốc mất máu cấp tính trong vài phút. Cần đè ép trực tiếp và băng ép/garô ngay.',
      recommendedGuidanceSteps: ver.guidanceSteps,
      metronomeRequired: false,
      call115RequiredImmediately: true,
      vitalActionPrompt: 'Đè ép trực tiếp hai bàn tay lên vết thương không buông và gọi 115',
    };
  }

  // 3. FAST STROKE RULE (Any 1 of Face, Arm, Speech is positive)
  if (facts.strokeFace === true || facts.strokeArm === true || facts.strokeSpeech === true) {
    const stroke = APPROVED_SCENARIOS.find((s) => s.id === 'sc_stroke_02')!;
    const ver = stroke.versions[0];
    const positiveSigns: string[] = [];
    if (facts.strokeFace) positiveSigns.push('Méo mặt (Face)');
    if (facts.strokeArm) positiveSigns.push('Yếu tay (Arm)');
    if (facts.strokeSpeech) positiveSigns.push('Nói ngọng/đớ (Speech)');

    return {
      scenarioId: stroke.id,
      scenarioVersionId: ver.versionId,
      triagePriority: 'urgent',
      primaryEmergency: 'stroke',
      rationaleVi: `Dấu hiệu FAST dương tính: ${positiveSigns.join(', ')}. Nghi ngờ đột quỵ cấp. Cần đưa đến bệnh viện có đơn vị đột quỵ trong thời gian vàng (3 - 4.5h).`,
      recommendedGuidanceSteps: ver.guidanceSteps,
      metronomeRequired: false,
      call115RequiredImmediately: true,
      vitalActionPrompt: 'Gọi 115 ghi nhớ giờ khởi phát, đặt nằm nghiêng an toàn, KHÔNG cho uống thuốc',
    };
  }

  // 4. Default to Preferred Scenario or Cardiac Arrest Baseline
  const targetId = facts.preferredScenarioId || 'sc_ohca_01';
  const matched = APPROVED_SCENARIOS.find((s) => s.id === targetId) || APPROVED_SCENARIOS[0];
  const ver = matched.versions[0];

  return {
    scenarioId: matched.id,
    scenarioVersionId: ver.versionId,
    triagePriority: matched.category === 'cardiac_arrest' ? 'critical' : 'urgent',
    primaryEmergency: matched.category as any,
    rationaleVi: `Huấn luyện theo quy trình chuẩn: ${matched.title}.`,
    recommendedGuidanceSteps: ver.guidanceSteps,
    metronomeRequired: matched.category === 'cardiac_arrest',
    metronomeBpm: matched.category === 'cardiac_arrest' ? 110 : undefined,
    call115RequiredImmediately: true,
    vitalActionPrompt: ver.guidanceSteps[0]?.instruction || 'Thực hiện theo hướng dẫn từng bước',
  };
}

/**
 * Converts Gemini fact extraction response into the decision engine input
 */
export function convertAIFactsToRuleInput(aiFacts: FactExtractionOutput, preferredScenarioId?: string) {
  return evaluateEmergencyRules({
    consciousness: aiFacts.consciousness,
    breathing: aiFacts.breathing,
    severeBleeding: aiFacts.severeBleeding,
    strokeFace: aiFacts.strokeFace,
    strokeArm: aiFacts.strokeArm,
    strokeSpeech: aiFacts.strokeSpeech,
    choking: aiFacts.choking,
    preferredScenarioId,
  });
}
