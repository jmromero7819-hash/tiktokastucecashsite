export default async function handler(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    return res.status(405).send("Méthode non autorisée");
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL manquante");
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "cdn.creatomate.com"
    ) {
      return res.status(403).send("Domaine non autorisé");
    }

    const headers = {};

    // TikTok peut demander seulement une partie du fichier.
    // On transmet sa requête Range à Creatomate.
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const upstream = await fetch(parsedUrl.toString(), {
      method: req.method,
      headers
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res
        .status(upstream.status)
        .send("Impossible de récupérer la vidéo");
    }

    const contentType =
      upstream.headers.get("content-type") || "video/mp4";

    const contentLength =
      upstream.headers.get("content-length");

    const contentRange =
      upstream.headers.get("content-range");

    const acceptRanges =
      upstream.headers.get("accept-ranges") || "bytes";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    // Si Creatomate répond 206, on répond aussi 206 à TikTok.
    res.status(upstream.status);

    if (req.method === "HEAD") {
      return res.end();
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.send(buffer);

  } catch (error) {
    console.error(error);

    return res
      .status(500)
      .send("Erreur serveur");
  }
}
