import { supabaseAdmin } from '@/utils/supabase/admin';

interface MeliTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

// Helper to refresh the Meli access token if it's expired or about to expire
export async function getValidAccessToken(organizationId: string, currentAccount: any) {
  const now = new Date();
  const expiresAt = new Date(currentAccount.expires_at);
  
  // Buffer of 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return currentAccount.access_token;
  }

  console.log('Refreshing Meli token for org:', organizationId);

  const clientId = process.env.NEXT_PUBLIC_MELI_APP_ID;
  const clientSecret = process.env.MELI_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Meli credentials missing in env');
  }

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: currentAccount.refresh_token,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh Meli token');
  }

  const data: MeliTokenResponse = await response.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Update DB with new token
  const { error: updateError } = await supabaseAdmin
    .from('meli_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq('organization_id', organizationId);

  if (updateError) {
    console.error('Failed to update refreshed token in DB:', updateError);
  }

  return data.access_token;
}
