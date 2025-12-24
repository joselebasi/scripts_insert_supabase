
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export const insertRepositoryInfo = async (name, url, checkmarx_flag, change_velocity_flag, continuous_build_flag, pushed_at_github, created_at_github, id_type_repository) => {
 const { data, error } = await supabase
  .from('wf_repositories_data')
  .insert(
    { name, url, checkmarx_flag, change_velocity_flag, continuous_build_flag, pushed_at_github, created_at_github, id_type_repository }
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

export const insertUserLastContribution = async (username, email, url, team, last_contribution_date) => {
  const { data, error } = await supabase
    .from('bo_user_last_contribution')
    .insert({ username, email, url, team, last_contribution_date });
  if (error) {
    console.error('Error inserting user last contribution:', error.message);
    throw error;
  } 
  return {
    success: true,
  }
}
