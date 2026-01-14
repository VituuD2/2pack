import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/utils/meliServer';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      console.error('Auth Error in create test user:', authError);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body.organizationId;
    const siteId = body.siteId || 'MLB'; // Default to Brazil

    if (!organizationId) {
       return NextResponse.json({ message: 'Organization ID required' }, { status: 400 });
    }

    // 2. Fetch Meli Credentials for this organization
    const { data: meliAccount, error: accountError } = await supabaseAdmin
      .from('meli_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (accountError || !meliAccount) {
      return NextResponse.json({ message: 'Meli account not connected' }, { status: 400 });
    }

    // 3. Get Valid Access Token
    const accessToken = await getValidAccessToken(organizationId, meliAccount);

    // 4. Create Test User
    const response = await fetch('https://api.mercadolibre.com/users/test_user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        site_id: siteId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error creating test user:', data);
      return NextResponse.json({ message: 'Failed to create test user', details: data }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Create test user error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
