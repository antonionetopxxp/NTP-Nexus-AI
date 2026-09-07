export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json({
      error: "OPENAI_API_KEY não configurada na Netlify."
    }, 500);
  }

  try {
    const form = await request.formData();

    const message = String(form.get("message") || "").trim();
    const webSearch =
      String(form.get("webSearch") || "false") === "true";
    const systemPrompt =
      String(form.get("systemPrompt") || "").trim();

    let history = [];

    try {
      history = JSON.parse(
        String(form.get("history") || "[]")
      );
    } catch {
      history = [];
    }

    history = Array.isArray(history)
      ? history
          .filter(
            x =>
              x &&
              (x.role === "user" ||
               x.role === "assistant")
          )
          .slice(-20)
          .map(x => ({
            role: x.role,
            content: String(x.content || "").slice(0, 12000)
          }))
      : [];

    const userContent = [
      {
        type: "input_text",
        text: message || "Analise os arquivos enviados."
      }
    ];

    const files = form
      .getAll("files")
      .filter(
        x =>
          x &&
          typeof x.arrayBuffer === "function"
      )
      .slice(0, 6);

    for (const file of files) {
      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      if (
        String(file.type || "")
          .startsWith("image/")
      ) {
        userContent.push({
          type: "input_image",
          image_url:
            `data:${file.type};base64,${buffer.toString("base64")}`
        });
      } else {
        const uploadForm = new FormData();

        uploadForm.append(
          "purpose",
          "user_data"
        );

        uploadForm.append(
          "file",
          new Blob(
            [buffer],
            {
              type:
                file.type ||
                "application/octet-stream"
            }
          ),
          file.name || "arquivo"
        );

        const uploadResponse = await fetch(
          "https://api.openai.com/v1/files",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${apiKey}`
            },
            body: uploadForm
          }
        );

        const uploaded =
          await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploaded?.error?.message ||
            "Erro ao enviar o arquivo."
          );
        }

        userContent.push({
          type: "input_file",
          file_id: uploaded.id
        });
      }
    }

    if (!message && files.length === 0) {
      return json({
        error:
          "Digite uma mensagem ou envie um arquivo."
      }, 400);
    }

    const payload = {
      model:
        process.env.OPENAI_MODEL ||
        "gpt-5",

      instructions:
        systemPrompt ||
        "Você é um assistente de IA útil, preciso, educado e objetivo. Responda em português do Brasil por padrão.",

      input: [
        ...history,
        {
          role: "user",
          content: userContent
        }
      ]
    };

    if (webSearch) {
      payload.tools = [
        { type: "web_search" }
      ];
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      return json({
        error:
          data?.error?.message ||
          "Erro na API da OpenAI."
      }, response.status);
    }

    return json({
      text:
        data.output_text ||
        "Não consegui gerar uma resposta.",

      id: data.id,
      model: data.model
    });

  } catch (error) {
    console.error(error);

    return json({
      error:
        error?.message ||
        "Erro interno na função da Netlify."
    }, 500);
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8"
      }
    }
  );
}

export const config = {
  path: "/.netlify/functions/chat"
};
