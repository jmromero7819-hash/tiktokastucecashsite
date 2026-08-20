export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map(c => c.trim().split("="))
  );

  const accessToken = cookies.tiktok_access_token;

  if (!accessToken) {
    return res.status(401).json({
      error: "Utilisateur non connecté à TikTok"
    });
  }

  const { video_url } = req.body || {};

  if (!video_url) {
    return res.status(400).json({
      error: "video_url manquante"
    });
  }

  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        source_info: {
          source: "PULL_FROM_URL",
          video_url: video_url
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok || (data.error && data.error.code !== "ok")) {
    return res.status(400).json(data);
  }

  return res.status(200).json({
    success: true,
    publish_id: data.data?.publish_id,
    message:
      "Vidéo envoyée à TikTok. Ouvre la notification TikTok pour terminer la publication."
  });
}
