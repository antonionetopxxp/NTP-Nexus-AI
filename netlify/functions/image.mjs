
export default async (request) => {
  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Método não permitido."
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY não configurada na Netlify."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const body = await request.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return new Response(
        JSON.stringify({
          error: "Digite uma descrição para a imagem."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          model: "gemini-3.1-flash-image",

          input: [
            {
              type: "text",
              text:
                "Crie uma imagem de alta qualidade baseada nesta descrição: " +
                prompt
            }
          ],

          response_format: {
            type: "image",
            mime_type: "image/png",
            aspect_ratio: "16:9",
            image_size: "1K"
          }
        })
      }
    );

    const raw = await response.text();

    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "O Google retornou uma resposta inválida."
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (!response.ok) {
      console.error(
        "Erro Gemini Image:",
        data
      );

      return new Response(
        JSON.stringify({
          error:
            data.error?.message ||
            "O Gemini não conseguiu gerar a imagem."
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const image =
      data.output_image?.data;

    if (!image) {
      console.error(
        "Resposta sem output_image:",
        data
      );

      return new Response(
        JSON.stringify({
          error:
            "O Gemini não retornou nenhuma imagem."
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        image
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8"
        }
      }
    );

  } catch (error) {

    console.error(
      "Erro na função image:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error.message ||
          "Erro interno ao gerar imagem."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};


export const config = {
  path: "/.netlify/functions/image"
};
