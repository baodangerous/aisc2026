import fs from 'node:fs';
import path from 'node:path';

/**
 * Prints an idempotent Supabase import plan. The service-key execution belongs
 * in the deployment/operations environment, never in a committed script.
 */
const inputPath = path.resolve(process.cwd(), 'data/synthetic_incidents_timeline.json');
if (!fs.existsSync(inputPath)) {
  throw new Error('Timeline dataset not found. Run pnpm data:generate-timeline first.');
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as {
  incidents: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
};

const incidentRows = payload.incidents.map((incident) => ({
  id: incident.id,
  region_cell: incident.regionId,
  severity: incident.severity,
  status: incident.status,
  consent_to_analytics: true,
  occurred_at: incident.occurredAt,
  metadata: {
    origin: 'synthetic_seed',
    scenario_category: incident.scenarioCategory,
    adi_sec: incident.adiSec,
    mro_flag: incident.mroFlag,
  },
}));
const eventRows = payload.events.map((event) => ({
  id: event.id,
  incident_id: event.incidentId,
  event_type: event.eventType,
  occurred_at: event.occurredAt,
  region_cell: undefined,
  metadata: { origin: 'synthetic_seed', client_event_id: event.clientEventId, elapsed_sec: event.elapsedSec },
}));

console.log(JSON.stringify({
  mode: 'idempotent-upsert-plan',
  origin: 'synthetic_seed',
  incidentCount: incidentRows.length,
  eventCount: eventRows.length,
  conflictKeys: { incidents: 'id', events: 'id' },
  note: 'Execute with the Supabase service role in a controlled environment; never expose the key to the browser.',
}, null, 2));
