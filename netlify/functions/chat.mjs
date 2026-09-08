export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return json({ error: "GEMINI_API_KEY não configurada na Netlify." }, 500);
  }

  try {
    const form = await request.formData();

    const message = String(form.get("message") || "").trim();

    if (!message) {
      return json({ error: "Digite uma mensagem." }, 400);
    }

    const systemPrompt = String(
      form.get("systemPrompt") ||
      "Você é o Nexus AI, um assistente de inteligência artificial útil, preciso e objetivo. Responda em português do Brasil."
    );

    let history = [];

    try {
      history = JSON.parse(String(form.get("history") || "[]"));
    } catch {
      history = [];
    }

    const contents = [];

    contents.push({
      role: "user",
      parts: [
        {
          text: systemPrompt
        }
      ]
    });

    if (Array.isArray(history)) {
      for (const item of history.slice(-20)) {
        if (
          item &&
          (item.role === "user" || item.role === "assistant") &&
          item.content
        ) {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [
              {
                text: String(item.content).slice(0, 12000)
              }
            ]
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message
        }
      ]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return json(
        {
          error:
            data?.error?.message ||
            "Erro na API do Gemini."
        },
        response.status
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") ||
      "Não consegui gerar uma resposta.";

    return json({
      text
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          error?.message ||
          "Erro interno na função da Netlify."
      },
      500
    );
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export const config = {
  path: "/.netlify/functions/chat"
};
