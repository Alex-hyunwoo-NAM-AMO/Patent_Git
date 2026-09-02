# 구현 계획 — 직무발명신고서 자동 작성 시스템

관련 아키텍처: `docs/architecture.md`. 이 계획은 **코드 착수 계획**이며,
실제 착수는 사용자 결정 2건(AI 경로 a/b, 로그인 방식 승인) 확정 후 시작한다.
계획 자체는 두 분기를 모두 수용하도록 어댑터 경계를 고정한다.

---

## 0. 전제 / 확정 사실 (검증됨)
- Wrks 관리 API 키 동작 확인 (`gateway-api.wrks.ai`, 헤더 `API-KEY`).
  - `GET /admin/users?email=` 로 직원 실재 검증 + 이름/사번/부서/이메일 취득 가능.
- AI 생성 엔드포인트는 게이트웨이에 없음 → 어댑터로 격리 (Mock/OpenAI호환/Wrks).
- 표준양식 셀 채움 + 원본 슬라이드 병합 PoC 통과 (python-pptx).

## 1. 리포지토리 구조
```
/workspace
├─ server/                 # Node.js + Express + TypeScript
│  ├─ src/
│  │  ├─ index.ts          # 앱 부트스트랩, 라우팅
│  │  ├─ config.ts         # env 로딩 (.env), 상수
│  │  ├─ auth/
│  │  │  ├─ AuthAdapter.ts          # interface
│  │  │  ├─ EmailDirectoryAuth.ts   # dev: /admin/users 대조
│  │  │  └─ WrksEncryptedSsoAuth.ts # prod: 암호화코드 (스텁, 키 확보 후)
│  │  ├─ ai/
│  │  │  ├─ AIAdapter.ts            # interface: generateSheet()
│  │  │  ├─ MockAIProvider.ts       # 규칙기반 (분기 b 기본)
│  │  │  ├─ OpenAICompatProvider.ts # 분기 a
│  │  │  └─ WrksAIProvider.ts       # prod 스텁 (URL 확보 후)
│  │  ├─ wrks/WrksAdminClient.ts    # /admin/users, /departments 래퍼
│  │  ├─ parse/                     # 업로드 문서 → 텍스트+이미지 (child proc)
│  │  ├─ pptx/                      # 표준양식 채움 + 병합 (python child proc)
│  │  ├─ routes/                    # /login /upload /draft /finalize
│  │  └─ store/                     # (선택) SQLite 초안·이력
│  ├─ python/                       # python-pptx 스크립트 (fill.py, merge.py, parse.py)
│  ├─ public/                       # 프론트 정적 (업로드/편집/확정 화면)
│  ├─ package.json / tsconfig.json / .env.example
├─ template/standard_form.pptx      # 표준양식 원본 (.inputs에서 복사)
├─ output/                          # 산출 PPTX 가시적 저장
├─ deploy/                          # systemd unit, apache proxy conf 샘플
└─ docs/architecture.md
```

## 2. 단계별 작업 (순서 = 의존성 순)

### P1. 스캐폴딩 & 검증 파이프라인
- [ ] `server/` npm init, TS 설정, Express, `.env.example` (`WRKS_API_KEY`, `WRKS_GATEWAY`, `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `PORT=8080`, `BASE_PATH=/invention`).
- [ ] python venv + `python-pptx pdfplumber` 설치, `python/` 스크립트 뼈대.
- [ ] health check 라우트 + lint/build 통과.

### P2. Wrks 관리 클라이언트
- [ ] `WrksAdminClient`: `getUserByEmail(email)`, `searchUsers(name)`, `getDepartments()`.
- [ ] 실제 키로 통합 테스트 (직원 1명 조회 성공 assert). **키는 서버 전용, 로그 마스킹.**

### P3. 인증 (분기: 로그인 승인 시)
- [ ] `AuthAdapter` 인터페이스 + `EmailDirectoryAuth` (이메일 → getUserByEmail → 세션 쿠키).
- [ ] `WrksEncryptedSsoAuth` 스텁 (평문 `email|ts|name`, 복호화 TODO — 키 확보 후).
- [ ] 세션 미들웨어, 미인증 차단.

### P4. 문서 파싱
- [ ] PPTX 파싱 (텍스트 슬라이드별 + 미디어 추출). PDF/DOCX는 2차.
- [ ] 업로드 라우트(멀티파트, 용량·확장자 제한), 임시 저장.

### P5. AI 어댑터 (분기: a=OpenAI호환 / b=Mock)
- [ ] `AIAdapter.generateSheet(text) → {title, applications, completeness, jiji:[5], flags[]}`.
- [ ] 프롬프트 설계: 표준양식 3면 5항목 + 작성원칙(약어 병기, 동일용어, **미확인 수치 생성금지**),
      부족 항목은 `flags`에 `[발명자 확인 필요]`.
- [ ] `MockAIProvider`(항상 동작) + (a면) `OpenAICompatProvider`.
- [ ] `WrksAIProvider` 스텁 (base URL/헤더 주입점만 확정).

### P6. PPTX 엔진
- [ ] `fill.py`: 표준양식 사본에 §2 매핑대로 셀 주입 (서식 보존 — 검증된 방식).
- [ ] `merge.py`: 4면 안내 삭제 + 원본 슬라이드 이관. **이미지 rId 재작성 처리** (PoC 미해결분).
- [ ] 발명자 정보 자동 채움(대표발명자 = 로그인 사용자), 기여율 합계 100 검증.

### P7. 검토·수정 UI (visual-engineering + uiux 스킬 위임 대상)
- [ ] 3단 플로우: 업로드 → 초안 편집(필드별 textarea, flag 강조, 공동발명자 추가) → 확정.
- [ ] 기여율 실시간 100 검증, 법적필수(국가R&D/공개이력) 필수 입력 게이트.
- [ ] 확정 시 PPTX 생성 → 다운로드 + `output/` 저장.

### P8. 배포
- [ ] systemd unit (Node 8080 상주), `deploy/apache-invention.conf` (ProxyPass `/invention`).
- [ ] `output/` 가시 디렉터리 확인, 산출물 사본.
- [ ] 배포서버 공인 IP를 Wrks API 키 허용 IP에 등록 안내(사용자 조치).

## 3. 위임 전략
- P7 (UI): `task(category="visual-engineering", load_skills=["uiux","frontend-ui-ux"])`.
- P8 (배포): `onpod-deploy` 스킬 참고.
- 나머지(P1~P6): 핵심 로직·보안 민감 → 부모 에이전트가 직접 구현.

## 4. 검증 게이트 (각 단계 완료 조건)
- 코드: `lsp_diagnostics` clean + build 통과.
- P2: 실제 Wrks 호출 성공.
- P6: 생성 PPTX 재오픈·무결성·셀값 assert.
- 최종: 실제 아이디어 문서(Hybrid VIA Fill)로 end-to-end 1회 성공.

## 5. 미해결/리스크
- Wrks AI 생성 API URL 비공개 → 분기 b(Mock)로 흡수, 확보 시 `WrksAIProvider` 주입.
- 암호화 SSO 키 미확보 → dev는 이메일 대조, prod 전환 시 활성화.
- PPTX 이미지 병합 rId 재작성 (P6 핵심 난점).
- 관리 API 키 = 전직원 PII 접근 → 서버 전용·IP 화이트리스트 필수.

## 6. 착수 트리거 (사용자 확정 대기)
1. AI 경로: (a) OpenAI 호환 키 제공 / (b) Mock 우선.
2. dev 로그인: 이메일→/admin/users 대조 승인.
