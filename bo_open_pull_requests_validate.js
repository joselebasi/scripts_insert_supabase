require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertOpenPullRequests } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';
const REPO_NAME = 'WF_ESTATUS_RETEK_V3';


async function getOpenPullRequests(orgName, repoName) {
  try {
    // Fetch open pull requests for the repository
    const pullRequests = await octokit.paginate(octokit.pulls.list, {
      owner: orgName,
      repo: repoName,
      state: 'open',
      per_page: 100,
    });

    for (const pr of pullRequests) {
      console.log(`Processing PR: ${pr.number}`);
      console.log(`Date created: ${pr.created_at}`);
    }
  } catch (error) {
    console.error('Error fetching open pull requests:', error.message);
  }
}

getOpenPullRequests(ORG_NAME, REPO_NAME);
