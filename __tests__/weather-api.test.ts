import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/weather/route";

// fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// env vars
vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
vi.stubEnv("AZURE_OPENAI_API_URL", "https://mock-azure.com/openai");
vi.stubEnv("OPENWEATHERMAP_API_KEY", "test-weather-key");

beforeEach(() => {
  mockFetch.mockReset();
});

function buildRequest(body: object) {
  return new NextRequest(
    new Request("http://localhost/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/weather", () => {
  it("도시 추출 → 날씨 조회 → AI 응답 생성 흐름이 정상 동작한다", async () => {
    // 1) extractCity 응답
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Seoul" } }],
      }),
    });
    // 2) getWeatherInfo 응답
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        weather: [{ description: "clear sky" }],
        main: { temp: 22.5 },
      }),
    });
    // 3) generateWeatherResponse 응답
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "서울은 현재 맑고 22.5°C입니다." } }],
      }),
    });

    const res = await POST(buildRequest({ user_input: "서울 날씨 알려줘" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.city).toBe("Seoul");
    expect(data.weather).toBe("clear sky");
    expect(data.temperature).toBe(22.5);
    expect(data.response).toBe("서울은 현재 맑고 22.5°C입니다.");
  });

  it("user_input 없으면 400을 반환한다", async () => {
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("날씨 API 실패 시 500과 에러 메시지를 반환한다", async () => {
    // extractCity 성공
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Seoul" } }] }),
    });
    // getWeatherInfo 실패
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    });

    const res = await POST(buildRequest({ user_input: "서울 날씨" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Weather API error/);
  });

  it("도시명에서 대괄호를 제거한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "[Busan]" } }],
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        weather: [{ description: "cloudy" }],
        main: { temp: 18 },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "부산은 흐립니다." } }],
      }),
    });

    const res = await POST(buildRequest({ user_input: "부산 날씨" }));
    const data = await res.json();
    expect(data.city).toBe("Busan");
  });
});
