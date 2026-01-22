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
  const targetRepo = 'ORA_RMS_PERU_DB_O_esquemas';
  try {
    console.log(`Processing single repo: ${targetRepo}`);

    const { data: repo } = await octokit.repos.get({
      owner: ORG_NAME,
      repo: targetRepo,
    });

    let id_type_repository;
    const repoName = repo.name.toUpperCase();
    if (repoName.includes('BD')) {
      id_type_repository = 1;
    } else if (repoName.includes('SHELL')) {
      id_type_repository = 2;
    } else {
      id_type_repository = 3;
    }

    try {
      // Fetch all branches for the repository
      const branches = await octokit.paginate(octokit.repos.listBranches, {
        owner: ORG_NAME,
        repo: repo.name,
        per_page: 100,
      });

      for (const branch of branches) {
        console.log(`  Processing branch: ${branch.name}`);

        // Fetch the last commit for this branch to get date and author id
        const { data: commitData } = await octokit.repos.getCommit({
          owner: ORG_NAME,
          repo: repo.name,
          ref: branch.commit.sha,
        });

        const last_commit_date = commitData.commit.committer.date;
        const author = commitData.commit.author.name;
        const email = commitData.commit.author.email;
        const first_name = email.split('@')[0].toLowerCase();


        console.log(`    Last commit date: ${last_commit_date}`);
        console.log(`    Author: ${first_name}`);
      }
    } catch (branchError) {
      console.error(`Error fetching branches for ${repo.name}:`, branchError.message);
    }
  } catch (error) {
    console.error(`Error fetching repo ${targetRepo}:`, error.message);
  }
}

getWFRepos();