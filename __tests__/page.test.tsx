import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../app/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// SpeechRecognition mock
const mockRecognitionStart = vi.fn();
const mockRecognitionStop = vi.fn();

type MockRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

let mockRecognitionInstance: MockRecognitionInstance = {
  lang: "",
  interimResults: false,
  continuous: false,
  onresult: null,
  onend: null,
  onerror: null,
  start: mockRecognitionStart,
  stop: mockRecognitionStop,
};

const MockSpeechRecognition = vi.fn(() => {
  mockRecognitionInstance = {
    lang: "",
    interimResults: false,
    continuous: false,
    onresult: null,
    onend: null,
    onerror: null,
    start: mockRecognitionStart,
    stop: mockRecognitionStop,
  };
  return mockRecognitionInstance;
});

// SpeechSynthesis mock
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockSpeechSynthesisUtterance = vi.fn(() => ({}));

vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);
vi.stubGlobal("webkitSpeechRecognition", MockSpeechRecognition);
vi.stubGlobal("speechSynthesis", { speak: mockSpeak, cancel: mockCancel });
vi.stubGlobal("SpeechSynthesisUtterance", mockSpeechSynthesisUtterance);

function mockWeatherResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      city: "Seoul",
      weather: "clear sky",
      temperature: 22,
      response: "서울은 맑고 22°C입니다.",
      ...overrides,
    }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockRecognitionStart.mockReset();
  mockRecognitionStop.mockReset();
  mockSpeak.mockReset();
  mockCancel.mockReset();
  mockSpeechSynthesisUtterance.mockReset();
  MockSpeechRecognition.mockClear();
});

describe("채팅 UI", () => {
  it("초기 환영 메시지가 표시된다", () => {
    render(<Home />);
    expect(screen.getByText(/날씨가 궁금한 지역을 물어보세요/)).toBeInTheDocument();
  });

  it("입력창과 전송 버튼이 렌더링된다", () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/날씨를 물어보세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전송" })).toBeInTheDocument();
  });

  it("빈 입력이면 전송 버튼이 비활성화된다", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "전송" })).toBeDisabled();
  });

  it("메시지 입력 후 전송하면 사용자 메시지가 표시된다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    expect(screen.getByText("서울 날씨")).toBeInTheDocument();
  });

  it("API 응답이 채팅에 표시된다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(screen.getByText("서울은 맑고 22°C입니다.")).toBeInTheDocument();
    });
  });

  it("응답 후 도시명과 온도 뱃지가 표시된다", async () => {
    mockFetch.mockResolvedValueOnce(
      mockWeatherResponse({ city: "Busan", temperature: 18, response: "부산은 흐립니다." })
    );

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "부산 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(screen.getByText(/Busan/)).toBeInTheDocument();
      expect(screen.getByText(/18°C/)).toBeInTheDocument();
    });
  });

  it("Enter 키로 메시지를 전송할 수 있다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse({ response: "서울은 맑습니다." }));

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨{Enter}");

    await waitFor(() => {
      expect(screen.getByText("서울은 맑습니다.")).toBeInTheDocument();
    });
  });

  it("API 오류 시 에러 메시지가 표시된다", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(screen.getByText(/서버와 통신 중 오류/)).toBeInTheDocument();
    });
  });

  it("전송 후 입력창이 비워진다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());

    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText(/날씨를 물어보세요/);

    await user.type(input, "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });
});

describe("STT (음성 입력)", () => {
  it("마이크 버튼이 렌더링된다", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "음성 입력 시작" })).toBeInTheDocument();
  });

  it("마이크 버튼 클릭 시 SpeechRecognition이 시작된다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));

    expect(MockSpeechRecognition).toHaveBeenCalledOnce();
    expect(mockRecognitionStart).toHaveBeenCalledOnce();
  });

  it("음성 인식 언어가 ko-KR로 설정된다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));

    expect(mockRecognitionInstance.lang).toBe("ko-KR");
  });

  it("음성 인식 중에는 버튼 레이블이 바뀐다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));

    expect(screen.getByRole("button", { name: "음성 인식 중지" })).toBeInTheDocument();
  });

  it("onresult 콜백으로 인식된 텍스트가 입력창에 채워진다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));

    // onresult → 입력값 설정, onend → 듣기 상태 해제 (placeholder 복원)
    act(() => {
      mockRecognitionInstance.onresult!({
        results: [[{ transcript: "서울 날씨" }]],
      } as unknown as SpeechRecognitionEvent);
      mockRecognitionInstance.onend!();
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/날씨를 물어보세요/)).toHaveValue("서울 날씨");
    });
  });

  it("onend 콜백 후 듣기 상태가 해제된다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));

    act(() => {
      mockRecognitionInstance.onend!();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "음성 입력 시작" })).toBeInTheDocument();
    });
  });

  it("음성 인식 중 버튼 재클릭 시 stop이 호출된다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "음성 입력 시작" }));
    await user.click(screen.getByRole("button", { name: "음성 인식 중지" }));

    expect(mockRecognitionStop).toHaveBeenCalledOnce();
  });
});

describe("TTS (음성 출력)", () => {
  it("자동 읽기 토글 버튼이 헤더에 렌더링된다", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /자동 읽기/ })).toBeInTheDocument();
  });

  it("초기에는 자동 읽기가 꺼져 있다", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "자동 읽기 켜기" })).toBeInTheDocument();
  });

  it("자동 읽기 토글 클릭 시 켜진다", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "자동 읽기 켜기" }));

    expect(screen.getByRole("button", { name: "자동 읽기 끄기" })).toBeInTheDocument();
  });

  it("자동 읽기가 켜진 상태에서 AI 응답 시 speak가 호출된다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "자동 읽기 켜기" }));
    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalledOnce();
    });
  });

  it("자동 읽기가 꺼진 상태에서는 speak가 호출되지 않는다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(screen.getByText("서울은 맑고 22°C입니다.")).toBeInTheDocument();
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it("각 AI 메시지에 읽기 버튼이 표시된다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "메시지 읽기" }).length).toBeGreaterThan(0);
    });
  });

  it("메시지 읽기 버튼 클릭 시 speak가 호출된다", async () => {
    mockFetch.mockResolvedValueOnce(mockWeatherResponse());
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText(/날씨를 물어보세요/), "서울 날씨");
    await user.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => screen.getAllByRole("button", { name: "메시지 읽기" }));
    const speakButtons = screen.getAllByRole("button", { name: "메시지 읽기" });
    await user.click(speakButtons[speakButtons.length - 1]);

    expect(mockSpeak).toHaveBeenCalledOnce();
  });
});
