const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
const userId = '0baaea01-a273-4618-bd29-1f31429a806c';

async function main() {
  await client.connect();

  const profile = await client.query(`
    SELECT p.id, p.user_id, p.embedding IS NOT NULL AS has_embedding,
           p.current_city_id, p.state_id, p.country_id,
           p.total_experience_months, p.highest_qualification_id
    FROM "users"."profiles" p
    WHERE p.user_id = $1
  `, [userId]);
  console.log('PROFILE:', JSON.stringify(profile.rows, null, 2));

  if (profile.rows[0]) {
    const profileId = profile.rows[0].id;
    const skillsCheck = await client.query(`
      SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'users' AND table_name LIKE '%skill%'
    `);
    console.log('SKILL TABLES IN users SCHEMA:', JSON.stringify(skillsCheck.rows));

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'users' ORDER BY 1
    `);
    console.log('ALL users SCHEMA TABLES:', tables.rows.map(r => r.table_name).join(', '));
  }

  const activeJobs = await client.query(`SELECT count(*) FROM "jobs"."jobs" WHERE status = 'ACTIVE' AND embedding IS NOT NULL`);
  console.log('TOTAL ACTIVE JOBS WITH EMBEDDING:', activeJobs.rows[0].count);

  const totalActiveJobs = await client.query(`SELECT count(*) FROM "jobs"."jobs" WHERE status = 'ACTIVE'`);
  console.log('TOTAL ACTIVE JOBS (any):', totalActiveJobs.rows[0].count);

  if (profile.rows[0]?.has_embedding) {
    const matches = await client.query(`
      SELECT j.id, j.title, j.status, j.location_id, j.work_mode,
             j.min_experience_months, j.max_experience_months,
             GREATEST(0, 1 - (j.embedding <=> p.embedding))::double precision AS similarity
      FROM "users"."profiles" p
      JOIN "jobs"."jobs" j ON j.embedding IS NOT NULL
      WHERE p.user_id = $1
      ORDER BY j.embedding <=> p.embedding ASC
      LIMIT 10
    `, [userId]);
    console.log('TOP 10 CLOSEST JOBS (any similarity):', JSON.stringify(matches.rows, null, 2));
  } else {
    console.log('USER HAS NO EMBEDDING -> confirms fallback branch, similarityScore forced to 0 for all jobs');
  }

  await client.end();
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1); });
