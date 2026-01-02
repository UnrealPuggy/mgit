@echo off
if not exist sandbox (
    mkdir sandbox
)
if exist sandbox\.mgit (
    @REM rmdir /s /q sandbox\.mgit
)
cd sandbox
deno run -WR ../src/main.ts %*
cd ..