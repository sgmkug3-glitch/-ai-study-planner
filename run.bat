@echo off
chcp 65001 > nul
title AI 맞춤형 학습 플래너 (AI Study Planner)
cd /d "C:\AI-study\ai-study-planner"

echo ====================================================
echo 🎯 AI 맞춤형 학습 플래너를 실행하는 중입니다...
echo ====================================================

:: 가상환경 활성화
call venv\Scripts\activate.bat

:: 브라우저 자동 실행 (2초 후)
start "" http://127.0.0.1:5000

:: Flask 서버 실행
py app.py

pause
