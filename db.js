
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

export const insertOpenPullRequests = async (author, source_branch, target_branch, title, url, id_pull_request, reviewers, created_at, name_repository) => {
  const { data, error } = await supabase
    .from('bo_open_pull_requests')
    .insert({ author, source_branch, target_branch, title, url, id_pull_request, reviewers, created_at, name_repository });
  if (error) {
    console.error('Error inserting open pull requests:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const insertRepositoryThresholdActivity = async (limit_containers_low, limit_containers_low_last_update, limit_containers_medium, limit_containers_medium_last_update, limit_containers_high, limit_containers_high_last_update, limit_containers_critical, limit_containers_critical_last_update, limit_sast_low, limit_sast_low_last_update, limit_sast_medium, limit_sast_medium_last_update, limit_sast_high, limit_sast_high_last_update, limit_sast_critical, limit_sast_critical_last_update, limit_sca_low, limit_sca_low_last_update, limit_sca_medium, limit_sca_medium_last_update, limit_sca_high, limit_sca_high_last_update, limit_sca_critical, limit_sca_critical_last_update, name_repository, owner, url_variables) => {
  const { data, error } = await supabase
    .from('bo_repository_threshold_activity')
    .insert({ limit_containers_low, limit_containers_low_last_update, limit_containers_medium, limit_containers_medium_last_update, limit_containers_high, limit_containers_high_last_update, limit_containers_critical, limit_containers_critical_last_update, limit_sast_low, limit_sast_low_last_update, limit_sast_medium, limit_sast_medium_last_update, limit_sast_high, limit_sast_high_last_update, limit_sast_critical, limit_sast_critical_last_update, limit_sca_low, limit_sca_low_last_update, limit_sca_medium, limit_sca_medium_last_update, limit_sca_high, limit_sca_high_last_update, limit_sca_critical, limit_sca_critical_last_update, name_repository, owner, url_variables });
  if (error) {
    console.error('Error inserting repository threshold activity:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}

export const insertRepositoryWorkflowsValidate = async (have_checkmarx, have_continuous_build, have_conjur, have_change_velocity, have_release_sharedpoint, have_release_github, have_validate_pr, name_repository, id_type_repository, owner, url_workflows) => {
  const { data, error } = await supabase
    .from('bo_repository_workflows_activity')
    .insert({ have_checkmarx, have_continuous_build, have_conjur, have_change_velocity, have_release_sharedpoint, have_release_github, have_validate_pr, name_repository, id_type_repository, owner, url_workflows });
  if (error) {
    console.error('Error inserting repository workflows validate:', error.message);
    throw error;
  }
  return {
    success: true,
  }
}



