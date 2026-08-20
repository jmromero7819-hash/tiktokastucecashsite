export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
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

  const { publish_id } = req.body || {};

  if (!publish_id) {
    return res.status(400).json({
      error: "publish_id manquant"
    });
  }

  try {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          publish_id
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      success: true,
      status: data
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
}
