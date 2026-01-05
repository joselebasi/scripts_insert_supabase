/**
 * sync-org-members.js
 *
 * Obtiene:
 * - Miembros de la org
 * - Última actividad REAL (commit, PR, review, issue)
 * - Días de inactividad
 * - Teams del miembro
 *
 * Estrategia:
 * - GraphQL contributionsCollection (NO search)
 * - Throttling global
 * - Teams cargados una sola vez
 *
 * Seguro contra secondary rate limit
 */

require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const Bottleneck = require('bottleneck');

const {
  insertMemberLastContribution,
  insertMemberTeam,
} = require('./db');

// ================= CONFIG =================

const ORG_NAME = 'BUS-BackOffice';

if (!process.env.GITHUB_TOKEN) {
  throw new Error('❌ GITHUB_TOKEN no definido en .env');
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

// 🔥 Throttling GLOBAL
const limiter = new Bottleneck({
  minTime: 1200,      // ~1 request cada 1.2s
  maxConcurrent: 1,
});

// =========================================
// 🔹 HELPERS
// =========================================

function daysInactive(lastDate) {
  if (!lastDate) return Infinity;

  return Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// =========================================
// 🔹 TEAMS (SE CARGAN 1 SOLA VEZ)
// =========================================

async function getOrgTeamsMap() {
  console.log('📦 Cargando teams de la organización...');

  const teams = await octokit.paginate(
    octokit.teams.list,
    { org: ORG_NAME, per_page: 100 }
  );

  const userTeams = new Map();

  for (const team of teams) {
    console.log(`   ↳ Team: ${team.name}`);

    const members = await limiter.schedule(() =>
      octokit.paginate(
        octokit.teams.listMembersInOrg,
        {
          org: ORG_NAME,
          team_slug: team.slug,
          per_page: 100,
        }
      )
    );

    for (const member of members) {
      if (!userTeams.has(member.login)) {
        userTeams.set(member.login, []);
      }
      userTeams.get(member.login).push(team.name);
    }
  }

  console.log(`✅ Teams cargados: ${teams.length}`);
  return userTeams;
}

// =========================================
// 🔹 ÚLTIMA ACTIVIDAD REAL (GRAPHQL)
// =========================================

async function getLastActivity(login) {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const res = await limiter.schedule(() =>
    graphqlWithAuth(query, { login })
  );

  const days =
    res.user.contributionsCollection.contributionCalendar.weeks
      .flatMap(w => w.contributionDays)
      .filter(d => d.contributionCount > 0);

  if (days.length === 0) return null;

  // Último día con actividad
  return new Date(days.at(-1).date);
}

// =========================================
// 🔹 EMAIL DEL USUARIO (BEST EFFORT)
// =========================================

async function getUserEmail(login) {
  try {
    const res = await limiter.schedule(() =>
      octokit.users.getByUsername({ username: login })
    );

    return res.data.email ?? null;
  } catch {
    console.warn(`⚠️ No se pudo obtener email de ${login}`);
    return null;
  }
}

// =========================================
// 🔹 PROCESO PRINCIPAL
// =========================================

async function processOrgMembers() {
  console.log(`🏢 Organización: ${ORG_NAME}`);

  // 1️⃣ Teams (una sola vez)
  const userTeamsMap = await getOrgTeamsMap();

  // 2️⃣ Miembros
  console.log('👥 Cargando miembros...');
  const members = await octokit.paginate(
    octokit.orgs.listMembers,
    { org: ORG_NAME, per_page: 100 }
  );

  console.log(`👤 Miembros encontrados: ${members.length}`);

  // 3️⃣ Procesar cada miembro
  for (const member of members) {
    console.log(`\n🔍 Procesando ${member.login}`);

    const lastActivity = await getLastActivity(member.login);
    const inactiveDays = daysInactive(lastActivity);
    const email = await getUserEmail(member.login);

    console.log({
      lastActivity: lastActivity?.toISOString() ?? null,
      inactiveDays,
      email,
    });

    // Insertar última actividad
    await insertMemberLastContribution(
      member.login,
      email,
      member.html_url,
      lastActivity ? lastActivity.toISOString() : null,
      member.id,
      inactiveDays
    );

    // Insertar teams
    const teams = userTeamsMap.get(member.login) || [];

    if (teams.length === 0) {
      console.log('   ⚠️ Sin teams');
    }

    for (const team of teams) {
      await insertMemberTeam(member.id, team);
    }

    console.log(
      `   ✅ Última actividad: ${
        lastActivity ? lastActivity.toISOString() : 'N/A'
      } | Inactivo: ${inactiveDays} días | Teams: ${teams.length}`
    );
  }
}

// =========================================
// ▶️ EJECUCIÓN
// =========================================

processOrgMembers()
  .then(() => console.log('\n🎉 Proceso completado correctamente'))
  .catch(err => {
    console.error('\n💥 Error fatal:', err.message);
    process.exit(1);
  });
