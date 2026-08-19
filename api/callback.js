export default async function handler(req, res) {
const { code, state, error, error_description } = req.query;

if (error) {
return res.status(400).send(`Erreur TikTok : ${error_description || error}`);
}

if (!code) {
return res.status(400).send("Code TikTok manquant.");
}

const redirectUri =
"https://tiktokastucecashsite.vercel.app/api/callback";

const body = new URLSearchParams({
client_key: process.env.TIKTOK_CLIENT_KEY,
client_secret: process.env.TIKTOK_CLIENT_SECRET,
code: decodeURIComponent(code),
grant_type: "authorization_code",
redirect_uri: redirectUri,
});

const response = await fetch(
"https://open.tiktokapis.com/v2/oauth/token/",
{
method: "POST",
headers: {
"Content-Type": "application/x-www-form-urlencoded",
},
body,
}
);

const data = await response.json();

if (!response.ok || data.error) {
return res
.status(400)
.send(`Erreur d'autorisation TikTok : ${JSON.stringify(data)}`);
}

res.setHeader(
"Set-Cookie",
`tiktok_access_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${data.expires_in}`
);

return res.redirect(
302,
"/?tiktok=connected"
);
}
