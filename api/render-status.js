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

  const { render_id } = req.body || {};

  if (!render_id) {
    return res.status(400).json({
      error: "render_id manquant"
    });
  }

  try {
    const response = await fetch(
      `https://api.creatomate.com/v2/renders/${render_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`
        }
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
