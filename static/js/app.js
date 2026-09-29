/**
 * AI Study Planner - 프론트엔드 비동기 통신 & 대시보드 인터랙션 스크립트
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM 요소 참조
  const plannerForm = document.getElementById("plannerForm");
  const inputSection = document.getElementById("inputSection");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const dashboardSection = document.getElementById("dashboardSection");
  const submitBtn = document.getElementById("submitBtn");

  // 대시보드 상단 요소
  const targetExamTitle = document.getElementById("targetExamTitle");
  const targetExamBadge = document.getElementById("targetExamBadge");
  const keyStrategyText = document.getElementById("keyStrategyText");
  const ddayCountBadge = document.getElementById("ddayCountBadge");
  const dailyHoursBadge = document.getElementById("dailyHoursBadge");
  const examTrendsText = document.getElementById("examTrendsText");
  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");

  // 리스트 컨테이너
  const todoList = document.getElementById("todoList");
  const reviewBadgesGrid = document.getElementById("reviewBadgesGrid");
  const quizAccordion = document.getElementById("quizAccordion");
  const weeklyCurriculumList = document.getElementById("weeklyCurriculumList");
  const reflectionQuestionsList = document.getElementById("reflectionQuestionsList");

  // 버튼들
  const copyPlanBtn = document.getElementById("copyPlanBtn");
  const exportMdBtn = document.getElementById("exportMdBtn");
  const resetPlanBtn = document.getElementById("resetPlanBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // 학습 회고 요소
  const emojiButtons = document.querySelectorAll(".btn-emoji");
  const reflectionMemo = document.getElementById("reflectionMemo");
  const saveReflectionBtn = document.getElementById("saveReflectionBtn");
  const reflectionSaveNotice = document.getElementById("reflectionSaveNotice");

  // 전역 상태 변수
  let currentPlanData = null;
  let selectedFocusEmoji = "😄";

  // 기본 날짜를 오늘로부터 30일 뒤로 자동 세팅 (사용자 편의성)
  const examDateInput = document.getElementById("examDate");
  if (examDateInput) {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    examDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 테마 토글 (라이트 🌿 / 다크 세이지 🌙)
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      themeToggleBtn.textContent = isDark ? "☀️ 편안한 라이트 모드" : "🌿 편안한 세이지 모드";
    });
  }

  // 1. 폼 제출 및 AI 생성 요청 이벤트
  plannerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const goal = document.getElementById("goal").value.trim();
    const examDate = document.getElementById("examDate").value.trim();
    const level = document.getElementById("level").value;
    const dailyHours = document.getElementById("dailyHours").value;
    const weakArea = document.getElementById("weakArea").value.trim();
    const learningStyle = document.getElementById("learningStyle").value;

    if (!goal) {
      alert("학습 목표 또는 시험명을 입력해 주세요.");
      return;
    }
    if (!examDate) {
      alert("시험일(목표일)을 선택해 주세요.");
      return;
    }

    // UI 로딩 상태 전환
    inputSection.classList.add("hidden");
    dashboardSection.classList.add("hidden");
    loadingOverlay.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const response = await fetch("/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          goal: goal,
          exam_date: examDate,
          level: level,
          daily_hours: dailyHours,
          weak_area: weakArea,
          learning_style: learningStyle
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "플랜 생성 중 서버 오류가 발생했습니다.");
      }

      currentPlanData = result.data;
      renderDashboard(currentPlanData);

      // 로딩 해제 및 대시보드 표시
      loadingOverlay.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error("[ERROR] Plan generation failed:", err);
      alert(`⚠️ 오류가 발생했습니다: ${err.message}\n\n입력값을 확인하신 후 다시 시도해 주세요.`);
      loadingOverlay.classList.add("hidden");
      inputSection.classList.remove("hidden");
    }
  });

  // 2. 대시보드 렌더링 종합 함수
  function renderDashboard(data) {
    const overview = data.exam_overview || {};

    // 상단 오버뷰 바
    targetExamTitle.textContent = overview.target_name || "맞춤 학습 플랜";
    targetExamBadge.textContent = "목표 달성 로드맵";
    keyStrategyText.textContent = `🎯 전략: ${overview.key_strategy || "기초 완성 및 기출 반복"}`;
    ddayCountBadge.textContent = overview.d_day_text || "D-Day";
    dailyHoursBadge.textContent = overview.daily_hours_text || "하루 2시간";
    examTrendsText.textContent = overview.exam_trends || "최신 경향에 맞춘 출제 빈출 위주 학습을 권장합니다.";

    // 컴포넌트별 렌더링
    renderTodos(data.daily_todos || []);
    renderReviewBadges(data.review_badges || []);
    renderQuizAccordion(data.quiz_accordion || []);
    renderWeeklyCurriculum(data.weekly_curriculum || []);
    renderReflectionGuide(data.reflection_guide || {});
  }

  // 3. 오늘의 To-do 리스트 렌더링 & 진도율 계산 로직
  function renderTodos(todos) {
    todoList.innerHTML = "";

    if (!todos || todos.length === 0) {
      todoList.innerHTML = '<li class="todo-item">생성된 할 일이 없습니다.</li>';
      updateProgress();
      return;
    }

    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "todo-item";
      li.dataset.id = todo.id;

      li.innerHTML = `
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" id="todo-${todo.id}">
          <label for="todo-${todo.id}" class="todo-text">${escapeHtml(todo.task)}</label>
        </div>
        <div class="todo-meta">
          <span class="badge-category">${escapeHtml(todo.category || "학습")}</span>
          <span class="todo-time">⏱️ ${todo.estimated_minutes || 30}분</span>
        </div>
      `;

      const checkbox = li.querySelector(".todo-checkbox");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          li.classList.add("completed");
        } else {
          li.classList.remove("completed");
        }
        updateProgress();
      });

      todoList.appendChild(li);
    });

    updateProgress();
  }

  // 실시간 진도율(%) 계산 및 프로그레스 바 갱신
  function updateProgress() {
    const allCheckboxes = todoList.querySelectorAll(".todo-checkbox");
    if (allCheckboxes.length === 0) {
      progressBar.style.width = "0%";
      progressPercent.textContent = "0%";
      return;
    }

    const checkedBoxes = todoList.querySelectorAll(".todo-checkbox:checked");
    const percent = Math.round((checkedBoxes.length / allCheckboxes.length) * 100);

    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}% 달성 (${checkedBoxes.length}/${allCheckboxes.length})`;
  }

  // 4. 에빙하우스 망각곡선 복습 뱃지 렌더링
  function renderReviewBadges(badges) {
    reviewBadgesGrid.innerHTML = "";

    if (!badges || badges.length === 0) {
      reviewBadgesGrid.innerHTML = '<p class="section-desc">복습 플랜이 없습니다.</p>';
      return;
    }

    badges.forEach((item) => {
      const card = document.createElement("div");
      card.className = "review-badge-card";
      card.innerHTML = `
        <span class="review-day-tag">${escapeHtml(item.interval_day)}</span>
        <div class="review-topic-text">${escapeHtml(item.review_topic)}</div>
        <div class="review-technique">📌 ${escapeHtml(item.technique)}</div>
      `;
      reviewBadgesGrid.appendChild(card);
    });
  }

  // 5. 핵심 점검 문항 아코디언 렌더링 & 토글 인터랙션
  function renderQuizAccordion(quizzes) {
    quizAccordion.innerHTML = "";

    if (!quizzes || quizzes.length === 0) {
      quizAccordion.innerHTML = '<p class="section-desc">생성된 확인 문항이 없습니다.</p>';
      return;
    }

    quizzes.forEach((quiz, index) => {
      const item = document.createElement("div");
      item.className = "accordion-item";

      item.innerHTML = `
        <button type="button" class="accordion-header">
          <span>Q${index + 1}. ${escapeHtml(quiz.question)}</span>
          <span class="accordion-icon">▼</span>
        </button>
        <div class="accordion-body">
          <div class="quiz-answer-row">💡 정답: ${escapeHtml(quiz.answer)}</div>
          <p class="quiz-explanation"><strong>해설:</strong> ${escapeHtml(quiz.explanation)}</p>
          ${quiz.tip ? `<div class="quiz-tip">✨ Tip: ${escapeHtml(quiz.tip)}</div>` : ""}
        </div>
      `;

      const header = item.querySelector(".accordion-header");
      header.addEventListener("click", () => {
        item.classList.toggle("active");
      });

      quizAccordion.appendChild(item);
    });
  }

  // 6. 주간 커리큘럼 타임라인 렌더링
  function renderWeeklyCurriculum(weeks) {
    weeklyCurriculumList.innerHTML = "";

    if (!weeks || weeks.length === 0) {
      weeklyCurriculumList.innerHTML = '<p class="section-desc">주간 일정이 없습니다.</p>';
      return;
    }

    weeks.forEach((w) => {
      const step = document.createElement("div");
      step.className = "timeline-step";

      const milestonesHtml = (w.milestones || [])
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("");

      step.innerHTML = `
        <div class="timeline-bullet"></div>
        <div class="timeline-card">
          <div class="timeline-week-title">Week ${w.week_number}: ${escapeHtml(w.week_title)}</div>
          <div class="timeline-goal">🚩 목표: ${escapeHtml(w.focus_goal)}</div>
          <ul class="timeline-milestones">
            ${milestonesHtml}
          </ul>
        </div>
      `;

      weeklyCurriculumList.appendChild(step);
    });
  }

  // 7. 학습 회고 가이드 렌더링 및 로컬 저장
  function renderReflectionGuide(guide) {
    reflectionQuestionsList.innerHTML = "";
    const questions = guide.guide_questions || [
      "오늘 계획한 학습 시간 중 실제로 몰입한 시간은 몇 분인가요?",
      "오늘 가장 잘 이해된 개념과 여전히 헷갈리는 개념은 무엇인가요?",
      "내일 더 나은 학습을 위해 개선할 한 가지 습관은 무엇인가요?"
    ];

    questions.forEach((q) => {
      const li = document.createElement("li");
      li.textContent = `• ${q}`;
      reflectionQuestionsList.appendChild(li);
    });

    // 로컬스토리지에서 이전 저장된 회고 불러오기
    const savedMemo = localStorage.getItem("studyPlanner_reflectionMemo");
    if (savedMemo) {
      reflectionMemo.value = savedMemo;
    }
  }

  // 이모지 집중도 선택 인터랙션
  emojiButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      emojiButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedFocusEmoji = btn.dataset.score;
    });
  });

  // 회고 저장 버튼
  saveReflectionBtn.addEventListener("click", () => {
    const text = reflectionMemo.value.trim();
    localStorage.setItem("studyPlanner_reflectionMemo", text);
    localStorage.setItem("studyPlanner_focusEmoji", selectedFocusEmoji);

    reflectionSaveNotice.textContent = `✅ ${selectedFocusEmoji} 회고가 안전하게 저장되었습니다!`;
    setTimeout(() => {
      reflectionSaveNotice.textContent = "";
    }, 3000);
  });

  // 8. 플랜 전체 텍스트 클립보드 복사
  copyPlanBtn.addEventListener("click", async () => {
    if (!currentPlanData) return;

    const mdContent = buildMarkdown(currentPlanData);
    try {
      await navigator.clipboard.writeText(mdContent);
      alert("📋 맞춤 학습 플랜 전체 내용이 클립보드에 복사되었습니다!\n노션이나 메모장에 바로 붙여넣어 보세요.");
    } catch (err) {
      console.error("[ERROR] Clipboard write failed:", err);
      alert("클립보드 복사에 실패했습니다. 권한 설정을 확인해 주세요.");
    }
  });

  // 9. Markdown 내보내기 다운로드
  exportMdBtn.addEventListener("click", () => {
    if (!currentPlanData) return;

    const mdContent = buildMarkdown(currentPlanData);
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const examName = currentPlanData.exam_overview?.target_name || "학습플랜";
    a.href = url;
    a.download = `AI_학습플랜_${examName.replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // 10. 새로운 플랜 작성 (초기화)
  resetPlanBtn.addEventListener("click", () => {
    if (confirm("새로운 학습 목표를 입력하시겠습니까? 현재 화면의 내용은 초기화됩니다.")) {
      dashboardSection.classList.add("hidden");
      inputSection.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // 마크다운 생성 헬퍼 함수
  function buildMarkdown(data) {
    const overview = data.exam_overview || {};
    const todos = data.daily_todos || [];
    const weeks = data.weekly_curriculum || [];
    const reviews = data.review_badges || [];
    const quizzes = data.quiz_accordion || [];

    let md = `# 🎯 ${overview.target_name || "AI 맞춤형 학습 플랜"}\n\n`;
    md += `- **남은 일정:** ${overview.d_day_text || "D-Day"} (${overview.daily_hours_text || "하루 2시간"})\n`;
    md += `- **핵심 전략:** ${overview.key_strategy || "기초 다지기 및 기출 풀이"}\n`;
    md += `- **최신 경향:** ${overview.exam_trends || "기출 분석 기반 대비"}\n\n`;
    md += `---\n\n`;

    md += `## ✅ 오늘의 집중 To-do 리스트\n`;
    todos.forEach((t) => {
      md += `- [ ] [${t.category}] ${t.task} (${t.estimated_minutes}분)\n`;
    });
    md += `\n---\n\n`;

    md += `## 🧠 망각곡선 기반 복습 주기 (장기 기억 전략)\n`;
    reviews.forEach((r) => {
      md += `- **${r.interval_day}**: ${r.review_topic} *(방법: ${r.technique})*\n`;
    });
    md += `\n---\n\n`;

    md += `## 🗓️ 주간 커리큘럼 로드맵\n`;
    weeks.forEach((w) => {
      md += `### Week ${w.week_number}: ${w.week_title}\n`;
      md += `- **목표:** ${w.focus_goal}\n`;
      (w.milestones || []).forEach((m) => {
        md += `  - ${m}\n`;
      });
      md += `\n`;
    });
    md += `---\n\n`;

    md += `## ❓ 오늘의 핵심 점검 문항\n`;
    quizzes.forEach((q, idx) => {
      md += `### Q${idx + 1}. ${q.question}\n`;
      md += `- **정답:** ${q.answer}\n`;
      md += `- **해설:** ${q.explanation}\n`;
      if (q.tip) md += `- **Tip:** ${q.tip}\n`;
      md += `\n`;
    });

    return md;
  }

  // HTML XSS 방지 이스케이프 함수
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
