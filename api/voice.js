export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({
      error: "Texte manquant"
    });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({
      error: "ELEVENLABS_API_KEY manquante"
    });
  }

  try {
    const voiceId = "JBFqnCBsd6RMkjVDRZzb";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2"
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();

      return res.status(response.status).json({
        error: "Erreur ElevenLabs",
        details
      });
    }

    const audioBuffer =
      Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);

    return res.status(200).send(audioBuffer);

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
}
