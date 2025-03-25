from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, IntegerField, SubmitField
from wtforms.validators import DataRequired, NumberRange
from datetime import datetime
import os
import uuid
import csv
from io import BytesIO, StringIO
import base64
from PIL import Image

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///parking.db'
app.config['UPLOAD_FOLDER'] = 'static/images'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
db = SQLAlchemy(app)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database Models
class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(10), unique=True)
    student_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    vehicle_number = db.Column(db.String(20), nullable=False)
    vehicle_type = db.Column(db.String(20), nullable=False)
    entry_time = db.Column(db.DateTime, default=datetime.now)
    exit_time = db.Column(db.DateTime)
    image_path = db.Column(db.String(200))

    def generate_token(self):
        if not self.token:
            self.token = f"UETM{self.id:06d}"

# Forms
class NewEntryForm(FlaskForm):
    student_name = StringField('Student Name', validators=[DataRequired()])
    department = SelectField('Department', choices=[
        ('CS', 'CS'),
        ('Software', 'Software'),
        ('Electrical', 'Electrical'),
        ('Mechanical', 'Mechanical'),
        ('Civil', 'Civil'),
        ('Natural Science', 'Natural Science'),
        ('Telecom', 'Telecom'),
        ('other', 'Other')
    ], validators=[DataRequired()])
    semester = IntegerField('Semester', validators=[DataRequired(), NumberRange(min=1, max=8)])
    vehicle_number = StringField('Vehicle Number', validators=[DataRequired()])
    vehicle_type = SelectField('Vehicle Type', choices=[
        ('Motorcycle', 'Motorcycle'),
        ('Car', 'Car')
    ], validators=[DataRequired()])
    submit = SubmitField('Submit')

class ExitVerificationForm(FlaskForm):
    search_query = StringField('Vehicle/Token Number', validators=[DataRequired()])
    submit = SubmitField('Search')

# Routes
@app.route('/')
def index():
    vehicles_inside = Entry.query.filter_by(exit_time=None).count()
    recent_entries = Entry.query.order_by(Entry.entry_time.desc()).limit(5).all()
    
    # Statistics
    stats = {
        'motorcycles': Entry.query.filter_by(vehicle_type='Motorcycle', exit_time=None).count(),
        'cars': Entry.query.filter_by(vehicle_type='Car', exit_time=None).count(),
        'by_department': {}
    }
    
    for dept in ['CS', 'Software', 'Electrical', 'Mechanical', 'Civil', 'Natural Science', 'Telecom']:
        stats['by_department'][dept] = Entry.query.filter_by(department=dept, exit_time=None).count()
    
    return render_template('index.html', 
                         vehicles_inside=vehicles_inside,
                         recent_entries=recent_entries,
                         stats=stats)

@app.route('/new_entry', methods=['GET', 'POST'])
def new_entry():
    form = NewEntryForm()
    if form.validate_on_submit():
        # Check for duplicate active entry
        existing_entry = Entry.query.filter_by(
            vehicle_number=form.vehicle_number.data,
            exit_time=None
        ).first()
        
        if existing_entry:
            flash("Vehicle already has an active entry", "danger")
            return render_template('new_entry.html', form=form)
        
        # Handle image upload
        image_data = request.form.get('image_data')
        if image_data:
            image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            filename = f"{uuid.uuid4()}.jpg"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
        else:
            filename = None
        
        entry = Entry(
            student_name=form.student_name.data,
            department=form.department.data,
            semester=form.semester.data,
            vehicle_number=form.vehicle_number.data,
            vehicle_type=form.vehicle_type.data,
            image_path=filename
        )
        
        db.session.add(entry)
        db.session.commit()
        entry.generate_token()
        db.session.commit()
        
        flash(f"Entry created successfully! Token: {entry.token}", "success")
        return redirect(url_for('index'))
    
    return render_template('new_entry.html', form=form)

@app.route('/exit_verification', methods=['GET', 'POST'])
def exit_verification():
    form = ExitVerificationForm()
    entry = None
    error = None
    
    if form.validate_on_submit():
        query = form.search_query.data
        entry = Entry.query.filter(
            (Entry.vehicle_number == query) | (Entry.token == query),
            Entry.exit_time == None
        ).first()
        
        if not entry:
            flash("No active entry found for this vehicle/token", "danger")
    
    return render_template('exit_verification.html', 
                         form=form,
                         entry=entry,
                         error=error)

@app.route('/confirm_exit/<int:entry_id>')
def confirm_exit(entry_id):
    entry = Entry.query.get_or_404(entry_id)
    entry.exit_time = datetime.now()
    db.session.commit()
    flash(f"Exit confirmed for token {entry.token}", "success")
    return redirect(url_for('exit_verification'))

@app.route('/backup')
def backup():
    # Create a StringIO object to store the CSV data
    si = StringIO()
    writer = csv.writer(si)
    
    # Write the header
    writer.writerow(['ID', 'Token', 'Student Name', 'Department', 'Semester', 
                    'Vehicle Number', 'Vehicle Type', 'Entry Time', 'Exit Time', 'Image Path'])
    
    # Write the data
    entries = Entry.query.all()
    for entry in entries:
        writer.writerow([
            entry.id,
            entry.token,
            entry.student_name,
            entry.department,
            entry.semester,
            entry.vehicle_number,
            entry.vehicle_type,
            entry.entry_time,
            entry.exit_time,
            entry.image_path
        ])
    
    # Get the string value and convert to bytes
    output = BytesIO(si.getvalue().encode('utf-8'))
    si.close()
    
    # Generate filename with timestamp
    filename = f'parking_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )

@app.route('/backup_html')
def backup_html():
    entries = Entry.query.all()
    image_data = {}
    
    # Read and encode the logo
    logo_path = os.path.join(app.static_folder, 'images', 'uet-logo.png')
    try:
        with open(logo_path, 'rb') as f:
            logo_bytes = f.read()
            logo_data = f"data:image/png;base64,{base64.b64encode(logo_bytes).decode('utf-8')}"
    except:
        logo_data = "" # Fallback if logo is not found
    
    # Process all images
    for entry in entries:
        if entry.image_path and os.path.exists(entry.image_path):
            try:
                with open(entry.image_path, 'rb') as f:
                    img_bytes = f.read()
                    image_data[entry.id] = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
            except:
                image_data[entry.id] = "" # Fallback if image cannot be read
    
    # Generate HTML report
    html = render_template('backup_report.html',
                         entries=entries,
                         image_data=image_data,
                         logo_data=logo_data,
                         generation_time=datetime.now())
    
    # Save as file and send
    output = BytesIO(html.encode('utf-8'))
    filename = f'parking_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html'
    
    return send_file(
        output,
        mimetype='text/html',
        as_attachment=True,
        download_name=filename
    )

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True) 