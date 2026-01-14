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

    // 2. Fetch Meli Credentials for this organization to get Access Token
    const { data: meliAccount, error: accountError } = await supabaseAdmin
      .from('meli_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!meliAccount) {
      // If not found, just return success or info (nothing to disconnect)
      return NextResponse.json({ message: 'No account to disconnect' });
    }

    // 3. Revoke permission on Mercado Libre (Best Effort)
    const clientId = process.env.NEXT_PUBLIC_MELI_APP_ID || '8074300052363571';
    const accessToken = meliAccount.access_token;

    if (accessToken && clientId) {
      try {
        // A. Get User ID explicitly (using 'me' might fail in revocation URL)
        const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (userResponse.ok) {
           const userData = await userResponse.json();
           
           // B. Revoke the application for this user
           const revokeResponse = await fetch(`https://api.mercadolibre.com/users/${userData.id}/applications/${clientId}`, {
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${accessToken}` }
           });
           
           if (!revokeResponse.ok) {
             const revokeErr = await revokeResponse.text();
             console.warn('Failed to revoke Meli token on Meli side:', revokeErr);
           } else {
             console.log('Successfully revoked Meli token.');
           }
        } else {
           console.warn('Could not fetch user/me for revocation. Token might be invalid already.');
        }
      } catch (revocationError) {
        console.error('Error during Meli token revocation:', revocationError);
        // Continue to delete from DB regardless
      }
    }

    // 4. Delete Meli Credentials for this organization using admin client
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
