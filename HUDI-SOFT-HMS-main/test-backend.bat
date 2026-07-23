@echo off
echo Testing backend login...
curl -s -X POST https://hudi-soft-com-1.onrender.com/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@hospital.com\",\"password\":\"admin123\"}"
echo.
echo.
echo Testing backend health/uptime...
curl -s https://hudi-soft-com-1.onrender.com/api/health
echo.
