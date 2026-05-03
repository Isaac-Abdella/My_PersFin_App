@echo off
cd /d "%~dp0python-ml"
py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload