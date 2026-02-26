import { NextRequest, NextResponse } from "next/server";

const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? "";
const AZURE_OPENAI_API_URL = process.env.AZURE_OPENAI_API_URL ?? "";
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY ?? "";
const OPENWEATHERMAP_API_URL = "https://api.openweathermap.org/data/2.5/weather";

async function extractCity(userInput: string): Promise<string> {
  const response = await fetch(AZURE_OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "Extract the location (city/town/district/neighborhood) in English from the user's sentence. " +
            "If the user does not specify any location, return 'Magok-dong'. " +
            "Return ONLY the location text, with no extra words, punctuation, or formatting.",
        },
        { role: "user", content: userInput },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 50,
    }),
  });

  const data = await response.json();
  const city = data.choices?.[0]?.message?.content?.trim().replace(/[\[\]]/g, "") ?? "Magok-dong";
  return city;
}

async function getWeatherInfo(city: string) {
  const params = new URLSearchParams({
    q: city,
    appid: OPENWEATHERMAP_API_KEY,
    units: "metric",
    lang: "en",
  });

  const response = await fetch(`${OPENWEATHERMAP_API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    city,
    weather: data.weather?.[0]?.description ?? "",
    temperature: data.main?.temp ?? 0,
  };
}

async function generateWeatherResponse(
  city: string,
  weather: string,
  temperature: number,
  userInput: string
): Promise<string> {
  const prompt =
    `You are a weather assistant. Based on the following information, generate a natural language response for the user.\n` +
    `User input: "${userInput}"\n` +
    `City: ${city}\n` +
    `Weather: ${weather}\n` +
    `Temperature: ${temperature}°C\n` +
    `Respond in a friendly and informative way. Answer in the same language as the user's input.`;

  const response = await fetch(AZURE_OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a helpful weather assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a weather response.";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userInput: string = body.user_input;

  if (!userInput) {
    return NextResponse.json({ error: "Missing user_input" }, { status: 400 });
  }

  try {
    const city = await extractCity(userInput);
    const weatherInfo = await getWeatherInfo(city);
    const reply = await generateWeatherResponse(
      weatherInfo.city,
      weatherInfo.weather,
      weatherInfo.temperature,
      userInput
    );

    return NextResponse.json({
      city: weatherInfo.city,
      weather: weatherInfo.weather,
      temperature: weatherInfo.temperature,
      response: reply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
