from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/save-csv', methods=['POST'])
def save_csv():
    try:
        data = request.json
        csv_content = data.get('csvContent')
        
        # Create records directory if it doesn't exist
        records_dir = os.path.join(os.path.dirname(__file__), 'records')
        os.makedirs(records_dir, exist_ok=True)
        
        # Always save to the same file
        filepath = os.path.join(records_dir, 'parking_records.csv')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
