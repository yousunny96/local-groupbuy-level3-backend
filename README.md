# 동네장터 공동구매 · 백엔드 (NestJS) · Level 3

동네 로컬푸드 마켓의 **농산물 공동구매 신청·취소 서버**입니다. Level 2의 수량·1인 한도·마감 규칙에 더해, **로그인과 역할(관리자·일반)**, 그리고 **GPT를 쓰는 AI 현황 요약**이 들어 있습니다.
고객 요청과 설계 내용은 [기획서.md](기획서.md)에 있습니다. (Level 3 과제)

- 프론트엔드 저장소: `local-groupbuy-level3-frontend`
- 기술: NestJS · PostgreSQL (Render) · OpenAI GPT API
- 모든 이름·연락처·계정은 가상 데이터입니다.

> ⏳ **첫 접속이 느릴 수 있어요.** 무료 Render 서버는 한동안 쓰지 않으면 잠들어서, 첫 요청에 **30초~1분** 정도 걸립니다. 한 번 깨어나면 빨라집니다. 화면이 "불러오는 중"이면 잠시만 기다려 주세요. `/health`를 먼저 열어 서버를 깨울 수 있어요.

## 서버가 지키는 규칙
| # | 규칙 |
|---|---|
| R1 | 남은 수량보다 많이 신청할 수 없다 |
| R2 | 1인 한도를 넘길 수 없다 (같은 **계정**의 기존 신청과 합산) |
| R3 | 마감 후에는 신청도 취소도 할 수 없다 |
| R4 | 내 신청만 취소할 수 있다 (관리자는 모두 가능) |
| R5 | 동시에 신청이 몰려도 수량이 어긋나지 않는다 |
| R6 | 로그인해야 신청·취소·내 신청 보기가 된다 |
| R7 | 관리자만 공동구매 등록, 전체 신청 목록, 현황, 가상 데이터 채우기, AI 요약을 쓸 수 있다 |
| R8 | 내 신청 목록에는 내 신청만 나온다 |
| R9 | 로그인이 실패하면 아이디·비밀번호 중 무엇이 틀렸는지 알려 주지 않는다 |
| R10 | 출입증(토큰)은 12시간만 유효하고 위조할 수 없다. 역할은 매번 DB에서 확인한다 |

## API
| 방식 | 주소 | 누가 | 설명 |
|---|---|---|---|
| GET | `/health` | 모두 | 서버와 DB 연결 확인 |
| POST | `/auth/login` | 모두 | 아이디·비밀번호 로그인 → 출입증(토큰) |
| GET | `/auth/me` | 로그인 | 내 정보 |
| GET | `/group-buys` | 모두 | 목록. `q`(상품명), `category`, `origin`, `status`(진행중/마감) 필터 |
| GET | `/group-buys/options` | 모두 | 필터에 쓸 종류·산지 목록 |
| GET | `/group-buys/:id` | 모두 | 상세 |
| POST | `/group-buys` | 관리자 | 공동구매 등록 |
| POST | `/orders` | 로그인 | 신청 (`groupBuyId`, `boxes`) |
| POST | `/orders/cancel` | 로그인 | 취소 (`orderCode`). 내 신청만 |
| GET | `/my/orders` | 로그인 | 내 신청 목록 |
| GET | `/orders` | 관리자 | 전체 신청 목록. `q`(이름·연락처·신청번호), `groupBuyId`, `status` |
| GET | `/stats` | 관리자 | 현황 숫자 3개 |
| POST | `/seed` | 관리자 | 가상 데이터와 확인용 계정으로 전부 다시 채우기 (기존 데이터 삭제) |
| POST | `/admin/ai/summary` | 관리자 | GPT로 신청 현황 요약 |

로그인이 필요한 요청은 `Authorization: Bearer <토큰>` 헤더를 붙입니다.

## 확인용 계정 (가상)
| 역할 | 아이디 | 비밀번호 |
|---|---|---|
| 관리자 | `admin` | `admin1234` |
| 일반 사용자 | `user01` ~ `user20` | `user1234` |

## AI 기능
관리자 화면의 **AI로 현황 요약하기** 버튼을 누르면, 백엔드가 공동구매별 신청 현황(상품명, 박스 수, 마감까지 남은 시간 등)을 GPT에 보내 쉬운 말 요약과 오늘 할 일을 받아 옵니다.
**신청자 이름·연락처는 GPT에 보내지 않습니다.** GPT 키(`GPT_API_KEY`)는 이 서버의 설정값에만 있고 GitHub에는 올리지 않습니다.

## 내 컴퓨터에서 실행
```bash
npm install
cp .env.example .env     # 값을 채운다 (아래 표 참고)
npm run build
npm run start:prod       # 기본 http://localhost:4000 (PORT로 바꿈)
```
처음 켜면 `fde_level3` 스키마에 테이블을 만들고, 데이터가 없으면 가상 데이터와 확인용 계정을 채웁니다.

## 설정값 (환경변수)
| 이름 | 뜻 | 예시 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 접속 주소. 비밀번호가 들어 있어 **절대 GitHub에 올리지 않습니다** | 내 컴퓨터: Render의 External Database URL / 배포: **Internal** Database URL |
| `DB_SCHEMA` | 이 과제 전용 칸막이(스키마) 이름. Level 2와 섞이지 않게 따로 씁니다 | `fde_level3` (넣지 않아도 기본값) |
| `FRONTEND_ORIGIN` | 접속을 허용할 프론트 주소(CORS). 여러 개는 쉼표로. 끝에 `/`를 붙이지 않습니다 | `https://내-프론트.vercel.app` |
| `AUTH_SECRET` | 로그인 출입증에 서명하는 비밀 문자열. 16자 이상 아무 긴 문자열. **GitHub에 올리지 않습니다** | (긴 무작위 문자열) |
| `GPT_API_KEY` | OpenAI GPT API 키. **GitHub에 올리지 않습니다** | `sk-...` |
| `GPT_MODEL` | 사용할 GPT 모델 (선택) | `gpt-4o-mini` (기본값) |
| `PORT` | 서버 포트. Render가 자동으로 넣어 줍니다 | (넣지 않아도 됨) |

## Render에 올리기
1. Render 대시보드 → **New → Web Service** → 이 저장소를 연결합니다.
2. 아래처럼 입력합니다.

| 항목 | 값 |
|---|---|
| Language / Runtime | Node |
| Region | DB와 같은 지역 |
| Branch | `main` |
| Root Directory | (비워 둠) |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod` |
| Instance Type | Free |

3. **Environment** 에 `DATABASE_URL`, `FRONTEND_ORIGIN`, `AUTH_SECRET`, `GPT_API_KEY`를 넣습니다. (`DB_SCHEMA`는 기본값이 `fde_level3`라 넣지 않아도 됩니다. `NODE_VERSION=24`를 넣어도 되고, 저장소의 `.node-version` 파일이 같은 역할을 합니다.)
4. 배포가 끝나면 `https://서비스이름.onrender.com/health`가 `{"status":"ok","db":"connected"}`를 돌려주는지 확인합니다.
5. Vercel에 프론트를 올린 뒤, 그 주소를 `FRONTEND_ORIGIN`에 넣고 다시 배포합니다.

> Render 안에서 서버끼리 쓰는 **Internal Database URL**을 `DATABASE_URL`로 넣어도 되고, 외부 주소(External)를 넣어도 됩니다. 이 서버는 인증서를 검증하며 접속합니다.
