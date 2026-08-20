export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5.6",
      input:
        "Crée une idée de vidéo TikTok éducative en français sur les astuces pour économiser de l'argent. Donne un titre court, un script de 20 secondes et 5 hashtags."
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(400).json(data);
  }

  const text =
  data.output_text ||
  data.output?.[0]?.content?.[0]?.text ||
  "Aucun contenu généré.";

  return res.status(200).json({
    success: true,
    content: text
  });
}
