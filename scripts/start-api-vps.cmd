@echo off
cd /d "%~dp0..\backend"
title Nova Garoa API
echo API da loja em http://127.0.0.1:3333
call npx tsx src/index.ts
pause
