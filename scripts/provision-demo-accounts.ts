import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const emailDomain = process.env.DEMO_EMAIL_DOMAIN?.trim().toLowerCase();
const expectedProjectRef = process.env.DEMO_EXPECTED_PROJECT_REF?.trim();
const stagingConfirmation = process.env.DEMO_STAGING_CONFIRMATION;
const passwordLength = 24;

if (!url || !serviceKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment. Never use the service role key in VITE_* variables.');
}
if (stagingConfirmation !== 'I_CONFIRM_THIS_IS_STAGING') {
  throw new Error('Safety stop: set DEMO_STAGING_CONFIRMATION=I_CONFIRM_THIS_IS_STAGING only after confirming this is a dedicated staging/demo project.');
}
if (!expectedProjectRef || !/^[a-z0-9]{15,30}$/.test(expectedProjectRef)) {
  throw new Error('Set DEMO_EXPECTED_PROJECT_REF to the project ref shown in Supabase project settings.');
}
let projectHost: string;
try {
  const parsed = new URL(url);
  projectHost = parsed.hostname;
  if (parsed.protocol !== 'https:') throw new Error('HTTPS is required.');
} catch {
  throw new Error('SUPABASE_URL must be a valid HTTPS URL for the dedicated staging project.');
}
if (projectHost !== `${expectedProjectRef}.supabase.co`) {
  throw new Error('Safety stop: SUPABASE_URL host does not match DEMO_EXPECTED_PROJECT_REF. Check that you are targeting the intended staging project.');
}
if (!emailDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(emailDomain)) {
  throw new Error('Set DEMO_EMAIL_DOMAIN to a domain you control, e.g. example.com. Demo users will be created as demo-<role>@that-domain.');
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  { role: 'citizen', label: 'Người dân', profileRole: 'citizen' },
  { role: 'volunteer', label: 'Tình nguyện viên', profileRole: 'volunteer' },
  { role: 'clinical_reviewer', label: 'Người thẩm định nội dung', profileRole: 'citizen' },
  { role: 'org_admin', label: 'Quản trị viên tổ chức', profileRole: 'citizen' },
  { role: 'platform_admin', label: 'Quản trị hệ thống', profileRole: 'platform_admin' },
] as const;

function generatePassword() {
  // High-entropy, URL-safe password. Printed only to this terminal.
  return randomBytes(passwordLength).toString('base64url');
}

async function main() {
  // Load the Auth user list once. Existing accounts are never modified or elevated.
  const { data, error: lookupError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (lookupError) throw new Error(`Cannot list Auth users: ${lookupError.message}`);
  const existingEmails = new Set(data.users.map((user) => user.email?.toLowerCase()).filter(Boolean));

  const output: Array<{ email: string; role: string; password: string; action: string }> = [];

  for (const account of accounts) {
    const email = `demo-${account.role.replace(/_/g, '-')}@${emailDomain}`;
    if (existingEmails.has(email.toLowerCase())) {
      output.push({ email, role: account.role, password: '(not shown)', action: 'skipped — account already exists; verify manually' });
      continue;
    }

    const password = generatePassword();
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: account.role, demo_account: true },
      user_metadata: { display_name: `GoldenMinutes Demo — ${account.label}` },
    });
    if (error || !created.user) {
      throw new Error(`Cannot create ${email}: ${error?.message ?? 'no user returned'}`);
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: created.user.id,
      display_name: `GoldenMinutes Demo — ${account.label}`,
      role: account.profileRole,
      preferred_language: 'vi',
    }, { onConflict: 'id' });
    if (profileError) {
      throw new Error(`Auth user ${email} was created but profile sync failed. Review it in Supabase before rerunning: ${profileError.message}`);
    }

    existingEmails.add(email.toLowerCase());
    output.push({ email, role: account.role, password, action: 'created' });
  }

  console.log('\nGoldenMinutes staging demo accounts (passwords shown only for newly created accounts):\n');
  console.table(output);
  console.log('\nSECURITY: app_metadata is the intended trusted role claim; never let clients edit it. Store new passwords in a password manager and do not commit this output. Existing accounts were not changed. org_admin still needs an explicitly approved active organization_members membership. Verify server authorization and RLS before demoing privileged actions.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
