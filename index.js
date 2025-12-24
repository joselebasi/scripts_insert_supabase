require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertRepositoryInfo, insertUserLastContribution} = require('./db');
const { graphql } = require("@octokit/graphql");

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';

async function getWFRepos() {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: 'all', // includes public and private repos
      per_page: 100,
    });

    // Filter names that start with 'WF_'
    const filtered = repos.filter(repo => repo.name.startsWith('WF_'));
    
    console.log(`Found ${filtered.length} repos starting with 'WF_':`);

    for (const repo of filtered) {
      // if repo name contain BD id_type_repository=1 if SHELL id_type_repository=2 and else id_type_repository=3
      let id_type_repository;
      const repoName = repo.name.toUpperCase();
      console.log(repo.name);
      if (repoName.includes('BD')) {
        id_type_repository = 1;
      } else if (repoName.includes('SHELL')) {
        id_type_repository = 2;
      } else {
        id_type_repository = 3;
      }
      console.log(`Determined id_type_repository=${id_type_repository} for repo ${repo.name}`);

      //console.log(`- ${repo.name}, URL: ${repo.html_url}`);
      try {
        await insertRepositoryInfo(repo.name, repo.html_url, false, false, false, repo.pushed_at, repo.created_at, id_type_repository);
        console.log(`Inserted ${repo.name} into wf_repositories_data.`);
      } catch (err) {
        console.error(`Failed to insert ${repo.name}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}

async function getPeopleOrg(ORG_NAME) {
  try {
    const members = await octokit.paginate(octokit.orgs.listMembers, {
      org: ORG_NAME,
      per_page: 100,
    });

    console.log(`Found ${members.length} members in ${ORG_NAME}`);

    for (const member of members) {
      const activity = await getLastContribution(member.login);

      // Obtener email público del usuario
      let email = null;
      try {
        const userInfo = await octokit.users.getByUsername({ username: member.login });
        email = userInfo.data.email;
      } catch (err) {
        console.error(`Error obteniendo email para ${member.login}:`, err.message);
      }

      console.log(`- ${member.login} (email: ${email ?? "No público"})`);
      console.log(
        `   Activity → Total: ${activity.total}, Last: ${activity.lastContribution ?? "No activity"}`
      );

      const teams = await getUserTeamsGraphQL(ORG_NAME, member.login);

      if (teams.length > 1) {
        for (const team of teams) {
          try {
            await insertUserLastContribution (
              member.login,
              email || '',
              member.html_url,
              team,
              activity.lastContribution
            );
          } catch (err) {
            console.error(`Failed to insert last contribution for ${member.login} in team ${team}:`, err.message);
          }
        console.log(`   Teams → ${teams.join(", ") || "No teams"}`);
        }
        
      } else {
        try {
          await insertUserLastContribution (
            member.login,
            email || '',
            member.html_url,
            'No team',
            activity.lastContribution
          );
        } catch (err) {
          console.error(`Failed to insert last contribution for ${member.login} in team ${team}:`, err.message);
        } 
      
    }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}


async function getLastContribution(login) {
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
          totalRepositoryContributions
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

  const result = await graphqlWithAuth(query, {
    login,
    from: "2025-10-23T00:00:00Z",
    to: new Date().toISOString(),
  });

  const cc = result.user.contributionsCollection;

  const total =
    cc.totalCommitContributions +
    cc.totalPullRequestContributions +
    cc.totalPullRequestReviewContributions +
    cc.totalIssueContributions +
    cc.totalRepositoryContributions;

  const days = cc.contributionCalendar.weeks
    .flatMap(w => w.contributionDays)
    .filter(d => d.contributionCount > 0);

  return {
    total,
    lastContribution: days.at(-1)?.date ?? null,
  };
}

async function getUserTeamsGraphQL(org, username) {
  const query = `
    query($org: String!, $username: String!) {
      organization(login: $org) {
        teams(first: 100) {
          nodes {
            name
            slug
            members(first: 100, query: $username) {
              nodes {
                login
              }
            }
          }
        }
      }
    }
  `;

  const result = await graphqlWithAuth(query, {
    org,
    username,
  });

  const teams = result.organization.teams.nodes
    .filter(team => team.members.nodes.length > 0)
    .map(team => team.name ?? team.slug);

  return teams;
}

getPeopleOrg(ORG_NAME);