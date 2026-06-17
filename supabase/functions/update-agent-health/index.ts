import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

interface AgentHealthUpdate {
  agent_name: string;
  current_task?: string;
  status: 'idle' | 'working' | 'error';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: AgentHealthUpdate = await req.json();
    
    // Validate required fields
    if (!body.agent_name) throw new Error("Missing required field 'agent_name'");
    if (!body.status) throw new Error("Missing required field 'status'");
    if (!['idle', 'working', 'error'].includes(body.status)) {
      throw new Error("Invalid status value. Must be 'idle', 'working', or 'error'");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    // Perform UPSERT on agent_health table
    const { data, error } = await supabase
  .from('agent_health')
  .upsert({
    agent_name: body.agent_name,
    last_seen: new Date().toISOString(),
    current_task: body.current_task || null,
    status: body.status
  }, { onConflict: 'agent_name' })
  .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
