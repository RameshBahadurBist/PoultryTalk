// app/api/chat/route.js
export async function POST(req) {
  try {
    const body = await req.json();
    const response = await fetch("http://localhost:3000/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error("Error proxying to backend:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}