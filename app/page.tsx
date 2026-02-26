"use client";

import { useState, useRef, useEffect } from "react";

type SpeechRecognitionEvent = {
  results: { [index: number]: { [index: number]: { transcript: string } } };
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { city: string; weather: string; temperature: number };
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "안녕하세요! 날씨가 궁금한 지역을 물어보세요 ☁️",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    setSttSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
    setTtsSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: text }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `오류가 발생했습니다: ${data.error}` },
        ]);
      } else {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          meta: {
            city: data.city,
            weather: data.weather,
            temperature: data.temperature,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (autoSpeak) speak(data.response);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "서버와 통신 중 오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌤️</span>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            AI 날씨 챗봇
          </h1>
        </div>
        {ttsSupported && (
          <button
            onClick={() => setAutoSpeak((prev) => !prev)}
            aria-label={autoSpeak ? "자동 읽기 끄기" : "자동 읽기 켜기"}
            title={autoSpeak ? "자동 읽기 켜짐" : "자동 읽기 꺼짐"}
            className={`text-xl px-2 py-1 rounded-lg transition-colors ${
              autoSpeak
                ? "bg-sky-100 dark:bg-sky-900 text-sky-600"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {autoSpeak ? "🔊" : "🔇"}
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
                🤖
              </div>
            )}
            <div className="max-w-[75%] space-y-1">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-sky-500 text-white rounded-tr-sm"
                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-2 px-1">
                {msg.meta && (
                  <>
                    <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                      📍 {msg.meta.city}
                    </span>
                    <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                      🌡️ {msg.meta.temperature}°C
                    </span>
                  </>
                )}
                {msg.role === "assistant" && ttsSupported && (
                  <button
                    onClick={() => speak(msg.content)}
                    aria-label="메시지 읽기"
                    className="text-xs text-zinc-400 hover:text-sky-500 transition-colors"
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
              🤖
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-3 bg-white dark:bg-zinc-900 border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          {sttSupported && (
            <Button
              onClick={toggleListening}
              aria-label={isListening ? "음성 인식 중지" : "음성 입력 시작"}
              variant="outline"
              className={`rounded-full px-3 shrink-0 transition-colors ${
                isListening
                  ? "bg-red-50 border-red-300 text-red-500 dark:bg-red-950 dark:border-red-700"
                  : ""
              }`}
            >
              {isListening ? "⏹" : "🎤"}
            </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? "듣는 중..." : "날씨를 물어보세요. 예) 서울 날씨 어때?"
            }
            disabled={loading || isListening}
            className="flex-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-full px-5 bg-sky-500 hover:bg-sky-600 text-white shrink-0"
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
