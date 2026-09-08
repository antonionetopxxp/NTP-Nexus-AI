export default async (request) => {
  return new Response(
    JSON.stringify({
      text: "Olá! A Function do Nexus AI está funcionando corretamente."
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
};

export const config = {
  path: "/.netlify/functions/chat"
};
