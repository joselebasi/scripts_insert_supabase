require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertRepositoryWorkflowsValidate } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';


async function getWFRepos() {
  const targetRepo = 'WF_SEMBRADOTIENDAV2_BE';

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
    let haveReleaseSharepoint = false;
    let haveReleaseGithub = false;
    let haveValidatePR = false;
    let isCloud = false;

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

          if (content.includes('actions/props-conjur')) {
            haveConjur = true;
            console.log(`Found Conjur usage in: ${file.name}`);
          }

          if (content.includes('ServiceNow/servicenow-devops-change')) {
            haveChangeVelocity = true;
            console.log(`Found Change Velocity usage in: ${file.name}`);
          }

          if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-web-ci-workflow.yml')
            || content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-publish-workflow.yml')
            || content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-ci-workflow.yml')
            || (content.includes('docker build') && content.includes('docker push'))) {
            haveContinuousBuild = true;
            console.log(`Found Continuous Build usage in: ${file.name}`);
          }

          if (content.includes('cringdahl/sharepoint-file-upload-action')) {
            haveReleaseSharepoint = true;
            console.log(`Found Release Sharepoint usage in: ${file.name}`);
          }

          if (content.includes('version_ci:') || content.includes('ncipollo/release-action')) {
            haveReleaseGithub = true;
            console.log(`Found Release Github usage in: ${file.name}`);
          }

          if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/validate-pr-backoffice.yml')) {
            haveValidatePR = true;
            console.log(`Found Validate PR usage in: ${file.name}`);
          }

          if (content.includes('azure/webapps-deploy@v2')) {
            isCloud = true;
            console.log(`Found Cloud usage in: ${file.name}`);
          }
        }
      }
    }

    console.log(`Results for ${targetRepo}:`);
    console.log(` - Checkmarx: ${haveCheckmarx}`);
    console.log(` - Continuous Build: ${haveContinuousBuild}`);
    console.log(` - Conjur: ${haveConjur}`);
    console.log(` - Change Velocity: ${haveChangeVelocity}`);
    console.log(` - Release Sharepoint: ${haveReleaseSharepoint}`);
    console.log(` - Release Github: ${haveReleaseGithub}`);
    console.log(` - Validate PR: ${haveValidatePR}`);
    console.log(` - Cloud: ${isCloud}`);

    const url_workflows = `https://github.com/${ORG_NAME}/${targetRepo}/tree/develop/.github/workflows`;

    //insertRepositoryWorkflowsValidate(haveCheckmarx, haveContinuousBuild, haveConjur, haveChangeVelocity, haveReleaseSharepoint, haveReleaseGithub, haveValidatePR, targetRepo, id_type_repository, ORG_NAME, url_workflows, isCloud);


  } catch (error) {
    console.error(`Error fetching repo ${targetRepo}:`, error.message);
  }
}

getWFRepos();
