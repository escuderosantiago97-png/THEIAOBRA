import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://dqxcyfcnptrzaeakxycs.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeGN5ZmNucHRyemFlYWt4eWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTExNDgsImV4cCI6MjA5Mjk2NzE0OH0.pl406RqyY8XHMcvAlmT9HXS_HZWQQlHClSWZOu4jPV8'

export const sb = createClient(SUPA_URL, SUPA_KEY)
