@echo off

start cmd /k "cd studymatch-api && php artisan serve"

start cmd /k "cd studymatch-web && npm run dev"

start cmd /k "cd studymatchadmin && npm run dev"

pause