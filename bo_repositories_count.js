require('dotenv').config();
const { Octokit } = require('@octokit/rest');

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

    // Keep repos that start with 'WF_' but exclude those starting with 'WF_BD'
    const filtered = repos.filter(repo => repo.name.startsWith('WF_') || repo.name.startsWith('ORA_'));
    const numRepos = filtered.length;

    console.log(`Found ${numRepos} repos starting with 'WF_' or 'ORA_':`);

  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}

getWFRepos();