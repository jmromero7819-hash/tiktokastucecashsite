export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  // Récupération du token TikTok
  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((cookie) => {
        const parts = cookie.trim().split("=");
        const key = parts.shift();
        return [key, parts.join("=")];
      })
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

  try {
    // Sécurité : on limite les sources vidéo autorisées
    const parsedUrl = new URL(video_url);

    const allowedHosts = [
      "cdn.creatomate.com",
      "f002.backblazeb2.com",
      "tiktokastucecashsite.vercel.app"
    ];

    if (
      parsedUrl.protocol !== "https:" ||
      !allowedHosts.includes(parsedUrl.hostname)
    ) {
      return res.status(403).json({
        error: "Domaine vidéo non autorisé"
      });
    }

    // 1. Télécharger la vidéo côté serveur
    const videoResponse = await fetch(video_url);

    if (!videoResponse.ok) {
      return res.status(400).json({
        error: "Impossible de télécharger la vidéo",
        status: videoResponse.status
      });
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);
    const videoSize = videoBuffer.length;

    if (!videoSize) {
      return res.status(400).json({
        error: "La vidéo téléchargée est vide"
      });
    }

    // TikTok autorise jusqu'à 64 Mo pour un chunk unique
    const MAX_SINGLE_CHUNK = 64 * 1024 * 1024;

    if (videoSize > MAX_SINGLE_CHUNK) {
      return res.status(400).json({
        error:
          "La vidéo dépasse 64 Mo. Une version avec upload multi-chunks sera nécessaire.",
        video_size: videoSize
      });
    }

    // 2. Initialiser FILE_UPLOAD chez TikTok
    const initResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          source_info: {
            source: "FILE_UPLOAD",
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1
          }
        })
      }
    );

    const initData = await initResponse.json();

    if (
      !initResponse.ok ||
      !initData.data?.upload_url ||
      (initData.error && initData.error.code !== "ok")
    ) {
      return res.status(400).json({
        error: "Erreur pendant l'initialisation TikTok",
        details: initData
      });
    }

    const uploadUrl = initData.data.upload_url;
    const publishId = initData.data.publish_id;

    // 3. Envoyer réellement les octets du MP4 à TikTok
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoSize),
        "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`
      },
      body: videoBuffer
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();

      return res.status(400).json({
        error: "TikTok a refusé le fichier vidéo",
        status: uploadResponse.status,
        details: uploadError
      });
    }

    return res.status(200).json({
      success: true,
      publish_id: publishId,
      video_size: videoSize,
      message:
        "Vidéo transférée directement aux serveurs TikTok. Vérifie maintenant son statut."
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return res.status(500).json({
      error: "Erreur serveur pendant l'envoi",
      details: error.message
    });
  }
}
