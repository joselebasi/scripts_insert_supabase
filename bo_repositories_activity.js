require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertRepositoryActivity } = require('./db.js');

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

    // Keep repos that start with 'WF_' or 'ORA_'
    const reposBackoffices = repos.filter(repo => repo.name.startsWith('WF_') || repo.name.startsWith('ORA_'));
    const numRepos = reposBackoffices.length;

    console.log(`Found ${numRepos} repos starting with 'WF_' or 'ORA_':`);

    for (const repo of reposBackoffices) {
      console.log(`Processing repo: ${repo.name}`);

      let id_type_repository;
      const repoName = repo.name.toUpperCase();
      if ((repoName.includes('SHELL') && repoName.includes('ORA'))) {
        id_type_repository = 2;
      } else if ((repoName.includes('BD') || repoName.includes('DB')) && repoName.includes('WF')) {
        id_type_repository = 4;
      } else if (repoName.includes('ORA')) {
        id_type_repository = 1;
      } else if (repoName.includes('SHELL') && repoName.includes('WF')) {
        id_type_repository = 5;
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

          // Fetch the last commit for this branch to get date and author details
          const { data: commitData } = await octokit.repos.getCommit({
            owner: ORG_NAME,
            repo: repo.name,
            ref: branch.commit.sha,
          });

          const last_commit_date = commitData.commit.committer.date;
          const email = commitData.commit.author.email;
          const member_name = commitData.commit.author.name;

          const { error } = await insertRepositoryActivity(
            repo.name,
            repo.html_url,
            branch.name,
            last_commit_date,
            member_name,
            id_type_repository,
            email
          );

          if (error) {
            console.error(`Error inserting repository activity for ${repo.name} branch ${branch.name}:`, error.message);
          }
        }
      } catch (branchError) {
        console.error(`Error fetching branches for ${repo.name}:`, branchError.message);
      }
    }
  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}

getWFRepos();