export default async (request) => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Nexus AI Function funcionando!"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};

export const config = {
  path: "/.netlify/functions/chat"
};
