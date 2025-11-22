// Firebase Functions example (Node 18). Deploy to your Firebase project.
// Set environment variables: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.discordAuth = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const { code, redirect_uri } = req.body || {};
    if (!code || !redirect_uri) return res.status(400).send('Missing code or redirect_uri');

    const clientId = functions.config().discord.client_id || process.env.DISCORD_CLIENT_ID;
    const clientSecret = functions.config().discord.client_secret || process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).send('Discord client credentials not configured on server');

    // exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return res.status(500).send('Token exchange failed: ' + txt);
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if(!accessToken) return res.status(500).send('No access token returned');

    // fetch user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if(!userRes.ok){
      const txt = await userRes.text();
      return res.status(500).send('Failed to fetch user: ' + txt);
    }
    const userJson = await userRes.json();
    // build avatar url
    const avatarUrl = userJson.avatar
      ? `https://cdn.discordapp.com/avatars/${userJson.id}/${userJson.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(userJson.discriminator || '0') % 5}.png`;

    // return safe payload
    return res.json({
      id: userJson.id,
      username: userJson.username,
      discriminator: userJson.discriminator,
      avatar_url: avatarUrl
    });
  } catch (err) {
    console.error('discordAuth err', err);
    return res.status(500).send('Server error');
  }
});
