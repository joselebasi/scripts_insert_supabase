require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const Bottleneck = require('bottleneck');
const { insertRepositoryStatus } = require('./db.js');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// 🔥 Global Throttling: 1 request every 1000ms, max 1 concurrent
const limiter = new Bottleneck({
  minTime: 1500,
  maxConcurrent: 1,
});

const ORG_NAME = 'BUS-BackOffice';

function parseTopics(names) {
  return names.reduce((acc, topic) => {
    const [key, ...rest] = topic.split('-');
    const value = rest.join('-');

    acc[key] = value || null;
    return acc;
  }, {});
}

async function getWFRepos() {
  try {
    console.log(`🏢 Fetching repositories for organization: ${ORG_NAME}`);

    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: 'all',
      per_page: 100,
    });

    const reposBackoffices = repos.filter(
      repo => repo.name.startsWith('WF_') || repo.name.startsWith('ORA_')
    );

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

      // ⏱ throttle por si GitHub te rate-limita
      const { data: repoTopics } = await limiter.schedule(() =>
        octokit.request('GET /repos/{owner}/{repo}/topics', {
          owner: ORG_NAME,
          repo: repo.name,
        })
      );

      const parsed = parseTopics(repoTopics.names || []);

      /*
        parsed queda así:
        {
          framework: 'spring-boot',
          release: 'cloud',
          toolbuild: 'maven',
          version: 'spring-boot-3-0-0',
          tech: 'java',
          type: 'backend',
          status: 'automation-complete'
        }
      */

      await insertRepositoryStatus(
        parsed.status || null,              // status
        parsed.type || null,                // entity_type
        repo.html_url,                      // url
        id_type_repository,                 // id_type_repository
        parsed.toolbuild || null,           // toolbuild
        parsed.framework || null,           // framework
        parsed.version || null,             // version
        parsed.release || null              // release
      );

      console.log(`📦 Inserted: ${repo.name}`);
    }

    console.log('\n🎉 All repositories processed.');
  } catch (error) {
    console.error('💥 Error fetching repos:', error);
  }
}

getWFRepos();
