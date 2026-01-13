import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body.organizationId;

    if (!organizationId) {
       return NextResponse.json({ message: 'Organization ID required' }, { status: 400 });
    }

    // 2. Delete Meli Credentials for this organization using admin client
    const { error } = await supabaseAdmin
      .from('meli_accounts')
      .delete()
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Database error during disconnect:', error);
      return NextResponse.json({ message: 'Failed to disconnect Meli account' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Meli account disconnected successfully' 
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
