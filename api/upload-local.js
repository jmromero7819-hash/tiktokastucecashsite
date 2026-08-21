export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

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
        return [key, parts.join("=")];
      })
  );

  const accessToken =
    cookies.tiktok_access_token;

  if (!accessToken) {
    return res.status(401).json({
      error: "Utilisateur non connecté à TikTok"
    });
  }

  try {
    const contentType =
      (req.headers["content-type"] || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (contentType !== "video/mp4") {
      return res.status(415).json({
        error: "Format vidéo invalide",
        received_content_type: contentType,
        expected_content_type: "video/mp4"
      });
    }

    const videoBuffer =
      await readRawBody(req);

    const videoSize =
      videoBuffer.length;

    if (!videoSize) {
      return res.status(400).json({
        error: "Vidéo vide"
      });
    }

    const MAX_SINGLE_CHUNK =
      64 * 1024 * 1024;

    if (videoSize > MAX_SINGLE_CHUNK) {
      return res.status(400).json({
        error: "La vidéo dépasse 64 Mo.",
        video_size: videoSize
      });
    }

    // 1. Initialiser l'upload TikTok
    const initResponse = await fetch(
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
            source: "FILE_UPLOAD",
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1
          }
        })
      }
    );

    const initData =
      await initResponse.json();

    if (
      !initResponse.ok ||
      !initData.data?.upload_url ||
      (
        initData.error &&
        initData.error.code !== "ok"
      )
    ) {
      return res.status(400).json({
        error:
          "Erreur pendant l'initialisation TikTok",
        details: initData
      });
    }

    const uploadUrl =
      initData.data.upload_url;

    const publishId =
      initData.data.publish_id;

    // 2. Envoyer le vrai MP4 à TikTok
    const uploadResponse =
      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length":
            String(videoSize),
          "Content-Range":
            `bytes 0-${videoSize - 1}/${videoSize}`
        },
        body: videoBuffer
      });

    if (!uploadResponse.ok) {
      const details =
        await uploadResponse.text();

      return res.status(400).json({
        error:
          "TikTok a refusé la vidéo",
        status:
          uploadResponse.status,
        details
      });
    }

    return res.status(200).json({
      success: true,
      publish_id: publishId,
      video_size: videoSize,
      content_type: contentType,
      message:
        "Vidéo MP4 720×1280 transférée vers TikTok."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        "Erreur serveur pendant l'envoi",
      details:
        error.message
    });
  }
}
