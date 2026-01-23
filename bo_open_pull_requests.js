require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertOpenPullRequests } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';
let count = 0;
async function getWFRepos() {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: 'all', // includes public and private repos
      per_page: 100,
    });

    // Keep repos that start with 'WF_' or 'ORA_'
    const reposBackoffices = repos.filter(repo => repo.name.startsWith('WF_') || repo.name.startsWith('ORA_'));
    const numRepos = reposBackoffices.length;

    console.log(`Found ${numRepos} repos starting with 'WF_' or 'ORA_':`);

    for (const repo of reposBackoffices) {
      console.log(`Processing repo: ${repo.name}`);

      try {
        // Fetch open pull requests for the repository
        const pullRequests = await octokit.paginate(octokit.pulls.list, {
          owner: ORG_NAME,
          repo: repo.name,
          state: 'open',
          per_page: 100,
        });

        for (const pr of pullRequests) {
          count++;
          const { error } = await insertOpenPullRequests(
            pr.user.login,
            pr.head.ref,
            pr.base.ref,
            pr.title,
            pr.html_url,
            pr.number,
            pr.requested_reviewers.map(reviewer => reviewer.login).join(', '),
            pr.created_at
          );
        }
      } catch (error) {
        console.error(`Error fetching open pull requests for ${repo.name}:`, error.message);
      }
    }
    console.log(`Total open pull requests: ${count}`);
  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}

getWFRepos();