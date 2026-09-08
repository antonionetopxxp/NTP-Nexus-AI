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
      return json(
        { error: "Digite uma mensagem." },
        400
      );
    }

    const systemPrompt = String(
      form.get("systemPrompt") ||
      "Você é o Nexus AI, um assistente de inteligência artificial útil, preciso, educado e objetivo. Responda em português do Brasil."
    );

    let history = [];

    try {
      history = JSON.parse(
        String(form.get("history") || "[]")
      );
    } catch {
      history = [];
    }

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt
          }
        ]
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-10)) {
        if (
          item &&
          (item.role === "user" ||
            item.role === "assistant") &&
          item.content
        ) {
          contents.push({
            role:
              item.role === "assistant"
                ? "model"
                : "user",
            parts: [
              {
                text: String(item.content).slice(
                  0,
                  8000
                )
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

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 25000);

    let response;

    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
          encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

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
      text,
      model: "gemini-3.6-flash"
    });

  } catch (error) {
    console.error(error);

    if (error?.name === "AbortError") {
      return json(
        {
          error:
            "O Gemini demorou muito para responder. Tente novamente em alguns segundos."
        },
        504
      );
    }

    return json(
      {
        error:
          error?.message ||
          "Erro interno na função do Nexus AI."
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
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

export const config = {
  path: "/.netlify/functions/chat"
};
