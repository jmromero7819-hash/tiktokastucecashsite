export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL manquante");
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).send("Impossible de récupérer la vidéo");
    }

    const contentType =
      response.headers.get("content-type") || "video/mp4";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const buffer = Buffer.from(await response.arrayBuffer());

    return res.status(200).send(buffer);

  } catch (error) {
    return res.status(500).send("Erreur serveur");
  }
}
