require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const Bottleneck = require('bottleneck');
const { insertRepositoryWorkflowsValidate } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

// 🔥 Global Throttling: 1 request every 1000ms, max 1 concurrent
const limiter = new Bottleneck({
  minTime: 1000,
  maxConcurrent: 1,
});

const ORG_NAME = 'BUS-BackOffice';

async function getWFRepos() {
  try {
    console.log(`🏢 Fetching repositories for organization: ${ORG_NAME}`);
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: 'all',
      per_page: 100,
    });

    // Filter repos
    const reposBackoffices = repos.filter(repo => repo.name.startsWith('WF_') || repo.name.startsWith('ORA_'));
    console.log(`✅ Found ${reposBackoffices.length} matching repositories.`);

    for (const repo of reposBackoffices) {
      const targetRepo = repo.name;
      const repoNameUpper = targetRepo.toUpperCase();

      let id_type_repository;
      if ((repoNameUpper.includes('SHELL') && repoNameUpper.includes('ORA'))) {
        id_type_repository = 2;
      } else if ((repoNameUpper.includes('BD') || repoNameUpper.includes('DB')) && repoNameUpper.includes('WF')) {
        id_type_repository = 4;
      } else if (repoNameUpper.includes('ORA')) {
        id_type_repository = 1;
      } else if (repoNameUpper.includes('SHELL') && repoNameUpper.includes('WF')) {
        id_type_repository = 5;
      } else {
        id_type_repository = 3;
      }

      try {
        console.log(`\n🔍 Processing repository: ${targetRepo}`);

        // Use GraphQL to fetch all workflow files content in a single request
        const query = `
          query ($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              object(expression: "develop:.github/workflows") {
                ... on Tree {
                  entries {
                    name
                    type
                    object {
                      ... on Blob {
                        text
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const result = await limiter.schedule(() =>
          graphqlWithAuth(query, { owner: ORG_NAME, name: targetRepo })
        );

        const workflowEntries = result.repository?.object?.entries || [];

        let haveCheckmarx = false;
        let haveChangeVelocity = false;
        let haveContinuousBuild = false;
        let haveConjur = false;
        let haveReleaseSharepoint = false;
        let haveReleaseGithub = false;
        let haveValidatePR = false;
        let isCloud = false;

        for (const entry of workflowEntries) {
          if (entry.type === 'blob' && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
            const content = entry.object?.text || '';

            if (content.includes('checkmarx-analysis:')) {
              haveCheckmarx = true;
            }
            if (content.includes('actions/props-conjur')) {
              haveConjur = true;
            }
            if (content.includes('ServiceNow/servicenow-devops-change')) {
              haveChangeVelocity = true;
            }
            if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-web-ci-workflow.yml') ||
              content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-publish-workflow.yml') ||
              content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/dotnet-ci-workflow.yml') ||
              content.includes('docker build') && content.includes('docker push')) {
              haveContinuousBuild = true;
            }
            if (content.includes('cringdahl/sharepoint-file-upload-action') || content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/')) {
              haveReleaseSharepoint = true;
            }
            if (content.includes('version_ci:') || content.includes('ncipollo/release-action')) {
              haveReleaseGithub = true;
            }
            if (content.includes('BUS-BackOffice/BO_Pipelines/.github/workflows/validate-pr-backoffice.yml')) {
              haveValidatePR = true;
            }
            if (content.includes('azure/webapps-deploy@v2')) {
              isCloud = true;
            }
          }
        }

        console.log(`   Results: [CMX: ${haveCheckmarx}, Build: ${haveContinuousBuild}, Conjur: ${haveConjur}, Vel: ${haveChangeVelocity}, SP: ${haveReleaseSharepoint}, GH: ${haveReleaseGithub}, PR: ${haveValidatePR}], Cloud: ${isCloud}`);

        const url_workflows = `https://github.com/${ORG_NAME}/${targetRepo}/tree/develop/.github/workflows`;

        await insertRepositoryWorkflowsValidate(
          haveCheckmarx, haveContinuousBuild, haveConjur, haveChangeVelocity,
          haveReleaseSharepoint, haveReleaseGithub, haveValidatePR,
          targetRepo, id_type_repository, ORG_NAME, url_workflows, isCloud
        );

      } catch (error) {
        console.error(`   ❌ Error processing ${targetRepo}:`, error.message);
      }
    }
    console.log('\n🎉 All repositories processed.');
  } catch (error) {
    console.error('💥 Error fetching repos:', error.message);
  }
}

getWFRepos();
