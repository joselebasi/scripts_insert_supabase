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
  const targetRepo = 'WF_PIEVE_SIV';
  try {
    let haveCheckmarx = false;
    let haveChangeVelocity = false;
    let haveContinuousBuild = false;
    console.log(`Processing single repo: ${targetRepo}`);

    // get only the forder .github/workflows of the repository
    const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: ORG_NAME,
      repo: targetRepo,
      path: '.github/workflows',
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
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });

          const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

          if (content.includes('uses: BUS-BackOffice/BO_Pipelines/.github/workflows/checkmarx-workflow.yml@main')) {
            haveCheckmarx = true;
            console.log(`Found Checkmarx usage in: ${file.name}`);
          }

          if (file.name.includes('continuous-build')) {
            haveContinuousBuild = true;
          }
        }
      }
    }

    console.log(`Results for ${targetRepo}:`);
    console.log(` - Checkmarx: ${haveCheckmarx}`);
    console.log(` - Continuous Build: ${haveContinuousBuild}`);


  } catch (error) {
    console.error(`Error fetching repo ${targetRepo}:`, error.message);
  }
}

getWFRepos();
