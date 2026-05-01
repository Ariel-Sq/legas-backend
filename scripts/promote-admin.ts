/* eslint-disable no-console */
/**
 * Promote a user to OWNER role.
 *
 * Usage:
 *   npm run promote-admin -- user@example.com
 *
 * Idempotent. Exits non-zero if the user does not exist.
 */
import dataSource from '../src/typeorm.config';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run promote-admin -- <email>');
    process.exit(2);
  }

  await dataSource.initialize();
  try {
    const result = await dataSource.query(
      `UPDATE users SET role = 'owner', "updatedAt" = NOW() WHERE email = $1 RETURNING id, email, role`,
      [email],
    );
    if (!result || result.length === 0 || (Array.isArray(result[0]) && result[0].length === 0)) {
      console.error(`No user found with email "${email}". Create the user first via POST /api/users.`);
      process.exit(1);
    }
    const rows = Array.isArray(result[0]) ? result[0] : result;
    console.log('Promoted:', rows[0]);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('promote-admin failed:', err);
  process.exit(1);
});
