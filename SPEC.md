# AI 날씨 챗봇 스펙 문서

> 최종 수정: 2026-02-26

---

## 1. 개요

자연어로 날씨를 질문하면 AI가 도시를 추출하고 실시간 날씨 정보를 응답하는 채팅 인터페이스.

---

## 2. 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| UI 컴포넌트 | shadcn/ui |
| 패키지 매니저 | bun |
| 외부 AI | Azure OpenAI (GPT-4o) |
| 날씨 데이터 | OpenWeatherMap API |
| 테스트 | Vitest 2 + React Testing Library + happy-dom |

---

## 3. 아키텍처

```
사용자 입력
    │
    ▼
[채팅 UI]  app/page.tsx
    │  POST /api/weather
    ▼
[API Route]  app/api/weather/route.ts
    │
    ├─① Azure OpenAI  →  도시명 추출 (영문)
    │
    ├─② OpenWeatherMap  →  날씨/온도 조회
    │
    └─③ Azure OpenAI  →  자연어 응답 생성
```

---

## 4. 기능 명세

### 4.1 채팅 UI

| 항목 | 내용 |
|------|------|
| 초기 메시지 | "안녕하세요! 날씨가 궁금한 지역을 물어보세요 ☁️" |
| 사용자 메시지 | 오른쪽 정렬, 파란색 말풍선 |
| AI 메시지 | 왼쪽 정렬, 흰색 말풍선 + 로봇 아이콘 |
| 응답 메타 뱃지 | 도시명(📍), 온도(🌡️) 표시 |
| 로딩 상태 | 점 3개 바운스 애니메이션 |
| 전송 방법 | 버튼 클릭 또는 Enter 키 |
| 빈 입력 | 전송 버튼 비활성화 |
| 전송 후 | 입력창 초기화 |
| 자동 스크롤 | 새 메시지 시 하단으로 스크롤 |

### 4.2 STT (음성 입력) — Web Speech API

| 항목 | 내용 |
|------|------|
| 구현 | 브라우저 내장 `SpeechRecognition` (무료, API 키 불필요) |
| 지원 브라우저 | Chrome, Edge (지원 없는 경우 마이크 버튼 숨김) |
| 언어 | `ko-KR` 고정 |
| UX | 🎤 클릭 → 녹음 시작 / ⏹ 클릭 → 중지, 인식 중 입력창 비활성화 및 "듣는 중..." 표시 |
| 결과 처리 | 인식된 텍스트를 입력창에 채움 (사용자가 확인 후 전송) |

### 4.3 TTS (음성 출력) — Web Speech API

| 항목 | 내용 |
|------|------|
| 구현 | 브라우저 내장 `SpeechSynthesis` (무료, API 키 불필요) |
| 언어 | `ko-KR` 고정, 재생 속도 1x |
| 자동 읽기 | 헤더의 🔇/🔊 토글로 on/off (기본값: off) |
| 메시지별 읽기 | 각 AI 메시지에 🔊 버튼 — 클릭 시 해당 메시지 읽기 |

### 4.4 날씨 API Route

**엔드포인트:** `POST /api/weather`

**요청:**
```json
{ "user_input": "서울 날씨 어때?" }
```

**응답 (200):**
```json
{
  "city": "Seoul",
  "weather": "clear sky",
  "temperature": 22.5,
  "response": "서울은 현재 맑고 22.5°C입니다."
}
```

**에러 응답 (400):**
```json
{ "error": "Missing user_input" }
```

### 4.5 AI 처리 흐름

| 단계 | 모델 | 역할 |
|------|------|------|
| ① 도시 추출 | GPT-4o | 자연어에서 도시명을 영문으로 추출. 미입력 시 `Magok-dong` |
| ② 날씨 조회 | OpenWeatherMap | metric 단위(°C), 영문 날씨 설명 |
| ③ 응답 생성 | GPT-4o | 사용자 입력 언어에 맞춰 친절하게 응답 |

---

## 5. 환경 변수

| 변수명 | 설명 |
|--------|------|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API 키 |
| `AZURE_OPENAI_API_URL` | Azure OpenAI 엔드포인트 URL |
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap API 키 |

---

## 6. 파일 구조

```
claude_weather/
├── app/
│   ├── api/weather/route.ts   # 날씨 API Route
│   ├── layout.tsx
│   ├── page.tsx               # 채팅 UI
│   └── globals.css
├── components/ui/
│   ├── button.tsx
│   └── input.tsx
├── __tests__/
│   ├── weather-api.test.ts    # API Route 테스트 (4개)
│   └── page.test.tsx          # UI 컴포넌트 테스트 (9개)
├── lib/utils.ts
├── vitest.config.ts
├── vitest.setup.ts
└── .env.local
```

---

## 7. 테스트 명세

### API Route 테스트 (`weather-api.test.ts`)

| # | 테스트 케이스 |
|---|--------------|
| 1 | 도시 추출 → 날씨 조회 → 응답 생성 정상 흐름 |
| 2 | `user_input` 누락 시 400 반환 |
| 3 | 날씨 API 실패 시 에러 throw |
| 4 | 도시명에서 대괄호 `[]` 제거 |

### UI 테스트 (`page.test.tsx`)

**채팅 UI (9개)**

| # | 테스트 케이스 |
|---|--------------|
| 1 | 초기 환영 메시지 표시 |
| 2 | 입력창 및 전송 버튼 렌더링 |
| 3 | 빈 입력 시 전송 버튼 비활성화 |
| 4 | 사용자 메시지 표시 |
| 5 | API 응답이 채팅에 표시 |
| 6 | 도시명/온도 뱃지 표시 |
| 7 | Enter 키로 전송 |
| 8 | API 오류 시 에러 메시지 표시 |
| 9 | 전송 후 입력창 초기화 |

**STT 테스트 (7개)**

| # | 테스트 케이스 |
|---|--------------|
| 1 | 마이크 버튼 렌더링 |
| 2 | 클릭 시 SpeechRecognition 시작 |
| 3 | 인식 언어 ko-KR 설정 확인 |
| 4 | 인식 중 버튼 레이블 변경 |
| 5 | onresult 콜백으로 입력창에 텍스트 채움 |
| 6 | onend 콜백 후 듣기 상태 해제 |
| 7 | 인식 중 재클릭 시 stop 호출 |

**TTS 테스트 (7개)**

| # | 테스트 케이스 |
|---|--------------|
| 1 | 자동 읽기 토글 버튼 렌더링 |
| 2 | 초기 상태 꺼짐 확인 |
| 3 | 토글 클릭 시 켜짐 |
| 4 | 자동 읽기 켜짐 상태에서 AI 응답 시 speak 호출 |
| 5 | 자동 읽기 꺼짐 상태에서 speak 미호출 |
| 6 | 각 AI 메시지에 읽기 버튼 표시 |
| 7 | 읽기 버튼 클릭 시 speak 호출 |

---

## 8. 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-02-26 | 1.0.0 | 최초 작성 — 채팅 UI + 날씨 API Route + 테스트 환경 구축 |
| 2026-02-26 | 1.1.0 | STT/TTS 추가 — Web Speech API 기반 음성 입력/출력, 자동 읽기 토글, 메시지별 읽기 버튼 |
