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
      const value = String(form.get("history") || "[]");
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        history = parsed.slice(-6);
      }
    } catch {
      history = [];
    }

    const contents = [];

    for (const item of history) {
      if (
        item &&
        (item.role === "user" || item.role === "assistant") &&
        item.content
      ) {
        contents.push({
          role: item.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(item.content).slice(0, 6000)
            }
          ]
        });
      }
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message.slice(0, 12000)
        }
      ]
    });

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemPrompt.slice(0, 6000)
            }
          ]
        },

        contents,

        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "low"
          },
          maxOutputTokens: 1000
        }
      })
    });

    const rawText = await response.text();

    console.log("Gemini HTTP:", response.status);

    if (!rawText.trim()) {
      return json(
        {
          error: "O Gemini não retornou nenhuma resposta.",
          status: response.status
        },
        502
      );
    }

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Resposta não JSON:", rawText.slice(0, 1000));

      return json(
        {
          error: "Resposta inválida recebida do Gemini.",
          status: response.status
        },
        502
      );
    }

    if (!response.ok) {
      console.error("Erro Gemini:", JSON.stringify(data));

      return json(
        {
          error:
            data?.error?.message ||
            "Erro na API do Gemini.",
          status: response.status
        },
        response.status
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part?.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      console.error(
        "Gemini não retornou texto:",
        JSON.stringify(data)
      );

      return json(
        {
          error: "O Gemini não retornou texto."
        },
        502
      );
    }

    return json({
      text
    });

  } catch (error) {
    console.error("Erro na função:", error);

    return json(
      {
        error:
          error?.message ||
          "Erro interno na função."
      },
      500
    );
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}

export const config = {
  path: "/.netlify/functions/chat"
};
