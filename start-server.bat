@echo off
rem start-server.bat - convenience batch to start API server from project root
rem Usage: double-click or run from command prompt in project root

pushd "%~dp0server"
if not exist node_modules (
  echo Installing server dependencies...
  npm.cmd install
)

echo Starting API server (this window will show server logs)...
npm.cmd run start

popd
