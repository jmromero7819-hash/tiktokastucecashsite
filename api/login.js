import crypto from "crypto";

export default function handler(req, res) {
  const state = crypto.randomUUID();

  res.setHeader(
    "Set-Cookie",
    `tiktok_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: "user.info.basic,video.upload",
    response_type: "code",
    redirect_uri: "https://tiktokastucecashsite.vercel.app/api/callback",
    state,
    disable_auto_auth: "1"
  });

  res.redirect(
    302,
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );
}
