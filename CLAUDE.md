# claude_weather — 프로젝트 지침

## 프로젝트 개요
자연어로 날씨를 질문하면 AI가 도시를 추출하고 실시간 날씨를 응답하는 채팅 앱.

## 핵심 파일
- `app/page.tsx` — 채팅 UI (Client Component)
- `app/api/weather/route.ts` — 날씨 API Route (도시 추출 → 날씨 조회 → 응답 생성)
- `SPEC.md` — 기능/API/테스트 명세

## 개발 워크플로우

### TDD (테스트 주도 개발)
1. 수용 기준을 바탕으로 실패하는 테스트를 먼저 작성한다
2. 테스트를 통과하는 최소한의 코드를 구현한다
3. 테스트가 통과하는 상태를 유지하면서 리팩터링한다
4. `bun run test` 로 전체 테스트 통과 확인
5. `SPEC.md` 변경 이력 업데이트

### 커밋 규칙
- 기능 단위로 커밋한다. 하나의 커밋에 여러 기능을 섞지 않는다
- Conventional Commits 형식 사용: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Plan Mode 규칙
- 계획은 최대한 간결하게 작성한다. 문법보다 간결함이 우선이다
- 모든 계획의 마지막에 미결정 질문 목록을 추가한다

## 작업 규칙
- 모든 작업에 수용 기준(Acceptance Criteria)을 반드시 포함한다:
  1. 구현이 올바른지 검증할 구체적 테스트/명령을 정의한다
  2. 적합성 기준 형식을 사용한다: 구체적 입력과 기대 출력을 명시한다
  3. 구현 후: 모든 수용 기준을 실행하고 통과를 확인한다

## 개발 규칙

### 테스트
- 테스트 파일 위치: `__tests__/`
- 실행: `bun run test`
- watch 모드: `bun run test:watch`
- 환경: Vitest 2 + React Testing Library + happy-dom
- **주의**: `bun test` 대신 `bun run test` 사용 (bun 자체 런너와 충돌)

### 환경 변수
`.env.local` 에 API 키 보관 — 절대 커밋 금지

### API 호출 패턴
- Azure OpenAI: `api-key` 헤더 사용
- OpenWeatherMap: query param `appid` 사용
- 도시 미입력 기본값: `Magok-dong`

## 자주 쓰는 명령어
```bash
bun dev          # 개발 서버 (http://localhost:3000)
bun run test     # 테스트 실행
bun run build    # 프로덕션 빌드
```
