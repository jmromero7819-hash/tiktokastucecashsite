export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY manquante"
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        input:
          "Crée une idée de vidéo TikTok éducative en français sur les astuces pour économiser de l'argent. Donne un titre court, une accroche forte, un script naturel d'environ 20 secondes, un appel à l'action et 5 hashtags."
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erreur OpenAI",
        details: data
      });
    }

    let text = "";

    for (const item of data.output || []) {
      if (item.type !== "message") continue;

      for (const content of item.content || []) {
        if (content.type === "output_text" && content.text) {
          text += content.text;
        }
      }
    }

    if (!text.trim()) {
      return res.status(500).json({
        error: "OpenAI a répondu mais aucun texte n'a été trouvé.",
        response: data
      });
    }

    return res.status(200).json({
      success: true,
      content: text.trim()
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
}
