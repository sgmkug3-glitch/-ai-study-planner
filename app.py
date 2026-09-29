import os
import json
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import requests

# 1. 환경변수(.env) 로드
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "ai-study-planner-secret-pin-2026")

# 보안 PIN 번호 설정 (기본값: 1234)
PLANNER_PIN = os.getenv("PLANNER_PIN", "1234").strip()

# API 키 가져오기
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "").strip()

# Gemini SDK 초기화
gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("[INFO] Google GenAI Client successfully initialized.")
    except Exception as e:
        print(f"[WARN] Failed to initialize Google GenAI Client: {e}")
else:
    print("[WARN] GEMINI_API_KEY not found in .env file.")


def calculate_d_day(exam_date_str):
    """시험일 문자열(YYYY-MM-DD)로부터 오늘 기준 D-day를 계산합니다."""
    try:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        today = date.today()
        diff = (exam_date - today).days
        return diff
    except Exception:
        return None


def search_exam_info(query):
    """
    Serper.dev API를 활용해 최신 시험 일정이나 출제 경향을 실시간 검색합니다.
    (SERPER_API_KEY가 없거나 오류 발생 시 빈 결과를 안전하게 반환)
    """
    if not SERPER_API_KEY:
        print("[INFO] SERPER_API_KEY is not set. Skipping live web search.")
        return ""

    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "q": query,
        "num": 3,
        "gl": "kr",
        "hl": "ko"
    }

    try:
        print(f"[INFO] Performing live search with Serper for: '{query}'")
        resp = requests.post(url, headers=headers, json=payload, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            organic_results = data.get("organic", [])
            snippets = []
            for item in organic_results[:3]:
                title = item.get("title", "")
                snippet = item.get("snippet", "")
                if snippet:
                    snippets.append(f"- {title}: {snippet}")
            combined = "\n".join(snippets)
            print(f"[INFO] Live search found {len(snippets)} snippets.")
            return combined
        else:
            print(f"[WARN] Serper API responded with status {resp.status_code}")
            return ""
    except Exception as e:
        print(f"[WARN] Serper search request failed: {e}")
        return ""


def call_gemini_planner(user_data, web_context=""):
    """
    Gemini 3.5 Flash Lite 모델을 호출하여 구조화된 학습 플래너 JSON 데이터를 생성합니다.
    """
    if not gemini_client:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았거나 클라이언트 초기화에 실패했습니다. .env 파일을 확인해 주세요.")

    system_instruction = (
        "당신은 대한민국 최고의 수험/자격증/학습 전략 컨설턴트입니다. "
        "사용자의 목표, 가용 시간, 수준, 취약점을 분석하여 즉시 실천 가능한 체계적 커리큘럼을 작성하세요. "
        "응답은 반드시 마크다운 코드블록 없이 순수한 JSON(application/json) 규격으로만 출력해야 합니다."
    )

    prompt = f"""
[사용자 학습 환경 정보]
- 학습 목표/시험명: {user_data.get('goal', '')}
- 시험일: {user_data.get('exam_date', '')} (남은 D-day: {user_data.get('d_day', '미정')}일)
- 현재 수준: {user_data.get('level', '초급')}
- 하루 가용 시간: {user_data.get('daily_hours', '2')}시간
- 가장 취약한 영역: {user_data.get('weak_area', '기본 개념')}
- 선호하는 학습 방식: {user_data.get('learning_style', '개념 정독 후 문제 풀이')}

[실시간 웹 검색 참고 정보]
{web_context if web_context else '실시간 검색 정보 없음 (기본 전문 지식 활용)'}

[출력 요구사항]
다음 JSON 키 구조를 정확하게 준수하여 유효한 JSON 형식으로만 작성하세요. 줄바꿈이나 텍스트 설명 없이 순수 JSON만 반환해야 합니다:

{{
  "exam_overview": {{
    "target_name": "{user_data.get('goal', '')}",
    "d_day_text": "D-{user_data.get('d_day', 'Day')}",
    "daily_hours_text": "{user_data.get('daily_hours', '2')}시간 / 일",
    "key_strategy": "이 시험의 핵심 전략 한 줄 요약",
    "exam_trends": "최신 출제 경향 및 참고 사항 요약"
  }},
  "daily_todos": [
    {{
      "id": 1,
      "task": "오늘 집중할 세부 학습 항목 1",
      "category": "개념학습",
      "estimated_minutes": 45,
      "completed": false
    }},
    {{
      "id": 2,
      "task": "오늘 집중할 세부 학습 항목 2",
      "category": "문제풀이",
      "estimated_minutes": 45,
      "completed": false
    }},
    {{
      "id": 3,
      "task": "오늘 집중할 세부 학습 항목 3",
      "category": "오답정리",
      "estimated_minutes": 30,
      "completed": false
    }}
  ],
  "weekly_curriculum": [
    {{
      "week_number": 1,
      "week_title": "기초 다지기 및 핵심 개념 완성",
      "focus_goal": "취약 영역 기초 개념 1회독",
      "milestones": [
        "핵심 용어 및 공식 암기 노트 작성",
        "단원별 기본 예제 30문항 풀이"
      ]
    }},
    {{
      "week_number": 2,
      "week_title": "기출문제 심화 분석 및 취약점 보완",
      "focus_goal": "최근 3개년 기출 풀이",
      "milestones": [
        "기출 오답노트 작성 및 반복",
        "실전 시간 배분 모의 연습"
      ]
    }},
    {{
      "week_number": 3,
      "week_title": "실전 감각 극대화 및 최종 점검",
      "focus_goal": "실전 모의고사 및 빈출 압축 정리",
      "milestones": [
        "빈출 핵심 키워드 총복습",
        "취약 유형 오답 3회 재풀이"
      ]
    }}
  ],
  "review_badges": [
    {{
      "interval_day": "1일차 (24시간 이내)",
      "review_topic": "오늘 배운 핵심 개념 10분 백지 인출",
      "technique": "백지 복습법"
    }},
    {{
      "interval_day": "3일차 (72시간 후)",
      "review_topic": "틀렸던 오답 문제 재풀이",
      "technique": "오답 플래시카드"
    }},
    {{
      "interval_day": "7일차 (주간 총복습)",
      "review_topic": "1주일간 학습한 핵심 요약본 정독",
      "technique": "누적 요약 점검"
    }}
  ],
  "quiz_accordion": [
    {{
      "id": 1,
      "question": "오늘 꼭 점검해야 할 핵심 확인 문항 1번",
      "answer": "정답 내용",
      "explanation": "왜 이것이 정답인지 핵심 해설",
      "tip": "실제 시험 대비 암기 팁"
    }},
    {{
      "id": 2,
      "question": "오늘 꼭 점검해야 할 핵심 확인 문항 2번",
      "answer": "정답 내용",
      "explanation": "왜 이것이 정답인지 핵심 해설",
      "tip": "실제 시험 대비 암기 팁"
    }}
  ],
  "reflection_guide": {{
    "guide_questions": [
      "오늘 계획한 학습 시간 중 실제로 몰입한 시간은 몇 분인가요?",
      "오늘 가장 잘 이해된 개념과 여전히 헷갈리는 개념은 무엇인가요?",
      "내일 더 나은 학습을 위해 개선할 한 가지 습관은 무엇인가요?"
    ]
  }}
}}
"""

    from google.genai import types
    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.7,
        )
    )

    response_text = response.text.strip()

    # 마크다운 코드블록 제거 처리 (혹시 들어있을 경우 대비)
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    elif response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    parsed_json = json.loads(response_text.strip())
    return parsed_json


@app.route("/")
def index():
    """메인 화면을 렌더링합니다."""
    is_authenticated = session.get("authenticated", False)
    return render_template("index.html", is_authenticated=is_authenticated)


@app.route("/verify-pin", methods=["POST"])
def verify_pin():
    """4자리 PIN 번호를 검증하고 세션을 생성합니다."""
    data = request.get_json() or {}
    entered_pin = str(data.get("pin", "")).strip()

    if entered_pin == PLANNER_PIN:
        session["authenticated"] = True
        return jsonify({"success": True, "message": "인증에 성공했습니다."})
    else:
        return jsonify({"success": False, "error": "비밀번호 4자리가 일치하지 않습니다."}), 401


@app.route("/logout", methods=["POST"])
def logout():
    """세션을 종료하여 화면을 다시 잠급니다."""
    session.pop("authenticated", None)
    return jsonify({"success": True, "message": "성공적으로 잠겼습니다."})


@app.route("/generate", methods=["POST"])
def generate():
    """사용자 입력을 받아 Gemini 3.5 Flash Lite와 Serper를 통해 학습 플랜을 생성합니다."""
    # 보안 잠금 검사
    if not session.get("authenticated", False):
        return jsonify({"success": False, "error": "보안 잠금 상태입니다. 4자리 비밀번호를 먼저 입력해 주세요."}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "요청 데이터(JSON)가 없습니다."}), 400

        goal = data.get("goal", "").strip()
        exam_date_str = data.get("exam_date", "").strip()
        level = data.get("level", "초급").strip()
        daily_hours = data.get("daily_hours", "2").strip()
        weak_area = data.get("weak_area", "기본기 부족").strip()
        learning_style = data.get("learning_style", "개념 정독 후 문제풀이").strip()

        # 유효성 검사
        if not goal:
            return jsonify({"success": False, "error": "학습 목표(시험명)를 입력해 주세요."}), 400
        if not exam_date_str:
            return jsonify({"success": False, "error": "시험일(또는 목표일)을 선택해 주세요."}), 400

        # D-day 계산
        d_day = calculate_d_day(exam_date_str)
        if d_day is None:
            return jsonify({"success": False, "error": "올바른 날짜 형식(YYYY-MM-DD)이 아닙니다."}), 400

        user_data = {
            "goal": goal,
            "exam_date": exam_date_str,
            "d_day": d_day,
            "level": level,
            "daily_hours": daily_hours,
            "weak_area": weak_area,
            "learning_style": learning_style
        }

        print(f"[INFO] New plan request received for '{goal}', Exam Date: {exam_date_str} (D-{d_day})")

        # 1. Serper 검색 수행 (필요 시 실시간 시험 동향 검색)
        search_query = f"{goal} 시험 일정 출제 경향 공부법"
        web_context = search_exam_info(search_query)

        # 2. Gemini 2.5 Flash Lite 모델 호출
        plan_result = call_gemini_planner(user_data, web_context)

        return jsonify({
            "success": True,
            "data": plan_result
        })

    except json.JSONDecodeError as jde:
        print(f"[ERROR] JSON Decode Error from AI output: {jde}")
        return jsonify({"success": False, "error": "AI 응답을 JSON 형식으로 해석하는 데 실패했습니다. 다시 시도해 주세요."}), 500
    except Exception as e:
        print(f"[ERROR] Unexpected error during plan generation: {e}")
        return jsonify({"success": False, "error": f"서버 오류가 발생했습니다: {str(e)}"}), 500


if __name__ == "__main__":
    print("[INFO] Starting AI Study Planner Flask Server on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True)
