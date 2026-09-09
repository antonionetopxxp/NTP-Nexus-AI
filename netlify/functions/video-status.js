export default async (request) => {
  if (request.method !== "GET") {
    return json(
      {
        error:
          "Método não permitido."
      },
      405
    );
  }

  const apiKey =
    process.env.RUNWAY_API_KEY;

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
    const url =
      new URL(request.url);

    const taskId =
      url.searchParams.get(
        "id"
      );

    if (!taskId) {
      return json(
        {
          error:
            "ID da tarefa não informado."
        },
        400
      );
    }

    const response =
      await fetch(
        `https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "GET",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "X-Runway-Version":
              "2024-11-06"
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Erro status Runway:",
        data
      );

      return json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            "Não foi possível consultar o vídeo."
        },
        response.status
      );
    }

    if (
      data.status ===
      "SUCCEEDED"
    ) {
      const video =
        data.output?.[0];

      if (!video) {
        return json(
          {
            error:
              "O Runway concluiu a tarefa, mas não retornou o vídeo."
          },
          502
        );
      }

      return json({
        status: "SUCCEEDED",
        video
      });
    }

    if (
      data.status ===
      "FAILED"
    ) {
      return json({
        status: "FAILED",

        error:
          data.failure ||
          data.failureCode ||
          "O Runway falhou ao gerar o vídeo."
      });
    }

    return json({
      status:
        data.status ||
        "PENDING"
    });

  } catch (error) {
    console.error(
      "Erro video-status:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Erro interno ao consultar o vídeo."
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
  path:
    "/.netlify/functions/video-status"
};
