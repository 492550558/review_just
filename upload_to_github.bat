@echo off
echo Starting GitHub upload process...

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/download/win
    pause
    exit /b
)

:: Initialize git if not already initialized
if not exist .git (
    echo Initializing git repository...
    git init
) else (
    echo Git repository already initialized.
)

:: Add all files
echo Adding files...
git add .

:: Commit
echo Committing files...
git commit -m "Initial commit of WeChat Review App"

:: Prompt for repository URL
set /p repo_url="Please paste your GitHub repository URL (e.g., https://github.com/username/repo.git): "

:: Add remote and push
echo Adding remote origin...
git remote remove origin 2>nul
git remote add origin %repo_url%

echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo Done!
pause