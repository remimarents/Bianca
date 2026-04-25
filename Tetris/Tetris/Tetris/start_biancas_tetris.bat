@echo off
setlocal

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=py"
) else (
    set "PYTHON_CMD=python"
)

%PYTHON_CMD% -m pip show pygame >nul 2>nul
if errorlevel 1 (
    echo Installerer pygame...
    %PYTHON_CMD% -m pip install -r "%~dp0requirements.txt"
)

echo Starter Biancas Tetris...
%PYTHON_CMD% "%~dp0tetris_bianca.py"
