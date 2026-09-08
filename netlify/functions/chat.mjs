export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return json(
      {
        error: "GEMINI_API_KEY não configurada na Netlify."
      },
      500
    );
  }

  try {
    const form = await request.formData();

    const message = String(form.get("message") || "").trim();

    if (!message) {
      return json(
        {
          error: "Digite uma mensagem."
        },
        400
      );
    }

    const systemPrompt = String(
      form.get("systemPrompt") ||
      "Você é o Nexus AI, um assistente de inteligência artificial útil, preciso e objetivo. Responda em português do Brasil."
    );

    let history = [];

    const historyValue = String(
      form.get("history") || "[]"
    );

    try {
      const parsed = JSON.parse(historyValue);

      if (Array.isArray(parsed)) {
        history = parsed;
      }
    } catch (error) {
      console.warn("Histórico inválido.");
      history = [];
    }

    const contents = [];

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

    contents.push({
      role: "user",
      parts: [
        {
          text: message
        }
      ]
    });

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

    console.log("Enviando requisição para Gemini...");

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
              text: systemPrompt
            }
          ]
        },
        contents
      })
    });

    const rawText = await response.text();

    console.log(
      "Gemini HTTP:",
      response.status
    );

    console.log(
      "Gemini resposta:",
      rawText.slice(0, 2000)
    );

    let data = {};

    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch (error) {
        return json(
          {
            error: "O Gemini retornou uma resposta que não é JSON.",
            status: response.status,
            details: rawText.slice(0, 2000)
          },
          502
        );
      }
    }

    if (!response.ok) {
      const apiError =
        data?.error?.message ||
        "Erro na API do Gemini.";

      return json(
        {
          error: apiError,
          status: response.status,
          details: data?.error || null
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
          error: "O Gemini não retornou texto.",
          details: data
        },
        502
      );
    }

    return json({
      text
    });

  } catch (error) {
    console.error(
      "Erro na função chat:",
      error
    );

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
