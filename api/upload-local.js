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
      .map((cookie) => {
        const parts = cookie.trim().split("=");
        const key = parts.shift();

        return [
          key,
          parts.join("=")
        ];
      })
  );

  const accessToken =
    cookies.tiktok_access_token;

  if (!accessToken) {
    return res.status(401).json({
      error:
        "Utilisateur non connecté à TikTok"
    });
  }

  const {
    video_size,
    content_type
  } = req.body || {};

  const videoSize =
    Number(video_size);

  if (
    !Number.isFinite(videoSize) ||
    videoSize <= 0
  ) {
    return res.status(400).json({
      error:
        "video_size invalide"
    });
  }

  if (
    content_type !== "video/mp4"
  ) {
    return res.status(415).json({
      error:
        "Format vidéo invalide",
      expected:
        "video/mp4",
      received:
        content_type || null
    });
  }

  const MAX_SINGLE_CHUNK =
    64 * 1024 * 1024;

  if (
    videoSize >
    MAX_SINGLE_CHUNK
  ) {
    return res.status(400).json({
      error:
        "La vidéo dépasse 64 Mo. L'upload multi-chunks sera nécessaire.",
      video_size:
        videoSize
    });
  }

  try {

    //
    // On initialise seulement l'upload.
    // La vidéo NE traverse plus Vercel.
    //

    const initResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json; charset=UTF-8"
          },

          body: JSON.stringify({
            source_info: {
              source:
                "FILE_UPLOAD",

              video_size:
                videoSize,

              chunk_size:
                videoSize,

              total_chunk_count:
                1
            }
          })
        }
      );

    const initData =
      await initResponse.json();

    if (
      !initResponse.ok ||
      !initData.data?.upload_url ||
      !initData.data?.publish_id ||
      (
        initData.error &&
        initData.error.code !== "ok"
      )
    ) {

      return res.status(400).json({
        error:
          "Erreur pendant l'initialisation TikTok",

        details:
          initData
      });
    }

    return res.status(200).json({
      success: true,

      publish_id:
        initData.data.publish_id,

      upload_url:
        initData.data.upload_url,

      video_size:
        videoSize,

      content_type:
        "video/mp4",

      message:
        "Upload TikTok initialisé."
    });

  } catch (error) {

    console.error(
      "TIKTOK INIT ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Erreur serveur pendant l'initialisation TikTok",

      details:
        error.message
    });
  }
}
