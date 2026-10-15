@echo off
title Searchii - TinyFish Job Aggregator
echo Starting Searchii local server...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
