# 🎯 AI 맞춤형 학습 플래너 (AI Study Planner)

> **수험생과 학습자를 위한 시각적으로 편안한 대시보드형 AI 커리큘럼 설계 웹앱**  
> Google **Gemini 3.5 Flash Lite** 모델과 **Serper.dev 실시간 웹 검색**을 결합하여, 사용자의 목표와 수준에 맞춘 최적의 학습 로드맵을 제공합니다.

---

## ✨ 핵심 기능

1. **간결한 3단계 스텝형 입력 UI**
   - 목표 & 시험일(D-day) ➔ 학습 환경(수준, 가용시간) ➔ 세부 선호도(취약점, 학습 스타일)로 이어지는 직관적인 카드형 입력창.

2. **눈이 편안한 모던 대시보드 뷰 (Comfort Sage Green 테마)**
   - **상단 요약**: D-day 실시간 카운트다운 배지, 일일 To-do 달성도 게이지 바(%), 최신 출제 경향 꿀팁.
   - **오늘의 집중 To-do**: 체크박스 클릭 시 즉시 취소선 반영 및 전체 진도율(%) 실시간 계산.
   - **에빙하우스 망각곡선 복습 뱃지**: 1일차(24시간), 3일차(72시간), 7일차 주간 누적 복습 전략 안내.
   - **핵심 점검 퀴즈 아코디언**: 클릭 시 정답과 상세 해설이 펼쳐지는 인터랙션 카드로 시각적 정보 과부하 방지.
   - **주간 로드맵 타임라인**: 1주차~3주차 마일스톤을 한눈에 조망하는 타임라인 뷰.
   - **학습 회고 카드**: 오늘 몰입도 이모지(😄, 😐, 😫) 선택 및 3줄 회고 메모 로컬 저장(Local Storage).

3. **결과 활용 및 내보내기**
   - **전체 플랜 복사**: 마크다운 양식으로 클립보드에 원클릭 복사 (노션, 메모장 즉시 활용).
   - **Markdown 다운로드**: `.md` 파일로 소장용 내보내기 지원.

4. **보안 및 안전성**
   - API Key는 `.env` 환경변수로 격리 관리되며, `.gitignore`를 통해 GitHub에 절대 유출되지 않도록 설계.

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 |
| :--- | :--- |
| **Backend** | Python 3.11+, Flask, python-dotenv, requests |
| **Frontend** | HTML5, Modern CSS3 (CSS Variables, Responsive Grid), Vanilla JavaScript |
| **AI / API** | Google GenAI SDK (`gemini-3.5-flash-lite`), Serper.dev Google Search API |
| **VCS** | Git |

---

## 📂 프로젝트 구조

```text
ai-study-planner/
├── app.py              # Flask 백엔드 서버 (Gemini 3.5 Flash Lite & Serper API 연동)
├── requirements.txt    # 필수 파이썬 패키지 목록
├── .env.example        # 환경변수 키 양식 견본
├── .gitignore          # Git 추적 제외 목록 (.env, venv 등 보안 파일 보호)
├── README.md           # 프로젝트 소개 및 매뉴얼
├── templates/
│   └── index.html      # 스텝형 입력창 & 대시보드 HTML 마크업
└── static/
    ├── css/
    │   └── style.css   # 눈이 편안한 세이지 그린 모던 카드 UI 스타일
    └── js/
        └── app.js      # 실시간 진도율 계산, 아코디언 토글, 마크다운 내보내기
```

---

## 🚀 빠른 시작 가이드 (Getting Started)

### 1. 가상환경 생성 및 활성화
```powershell
# 프로젝트 폴더 이동
cd C:\AI-study\ai-study-planner

# 가상환경 생성
py -m venv venv

# 가상환경 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### 2. 패키지 설치
```powershell
py -m pip install -r requirements.txt
```

### 3. 환경변수 설정 (`.env`)
`.env` 파일을 생성하고 발급받은 API 키를 입력합니다:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
SERPER_API_KEY=your_serper_api_key_here  # 선택 사항 (없어도 작동)
```
- [Google AI Studio](https://aistudio.google.com/)에서 Gemini API 키 무료 발급

### 4. 서버 실행
```powershell
py app.py
```
브라우저에서 `http://127.0.0.1:5000`으로 접속하여 맞춤형 플래너를 사용하세요!

---

## 📄 라이선스
MIT License
