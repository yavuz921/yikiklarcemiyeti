import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gtyodeljhewwqwinnnxl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0eW9kZWxqaGV3d3F3aW5ubnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Njk4NjksImV4cCI6MjA5ODM0NTg2OX0.TfZAFQKTQ63VK2y7wjv-pDSSqq3u_Ju2ugGBnyZh7n8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
