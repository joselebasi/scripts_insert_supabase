require('dotenv').config();
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';
const TARGET_REPO = 'WF_SEMBRADOTIENDAV2_BE';


async function getWFRepos() {
  //get the repository's topics
  const { data: repoTopics } = await octokit.request('GET /repos/{owner}/{repo}/topics', {
    owner: ORG_NAME,
    repo: TARGET_REPO,
  });

  console.log(repoTopics);

}

getWFRepos();
