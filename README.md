# UET Mardan Parking Security System

A web-based parking management system for UET Mardan campus that helps track and control vehicle access.

## Features

- Entry Management with photo capture
- Unique token generation (UETG#### format)
- Exit verification
- Real-time inside vehicles tracking
- Comprehensive record keeping
- HTML and CSV backup generation

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Backend: Python Flask
- Storage: Browser localStorage + CSV
- UI Framework: Bootstrap 5.3.0

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/your-username/uet-parking-system.git
cd uet-parking-system
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

1. Entry Process:
   - Click "New Entry"
   - Fill student and vehicle details
   - Capture photo
   - System generates unique token

2. Exit Process:
   - Click "Exit Verification"
   - Enter token number
   - System verifies and updates status

3. Search Records:
   - Click "Search Records"
   - View currently inside vehicles
   - Search by token or vehicle number

4. Backup:
   - Click "Backup" to download HTML and CSV backups

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
