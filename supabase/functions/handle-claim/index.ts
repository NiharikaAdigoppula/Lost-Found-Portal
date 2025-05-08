import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, claimerEmail, claimerName, claimerMessage } = await req.json();

    if (!itemId || !claimerEmail || !claimerName) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) {
      throw new Error(`Failed to fetch item: ${itemError.message}`);
    }

    if (!item) {
      throw new Error('Item not found');
    }

    // Check if item is already claimed
    if (item.status !== 'found') {
      throw new Error('Item is not available for claiming');
    }

    // Update item status
    const { error: updateError } = await supabase
      .from('lost_found_items')
      .update({
        status: 'pending',
        claimed_by: claimerEmail,
        claimed_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('status', 'found'); // Only update if status is still 'found'

    if (updateError) {
      throw new Error(`Failed to update item: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Claim request processed successfully'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  } catch (error) {
    console.error('Error processing claim:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to process claim request' 
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});