import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = "coebert@gmail.com";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token to get their info
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking admin status for user: ${user.email}`);

    // Check if this is the admin email
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ isAdmin: false, message: 'Not an admin email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client to manage roles
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin role already exists
    const { data: existingRole, error: checkError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing role:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check role', details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRole) {
      console.log(`Admin role already exists for ${user.email}`);
      return new Response(
        JSON.stringify({ isAdmin: true, message: 'Admin role already exists' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert admin role
    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: user.id, role: 'admin' });

    if (insertError) {
      console.error('Error inserting admin role:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin role successfully assigned to ${user.email}`);
    return new Response(
      JSON.stringify({ isAdmin: true, message: 'Admin role assigned successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
