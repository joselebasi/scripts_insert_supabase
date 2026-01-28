require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertRepositoryWorkflowsValidate } = require('./db.js');

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

    for (const targetRepo of reposBackoffices) {
      let id_type_repository;
      const repoName = targetRepo.toUpperCase();
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
        let haveCheckmarx = false;
        let haveChangeVelocity = false;
        let haveContinuousBuild = false;
        let haveConjur = false;
        let haveReleaseSharedpoint = false;
        let haveReleaseGitHub = false;
        let haveValidatePR = false;

        console.log(`Processing single repo: ${targetRepo}`);

        // get only the forder .github/workflows of the repository
        const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: ORG_NAME,
          repo: targetRepo,
          path: '.github/workflows',
          ref: 'develop',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        if (Array.isArray(workflows)) {
          for (const file of workflows) {
            if (file.type === 'file' && (file.name.endsWith('.yml') || file.name.endsWith('.yaml'))) {
              console.log(`Checking workflow file: ${file.name}`);

              const { data: fileContent } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner: ORG_NAME,
                repo: targetRepo,
                path: file.path,
                ref: 'develop',
                headers: {
                  'X-GitHub-Api-Version': '2022-11-28'
                }
              });

              const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

              if (content.includes('checkmarx-analysis:')) {
                haveCheckmarx = true;
                console.log(`Found Checkmarx usage in: ${file.name}`);
              }

              if (content.includes('.github/actions/props-conjur.yml')) {
                haveConjur = true;
                console.log(`Found Conjur usage in: ${file.name}`);
              }

              if (content.includes('ServiceNow/servicenow-devops-change')) {
                haveChangeVelocity = true;
                console.log(`Found Change Velocity usage in: ${file.name}`);
              }

              if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-web-ci-workflow.yml') || content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-publish-workflow.yml') || content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-ci-workflow.yml')) {
                haveContinuousBuild = true;
                console.log(`Found Continuous Build usage in: ${file.name}`);
              }

              if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-web-ci-workflow.yml') && content.includes('cringdahl/sharepoint-file-upload-action')) {
                haveReleaseSharedpoint = true;
                console.log(`Found Release Sharedpoint usage in: ${file.name}`);
              }

              if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/release-github.yml') && content.includes('needs: version_ci')) {
                haveReleaseGitHub = true;
                console.log(`Found Release GitHub usage in: ${file.name}`);
              }

              if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/validate-pr-backoffice.yml')) {
                haveValidatePR = true;
                console.log(`Found Validate PR usage in: ${file.name}`);
              }
            }
          }
        }

        console.log(`Results for ${targetRepo}:`);
        console.log(` - Checkmarx: ${haveCheckmarx}`);
        console.log(` - Continuous Build: ${haveContinuousBuild}`);
        console.log(` - Conjur: ${haveConjur}`);
        console.log(` - Change Velocity: ${haveChangeVelocity}`);
        console.log(` - Release Sharedpoint: ${haveReleaseSharedpoint}`);
        console.log(` - Release GitHub: ${haveReleaseGitHub}`);
        console.log(` - Validate PR: ${haveValidatePR}`);

        const url_workflows = `https://github.com/${ORG_NAME}/${targetRepo}/.github/workflows`;

        insertRepositoryWorkflowsValidate(haveCheckmarx, haveContinuousBuild, haveConjur, haveChangeVelocity, haveReleaseSharedpoint, haveReleaseGitHub, haveValidatePR, targetRepo, id_type_repository, ORG_NAME, url_workflows);


      } catch (error) {
        console.error(`Error fetching repo ${targetRepo}:`, error.message);
      }
    }
    console.log(`Total open pull requests: ${count}`);
  } catch (error) {
    console.error('Error fetching repos:', error.message);
  }
}

getWFRepos();