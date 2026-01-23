
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export const insertRepositoryInfo = async (name, url, checkmarx_flag, change_velocity_flag, continuous_build_flag, pushed_at_github, created_at_github, id_type_repository, created_at) => {
  const { data, error } = await supabase
    .from('wf_repositories_data')
    .insert(
      { name, url, checkmarx_flag, change_velocity_flag, continuous_build_flag, pushed_at_github, created_at_github, id_type_repository, created_at }
    )
  if (error) {
    console.error('Error inserting repository info:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const getAllRepositories = async () => {
  const { data, error } = await supabase
    .from('repository_wf_info')
    .select('*');

  if (error) {
    console.error('Error fetching all repositories:', error.message);
    throw error;
  }

  return data;
}

export const insertMemberLastContribution = async (member_username, email, url, last_contribution_date, member_id, inactive_days, member_type) => {
  const { data, error } = await supabase
    .from('bo_member_last_contribution')
    .insert({ member_username, email, url, last_contribution_date, member_id, inactive_days, member_type });
  if (error) {
    console.error('Error inserting user last contribution:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const insertMemberTeam = async (member_id, team) => {
  const { data, error } = await supabase
    .from('bo_member_team')
    .insert({ member_id, team });
  if (error) {
    console.error('Error inserting member team:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const insertRepositoryActivity = async (name, url, branch, last_commit_date, member_name, id_type_repository, email) => {
  const { data, error } = await supabase
    .from('bo_repositories_activity')
    .insert({ name, url, branch, last_commit_date, member_name, id_type_repository, email });
  if (error) {
    console.error('Error inserting repository activity:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const insertOpenPullRequests = async (author, source_branch, target_branch, title, url, id_pull_request, reviewers, created_at) => {
  const { data, error } = await supabase
    .from('bo_open_pull_requests')
    .insert({ author, source_branch, target_branch, title, url, id_pull_request, reviewers, created_at });
  if (error) {
    console.error('Error inserting open pull requests:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

