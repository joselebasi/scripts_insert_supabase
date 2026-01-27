require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { insertRepositoryThresholdActivity } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = 'BUS-BackOffice';

async function getRepoVariables(repo, owner) {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/variables",
    {
      owner,
      repo,
      per_page: 100,
    }
  );

  return response.data.variables.map(v => ({
    name: v.name,
    value: v.value,
    updated_at: v.updated_at
  }));
}



async function getInsertRepositoryThresholdActivity(repo, owner) {

  const threshold_repo = await getRepoVariables(repo, owner);

  // Build a Map for fast lookup: name -> { name, value, updated_at }
  const varsByName = new Map(threshold_repo.map(v => [v.name, v]));

  const getVar = (name, defaultValue = 0) => {
    const v = varsByName.get(name);
    return {
      value: v ? v.value : defaultValue,
      updated_at: v ? v.updated_at : null
    };
  };

  // Containers
  const containers_low = getVar('LIMIT_CONTAINERS_LOW');
  const containers_medium = getVar('LIMIT_CONTAINERS_MEDIUM');
  const containers_high = getVar('LIMIT_CONTAINERS_HIGH');
  const containers_critical = getVar('LIMIT_CONTAINERS_CRITICAL');

  console.log('LIMIT_CONTAINERS_LOW', containers_low.value, containers_low.updated_at);
  console.log('LIMIT_CONTAINERS_MEDIUM', containers_medium.value, containers_medium.updated_at);
  console.log('LIMIT_CONTAINERS_HIGH', containers_high.value, containers_high.updated_at);
  console.log('LIMIT_CONTAINERS_CRITICAL', containers_critical.value, containers_critical.updated_at);

  // SAST
  const sast_low = getVar('LIMIT_SAST_LOW');
  const sast_medium = getVar('LIMIT_SAST_MEDIUM');
  const sast_high = getVar('LIMIT_SAST_HIGH');
  const sast_critical = getVar('LIMIT_SAST_CRITICAL');

  console.log('LIMIT_SAST_LOW', sast_low.value, sast_low.updated_at);
  console.log('LIMIT_SAST_MEDIUM', sast_medium.value, sast_medium.updated_at);
  console.log('LIMIT_SAST_HIGH', sast_high.value, sast_high.updated_at);
  console.log('LIMIT_SAST_CRITICAL', sast_critical.value, sast_critical.updated_at);

  // SCA
  const sca_low = getVar('LIMIT_SCA_LOW');
  const sca_medium = getVar('LIMIT_SCA_MEDIUM');
  const sca_high = getVar('LIMIT_SCA_HIGH');
  const sca_critical = getVar('LIMIT_SCA_CRITICAL');

  console.log('LIMIT_SCA_LOW', sca_low.value, sca_low.updated_at);
  console.log('LIMIT_SCA_MEDIUM', sca_medium.value, sca_medium.updated_at);
  console.log('LIMIT_SCA_HIGH', sca_high.value, sca_high.updated_at);
  console.log('LIMIT_SCA_CRITICAL', sca_critical.value, sca_critical.updated_at);

  const url_variables = `https://github.com/${owner}/${repo}/settings/variables/actions`;

  await insertRepositoryThresholdActivity(
    // Containers
    containers_low.value, containers_low.updated_at,
    containers_medium.value, containers_medium.updated_at,
    containers_high.value, containers_high.updated_at,
    containers_critical.value, containers_critical.updated_at,

    // SAST
    sast_low.value, sast_low.updated_at,
    sast_medium.value, sast_medium.updated_at,
    sast_high.value, sast_high.updated_at,
    sast_critical.value, sast_critical.updated_at,

    // SCA
    sca_low.value, sca_low.updated_at,
    sca_medium.value, sca_medium.updated_at,
    sca_high.value, sca_high.updated_at,
    sca_critical.value, sca_critical.updated_at,

    // Metadata
    repo,
    owner,
    url_variables
  );
}

// Run
getInsertRepositoryThresholdActivity('WF_PIEVE_SIV', ORG_NAME).catch(err => {
  console.error('Error executing getWFRepos:', err);
});