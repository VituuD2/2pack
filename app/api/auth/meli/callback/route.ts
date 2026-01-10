import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // You should use the state for CSRF protection

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;
  const redirectUri = process.env.MELI_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
      return new Response('Meli credentials are not configured in environment variables', { status: 500 });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Failed to exchange token:', tokenData);
      return new Response(tokenData.message || 'Failed to exchange token', { status: tokenResponse.status });
    }

    // Get the organization_id from the state parameter
    const organizationId = state;

    if (!organizationId) {
        return new Response('Missing organization_id from state parameter', { status: 400 });
    }

    // Save the token securely in your database using the admin client
    const { error: dbError } = await supabaseAdmin
      .from('meli_accounts')
      .upsert({
        organization_id: organizationId,
        meli_user_id: tokenData.user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      }, { onConflict: 'meli_user_id' });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response('Failed to save Meli account', { status: 500 });
    }
    
    // Redirect user to the settings page with a success message
    const redirectUrl = new URL('/settings?meli_auth=success', request.url);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
