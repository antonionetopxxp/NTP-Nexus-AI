
```js
export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return json(
      { error: "GEMINI_API_KEY não configurada na Netlify." },
      500
    );
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
      const historyValue = String(form.get("history") || "[]");

      if (historyValue.trim()) {
        history = JSON.parse(historyValue);
      }
    } catch (error) {
      console.warn("Histórico JSON inválido. Continuando sem histórico.");
      history = [];
    }

    const contents = [];

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

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        contents
      })
    });

    // Não usar response.json() diretamente.
    // Primeiro pegamos o texto para evitar:
    // "Unexpected end of JSON input"
    const rawText = await response.text();

    let data = {};

    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error("Resposta não-JSON do Gemini:", rawText);

        return json(
          {
            error:
              "A API do Gemini retornou uma resposta inválida.",
            details: rawText.slice(0, 1000)
          },
          502
        );
      }
    }

    if (!response.ok) {
      return json(
        {
          error:
            data?.error?.message ||
            `Erro na API do Gemini. Código HTTP: ${response.status}`,
          status: response.status
        },
        response.status
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() ||
      "Não consegui gerar uma resposta.";

    return json({
      text
    });
  } catch (error) {
    console.error("Erro na função chat:", error);

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
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export const config = {
  path: "/.netlify/functions/chat"
};
```
