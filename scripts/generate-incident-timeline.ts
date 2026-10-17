import fs from 'node:fs';
import path from 'node:path';

// Seeded Pseudo-Random Number Generator (Mulberry32) for deterministic reproduction
class SeededRNG {
  private state: number;

  constructor(seed: number = 20261017) {
    this.state = seed;
  }

  // Returns float in [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Uniform integer in [min, max]
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Normal distribution using Box-Muller transform
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  // Log-normal distribution (ideal for emergency elapsed times)
  nextLogNormal(median: number, sigma: number = 0.35): number {
    const mu = Math.log(median);
    const val = Math.exp(this.nextGaussian(mu, sigma));
    return Math.max(1, Math.round(val));
  }
}

interface RegionInfo {
  regionId: string;
  name: string;
  district: string;
  areaType: 'residential' | 'commercial' | 'industrial' | 'educational' | 'mixed';
  lat: number;
  lng: number;
}

const REGIONS: RegionInfo[] = [
  { regionId: 'Q1-P01', name: 'Phường Bến Nghé', district: 'Quận 1', areaType: 'commercial', lat: 10.7769, lng: 106.7009 },
  { regionId: 'Q1-P02', name: 'Phường Bến Thành', district: 'Quận 1', areaType: 'commercial', lat: 10.7716, lng: 106.6934 },
  { regionId: 'Q1-P03', name: 'Phường Đa Kao', district: 'Quận 1', areaType: 'mixed', lat: 10.7877, lng: 106.6983 },
  { regionId: 'Q3-P01', name: 'Phường Võ Thị Sáu', district: 'Quận 3', areaType: 'mixed', lat: 10.7844, lng: 106.6896 },
  { regionId: 'Q3-P05', name: 'Phường 5', district: 'Quận 3', areaType: 'residential', lat: 10.7733, lng: 106.6841 },
  { regionId: 'Q5-P02', name: 'Phường 2', district: 'Quận 5', areaType: 'commercial', lat: 10.7562, lng: 106.6711 },
  { regionId: 'Q5-P11', name: 'Phường 11', district: 'Quận 5', areaType: 'mixed', lat: 10.7533, lng: 106.6612 },
  { regionId: 'Q10-P01', name: 'Phường 14', district: 'Quận 10', areaType: 'educational', lat: 10.7725, lng: 106.6578 },
  { regionId: 'Q10-P02', name: 'Phường 12', district: 'Quận 10', areaType: 'commercial', lat: 10.7788, lng: 106.6672 },
  { regionId: 'QBT-P01', name: 'Phường 25', district: 'Quận Bình Thạnh', areaType: 'educational', lat: 10.8033, lng: 106.7155 },
  { regionId: 'QBT-P02', name: 'Phường 19', district: 'Quận Bình Thạnh', areaType: 'residential', lat: 10.7912, lng: 106.7088 },
  { regionId: 'QTB-P02', name: 'Phường 2', district: 'Quận Tân Bình', areaType: 'commercial', lat: 10.8062, lng: 106.6664 },
  { regionId: 'QPN-P01', name: 'Phường 7', district: 'Quận Phú Nhuận', areaType: 'residential', lat: 10.7981, lng: 106.6872 },
  { regionId: 'Q7-P01', name: 'Phường Tân Phú', district: 'Quận 7', areaType: 'residential', lat: 10.7324, lng: 106.7211 },
  { regionId: 'Q7-P02', name: 'Phường Tân Hưng', district: 'Quận 7', areaType: 'mixed', lat: 10.7488, lng: 106.7022 },
  { regionId: 'QTD-P01', name: 'Phường Linh Trung', district: 'TP. Thủ Đức', areaType: 'educational', lat: 10.8711, lng: 106.7725 },
  { regionId: 'QTD-P07', name: 'Phường Thảo Điền', district: 'TP. Thủ Đức', areaType: 'residential', lat: 10.8044, lng: 106.7366 },
];

const SCENARIO_TYPES = [
  { category: 'cardiac_arrest', severity: 'critical', weight: 30, title: 'Ngừng tuần hoàn ngoại viện (OHCA)', threshTTG: 15, threshTTC: 45, threshTTA: 60, mroThresh: 25 },
  { category: 'stroke', severity: 'emergency', weight: 25, title: 'Đột quỵ não cấp (FAST)', threshTTG: 15, threshTTC: 30, threshTTA: 45, mroThresh: 20 },
  { category: 'severe_bleeding', severity: 'emergency', weight: 20, title: 'Chảy máu động mạch xối xả', threshTTG: 15, threshTTC: 40, threshTTA: 50, mroThresh: 20 },
  { category: 'choking', severity: 'critical', weight: 15, title: 'Hóc dị vật đường thở nguy kịch', threshTTG: 10, threshTTC: 30, threshTTA: 40, mroThresh: 20 },
  { category: 'trauma_general', severity: 'urgent', weight: 10, title: 'Chấn thương & gãy xương hở', threshTTG: 20, threshTTC: 60, threshTTA: 90, mroThresh: 35 },
];

export function generateSyntheticTimeline(totalIncidents: number = 2000, seed: number = 20261017) {
  const rng = new SeededRNG(seed);
  const now = new Date('2026-10-17T00:00:00Z').getTime();
  const ninetyDaysMs = 90 * 24 * 3600 * 1000;

  const incidents: any[] = [];
  const events: any[] = [];

  for (let i = 1; i <= totalIncidents; i++) {
    const incidentId = `inc_syn_${String(i).padStart(5, '0')}`;
    
    // Pick region (weighted slightly higher for commercial/educational high-density zones)
    const region = REGIONS[rng.nextInt(0, REGIONS.length - 1)];

    // Pick scenario category based on weights
    const roll = rng.nextInt(1, 100);
    let cumulative = 0;
    let scenario = SCENARIO_TYPES[0];
    for (const sc of SCENARIO_TYPES) {
      cumulative += sc.weight;
      if (roll <= cumulative) {
        scenario = sc;
        break;
      }
    }

    // Incident timestamp spread over 90 days
    const occurredOffsetMs = rng.nextInt(0, ninetyDaysMs);
    const occurredAt = new Date(now - occurredOffsetMs).toISOString();
    const occurredTime = new Date(occurredAt).getTime();

    // Bystander reflex characteristics (bimodal: untrained vs trained by GoldenMinutes intervention)
    const isTrainedBystander = rng.next() < 0.35; // 35% community trained in pilot wards

    const ttgMedian = isTrainedBystander ? Math.round(scenario.threshTTG * 0.9) : Math.round(scenario.threshTTG * 1.8);
    const ttcMedian = isTrainedBystander ? Math.round(scenario.threshTTC * 0.85) : Math.round(scenario.threshTTC * 1.6);
    const ttaMedian = isTrainedBystander ? Math.round(scenario.threshTTA * 0.9) : Math.round(scenario.threshTTA * 1.7);

    // Generate times using log-normal distribution
    const ttg = rng.next() < 0.08 ? null : rng.nextLogNormal(ttgMedian, 0.3);
    const ttc = rng.next() < 0.05 ? null : rng.nextLogNormal(ttcMedian, 0.35);
    const tta = rng.next() < 0.07 ? null : rng.nextLogNormal(ttaMedian, 0.35);

    // Avoidable Delay Index (ADI) calculation
    const guidanceDelay = ttg !== null ? Math.max(0, ttg - scenario.threshTTG) : scenario.threshTTG * 2;
    const callDelay = ttc !== null ? Math.max(0, ttc - scenario.threshTTC) : scenario.threshTTC * 2;
    const actionDelay = tta !== null ? Math.max(0, tta - scenario.threshTTA) : scenario.threshTTA * 1.5;
    const adiSec = Math.round(guidanceDelay + callDelay + actionDelay);
    const mroFlag = adiSec > scenario.mroThresh;

    // Timeline events
    const eventList = [
      { eventType: 'recognized', elapsedSec: rng.nextLogNormal(6, 0.25) },
    ];
    if (ttg !== null) eventList.push({ eventType: 'guidance_opened', elapsedSec: ttg });
    if (ttc !== null) eventList.push({ eventType: 'called_115', elapsedSec: ttc });
    if (tta !== null) eventList.push({ eventType: 'first_action', elapsedSec: tta });

    // Responder & EMS timeline events
    const responderDispatchedSec = Math.max(ttc || 40, rng.nextLogNormal(45, 0.2));
    eventList.push({ eventType: 'responder_dispatched', elapsedSec: responderDispatchedSec });

    // Responder arrival depends on region areaType (commercial/dense vs outer)
    const travelMinutesMedian = region.district.includes('Thủ Đức') || region.district.includes('Quận 7') ? 7 : 4.5;
    const responderArrivedSec = responderDispatchedSec + rng.nextLogNormal(travelMinutesMedian * 60, 0.3);
    eventList.push({ eventType: 'responder_arrived', elapsedSec: responderArrivedSec });

    // Ambulance 115 arrival (typically 12-25 mins in urban VN)
    const ambulanceArrivedSec = (ttc || 40) + rng.nextLogNormal(15 * 60, 0.3);
    eventList.push({ eventType: 'ambulance_arrived', elapsedSec: ambulanceArrivedSec });

    // Store incident row
    incidents.push({
      id: incidentId,
      regionId: region.regionId,
      regionName: region.name,
      district: region.district,
      scenarioCategory: scenario.category,
      severity: scenario.severity,
      origin: 'synthetic_seed', // STRICTLY SYNTHETIC
      occurredAt,
      timeToGuidanceSec: ttg,
      timeToCallSec: ttc,
      timeToActionSec: tta,
      adiSec,
      mroFlag,
      isTrainedBystander,
      status: 'resolved',
    });

    // Store event rows with client_event_id for idempotency
    for (const ev of eventList) {
      events.push({
        id: `ev_${incidentId}_${ev.eventType}`,
        incidentId,
        clientEventId: `cli_${incidentId}_${ev.eventType}`,
        eventType: ev.eventType,
        occurredAt: new Date(occurredTime + ev.elapsedSec * 1000).toISOString(),
        elapsedSec: ev.elapsedSec,
      });
    }
  }

  return { incidents, events };
}

// Execute and write output
function main() {
  const TOTAL = 2000;
  console.log(`[GoldenMinutes] Generating ${TOTAL} synthetic incidents across 17 TP.HCM regions...`);
  const { incidents, events } = generateSyntheticTimeline(TOTAL);

  // Compute key summary statistics
  const mroCount = incidents.filter((i) => i.mroFlag).length;
  const mroRate = (mroCount / incidents.length) * 100;
  const adis = incidents.map((i) => i.adiSec).sort((a, b) => a - b);
  const medianADI = adis[Math.floor(adis.length / 2)];

  console.log(`Generated: ${incidents.length} incidents, ${events.length} timeline events.`);
  console.log(`Median ADI: ${medianADI}s | MRO Rate: ${mroRate.toFixed(1)}%`);

  const outputPath = path.resolve(process.cwd(), 'data/synthetic_incidents_timeline.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      seed: 20261017,
      totalIncidents: incidents.length,
      totalEvents: events.length,
      medianADI,
      mroRatePercent: Math.round(mroRate * 10) / 10,
      distribution: 'Log-Normal Box-Muller',
      dataOrigin: 'synthetic_seed',
      purpose: 'Decision-Action-Measure analytics demonstration only (Not clinical)',
    },
    incidents,
    events,
  }, null, 2));

  console.log(`Saved to ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('generate-incident-timeline.ts')) {
  main();
}
