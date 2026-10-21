import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const prefix = process.env.DEMO_EMAIL_DOMAIN?.trim().toLowerCase();
const passwordLength = 24;

if (!url || !serviceKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment. Never use the service role key in VITE_* variables.');
}
if (!prefix || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(prefix)) {
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
  // URL-safe, high-entropy one-time password. Printed only to this terminal.
  return randomBytes(passwordLength).toString('base64url');
}

async function main() {
  const output: Array<{ email: string; role: string; password: string; action: string }> = [];

  for (const account of accounts) {
    const email = `demo-${account.role.replace(/_/g, '-') }@${prefix}`;
    const password = generatePassword();
    const { data: existing, error: lookupError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (lookupError) throw new Error(`Cannot list Auth users: ${lookupError.message}`);
    const found = existing.users.find((user) => user.email?.toLowerCase() === email);

    let userId: string;
    let action: string;
    if (found) {
      // Never reset an existing account's password or elevate it silently.
      const { error } = await supabase.auth.admin.updateUserById(found.id, {
        app_metadata: { ...found.app_metadata, role: account.role, demo_account: true },
        user_metadata: { ...found.user_metadata, display_name: `GoldenMinutes Demo — ${account.label}` },
      });
      if (error) throw new Error(`Cannot update role for ${email}: ${error.message}`);
      userId = found.id;
      action = 'role-updated; password unchanged';
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: account.role, demo_account: true },
        user_metadata: { display_name: `GoldenMinutes Demo — ${account.label}` },
      });
      if (error || !data.user) throw new Error(`Cannot create ${email}: ${error?.message ?? 'no user returned'}`);
      userId = data.user.id;
      action = 'created';
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: `GoldenMinutes Demo — ${account.label}`,
      role: account.profileRole,
      preferred_language: 'vi',
    }, { onConflict: 'id' });
    if (profileError) throw new Error(`Auth user ${email} exists but profile sync failed: ${profileError.message}`);

    output.push({ email, role: account.role, password: found ? '(unchanged — retrieve/reset securely in Supabase)' : password, action });
  }

  console.log('\nGoldenMinutes demo accounts (credentials are shown once for newly created users):\n');
  console.table(output);
  console.log('\nIMPORTANT: app_metadata is the trusted role source. Never let clients edit it. Store these credentials in a password manager; do not commit this output. org_admin still needs an active organization_members row to access an actual organization dashboard.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
