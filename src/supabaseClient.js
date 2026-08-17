import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppywqlxnjiiufxjhxjah.supabase.co'
const supabaseKey = 'sb_publishable_D4__WFiswA7TXWNnv_ZYvg_Qn86bbxF'

export const supabase = createClient(supabaseUrl, supabaseKey)
