@ECHO off
SETLOCAL
IF EXIST "%~dp0..\node.exe" (
  SET "_prog=%~dp0..\node.exe"
) ELSE (
  SET "_prog=node"
)
"%_prog%" "%~dp0..\node_modules\openclaw\openclaw.mjs" %*
