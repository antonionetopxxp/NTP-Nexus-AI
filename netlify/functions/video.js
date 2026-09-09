
export default async (request) => {
  if (request.method !== "POST") {
    return json(
      { error: "Método não permitido." },
      405
    );
  }

  const apiKey = process.env.RUNWAY_API_KEY;

  if (!apiKey) {
    return json(
      {
        error:
          "RUNWAY_API_KEY não configurada na Netlify."
      },
      500
    );
  }

  try {
    const body = await request.json();

    const prompt = String(
      body.prompt || ""
    ).trim();

    if (!prompt) {
      return json(
        {
          error:
            "Digite uma descrição para o vídeo."
        },
        400
      );
    }

    const duration = Number(body.duration || 5);

    const ratio =
      body.ratio === "768:1280"
        ? "768:1280"
        : "1280:768";

    const response = await fetch(
      "https://api.dev.runwayml.com/v1/image_to_video",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${apiKey}`,
          "X-Runway-Version":
            "2024-11-06"
        },

        body: JSON.stringify({
          model: "gen4.5",

          promptText: prompt,

          ratio,

          duration:
            duration === 10
              ? 10
              : 5
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erro Runway:",
        data
      );

      return json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            "O Runway não conseguiu iniciar o vídeo."
        },
        response.status
      );
    }

    if (!data?.id) {
      return json(
        {
          error:
            "O Runway não retornou o ID da tarefa."
        },
        502
      );
    }

    return json({
      taskId: data.id,
      status: "PENDING"
    });

  } catch (error) {
    console.error(
      "Erro na função video:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Erro interno ao iniciar o vídeo."
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
  path: "/.netlify/functions/video"
};
