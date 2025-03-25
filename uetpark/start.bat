@echo off
echo Starting UET Parking Management System...

REM Create required directories if they don't exist
if not exist "static" mkdir static
if not exist "static\images" mkdir static\images
if not exist "static\css" mkdir static\css

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Install required packages
pip install flask flask-sqlalchemy flask-wtf pillow

REM Start the Flask application
start "UET Parking Server" python app.py

REM Wait for the server to start
timeout /t 3

REM Open the browser
start http://localhost:5000

echo Application started! Please check your browser. 