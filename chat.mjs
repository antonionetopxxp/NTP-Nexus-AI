export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { "content-type": "application/json" }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "OPENAI_API_KEY não configurada na Netlify."
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
    const webSearch = body.webSearch === true;
    const systemPrompt = String(body.systemPrompt || "").trim();

    const input = [
      ...history
        .filter(x => x && (x.role === "user" || x.role === "assistant"))
        .map(x => ({
          role: x.role,
          content: String(x.content || "").slice(0, 12000)
        })),
      { role: "user", content: message || "Analise o conteúdo enviado." }
    ];

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-5",
      instructions: systemPrompt ||
        "Você é um assistente de IA útil, preciso, educado e objetivo. Responda em português do Brasil por padrão.",
      input
    };

    if (webSearch) payload.tools = [{ type: "web_search" }];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: data?.error?.message || "Erro na API da OpenAI."
      }), {
        status: response.status,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      text: data.output_text || "Não consegui gerar uma resposta.",
      id: data.id,
      model: data.model
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error?.message || "Erro interno."
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};

export const config = {
  path: "/.netlify/functions/chat"
};
