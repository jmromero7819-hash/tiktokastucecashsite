export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  if (!process.env.CREATOMATE_API_KEY) {
    return res.status(500).json({
      error: "CREATOMATE_API_KEY manquante"
    });
  }

  if (!process.env.CREATOMATE_TEMPLATE_ID) {
    return res.status(500).json({
      error: "CREATOMATE_TEMPLATE_ID manquant"
    });
  }

  const { script } = req.body || {};

  if (!script) {
    return res.status(400).json({
      error: "Script manquant"
    });
  }

  try {
    const response = await fetch(
      "https://api.creatomate.com/v2/renders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          template_id: process.env.CREATOMATE_TEMPLATE_ID,

          // Force le rendu à 100 % de la résolution du template
          render_scale: 1,

          modifications: {
            "Voiceover-1.source": script,
            "Voiceover-2.source": script,
            "Voiceover-3.source": script,
            "Voiceover-4.source": script,
            "Voiceover-5.source": script,
            "Voiceover-6.source": script
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erreur Creatomate",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      render: data
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
}
