require('dotenv').config();
const { Octokit } = require('@octokit/rest');
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

    // Keep repos that start with 'WF_' but exclude those starting with 'WF_BD'
    const filtered = repos.filter(repo => repo.name.startsWith('WF_'));
    const finalFiltered = filtered.filter(repo => !repo.name.startsWith('WF_BD'));
    const numRepos = finalFiltered.length;


    console.log(`Found ${numRepos} repos starting with 'WF_':`);

    for (const repo of finalFiltered) {
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
    }
  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}


getWFRepos();