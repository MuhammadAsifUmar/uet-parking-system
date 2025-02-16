let stream;
let imageCapture;
let currentTokenNumber = 1;

// Initialize camera
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        video.play();
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Error accessing camera. Please make sure you have granted camera permissions.');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    loadLastTokenNumber();
    setupEventListeners();
    updateNextTokenDisplay();
    updateInsideVehiclesList();
});

function setupEventListeners() {
    // Navigation buttons
    document.getElementById('newEntryBtn')?.addEventListener('click', () => showSection('entryFormSection'));
    document.getElementById('searchBtn')?.addEventListener('click', () => showSection('searchSection'));
    document.getElementById('exitBtn')?.addEventListener('click', () => showSection('exitSection'));
    document.getElementById('backupBtn')?.addEventListener('click', downloadBackupAsHTML);

    // Exit verification form
    document.getElementById('exitForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyExit();
    });

    // Exit photo capture
    document.getElementById('captureExitPhotoBtn')?.addEventListener('click', () => {
        startExitCamera();
    });

    document.getElementById('confirmExitButton')?.addEventListener('click', confirmExit);

    // Main navigation buttons
    document.getElementById('newEntryBtn')?.addEventListener('click', () => {
        showSection('entryFormSection');
        document.getElementById('parkingForm')?.reset();
    });
    
    document.getElementById('searchBtn')?.addEventListener('click', () => showSection('searchSection'));
    
    document.getElementById('generateTokenBtn')?.addEventListener('click', () => {
        showSection('tokenGenSection');
        document.getElementById('tokenGenerationForm')?.reset();
        updateNextTokenDisplay();
        document.getElementById('generatedTokenInfo')?.classList.add('d-none');
    });
    
    document.getElementById('exitVerificationBtn')?.addEventListener('click', () => {
        showSection('exitVerificationSection');
        document.getElementById('exitVerificationForm')?.reset();
    });
    
    // Photo capture
    document.getElementById('captureBtn')?.addEventListener('click', () => {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
    });

    // Generate token button
    document.getElementById('generateTokenButton')?.addEventListener('click', () => {
        const form = document.getElementById('tokenGenerationForm');
        if (form.checkValidity()) {
            generateNewToken();
        } else {
            form.reportValidity();
        }
    });

    // Form submissions
    document.getElementById('parkingForm')?.addEventListener('submit', handleNewEntry);
    document.getElementById('exitVerificationForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyExit();
    });

    // Confirm exit
    document.getElementById('confirmExitButton')?.addEventListener('click', confirmExit);

    // Search functionality
    document.getElementById('performSearch')?.addEventListener('click', performSearch);

    // Print token
    document.getElementById('printToken')?.addEventListener('click', printGeneratedToken);

    // Backup download
    document.getElementById('downloadBackup')?.addEventListener('click', downloadBackupAsHTML);

    // Exit verification
    document.getElementById('verifyExitButton')?.addEventListener('click', () => {
        const form = document.getElementById('exitVerificationForm');
        if (form.checkValidity()) {
            verifyExit();
        } else {
            form.reportValidity();
        }
    });

    document.getElementById('captureExitPhotoBtn')?.addEventListener('click', captureExitPhoto);
    
    // Auto-save to CSV when records change
    window.addEventListener('storage', (e) => {
        if (e.key === 'parkingRecords') {
            saveToCSV();
        }
    });
}

function showSection(sectionId) {
    // Hide all sections
    const sections = ['entryFormSection', 'searchSection', 'exitSection', 'tokenGenSection'];
    sections.forEach(section => {
        const el = document.getElementById(section);
        if (el) el.classList.add('d-none');
    });

    // Show requested section
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.classList.remove('d-none');
        if (sectionId === 'exitSection') {
            startExitCamera();
        }
    }
}

function startExitCamera() {
    const video = document.getElementById('exitCamera');
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            document.getElementById('captureExitPhotoBtn').disabled = false;
        })
        .catch(err => {
            console.error("Error accessing camera:", err);
            alert("Could not access camera for exit verification");
        });
}

function formatTokenNumber(num) {
    return `UETG${String(num).padStart(5, '0')}`;
}

function loadLastTokenNumber() {
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    if (parkingRecords.length > 0) {
        const lastToken = parkingRecords[parkingRecords.length - 1].tokenNumber;
        if (lastToken) {
            const lastNumber = parseInt(lastToken.replace('UETG', ''));
            if (!isNaN(lastNumber)) {
                currentTokenNumber = Math.min(lastNumber + 1, 10000);
            }
        }
    } else {
        currentTokenNumber = 1;
    }
    updateNextTokenDisplay();
}

function updateNextTokenDisplay() {
    const nextTokenElement = document.getElementById('nextToken');
    if (nextTokenElement) {
        nextTokenElement.textContent = formatTokenNumber(currentTokenNumber);
    }
}

function handleNewEntry(e) {
    e.preventDefault();
    
    const entryTime = new Date().toLocaleString();
    const tokenNumber = formatTokenNumber(currentTokenNumber);
    
    const record = {
        tokenNumber: tokenNumber,
        studentName: document.getElementById('studentName').value,
        department: document.getElementById('department').value,
        semester: document.getElementById('semester').value,
        vehicleNumber: document.getElementById('vehicleNumber').value,
        vehicleType: document.getElementById('vehicleType').value,
        entryTime: entryTime,
        photo: document.getElementById('canvas').toDataURL('image/jpeg'),
        status: 'Inside'
    };

    // Save to localStorage
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    parkingRecords.push(record);
    localStorage.setItem('parkingRecords', JSON.stringify(parkingRecords));
    
    // Update token counter
    currentTokenNumber++;
    localStorage.setItem('currentTokenNumber', currentTokenNumber);
    
    // Save to CSV
    saveToCSV(parkingRecords);
    
    // Update display
    displayTokenInfo(record);
    updateInsideVehiclesList();
}

function updateInsideVehiclesList() {
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    const insideVehicles = parkingRecords.filter(record => record.status === 'Inside');
    
    const tbody = document.getElementById('insideVehiclesList');
    const counter = document.getElementById('insideCount');
    
    if (tbody && counter) {
        tbody.innerHTML = '';
        counter.textContent = `${insideVehicles.length} Vehicle${insideVehicles.length !== 1 ? 's' : ''}`;
        
        insideVehicles.forEach(vehicle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${vehicle.tokenNumber}</td>
                <td>${vehicle.studentName}</td>
                <td>${vehicle.vehicleNumber}</td>
                <td>${vehicle.department}</td>
                <td>${vehicle.entryTime}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="quickExit('${vehicle.tokenNumber}')">
                        Mark Exit
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

function quickExit(tokenNumber) {
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    const recordIndex = parkingRecords.findIndex(r => r.tokenNumber === tokenNumber);
    
    if (recordIndex !== -1) {
        parkingRecords[recordIndex] = {
            ...parkingRecords[recordIndex],
            exitTime: new Date().toLocaleString(),
            status: 'Outside'
        };
        
        localStorage.setItem('parkingRecords', JSON.stringify(parkingRecords));
        saveToCSV(parkingRecords);
        updateInsideVehiclesList();
    }
}

function saveToCSV(records) {
    const csvContent = generateCSVContent(records);
    fetch('/save-csv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent })
    });
}

function generateCSVContent(records) {
    let csvContent = "Token Number,Student Name,Department,Semester,Vehicle Number,Vehicle Type,Entry Time,Exit Time,Status\n";
    
    records.forEach(record => {
        const row = [
            record.tokenNumber,
            record.studentName,
            record.department,
            record.semester,
            record.vehicleNumber,
            record.vehicleType,
            record.entryTime || '',
            record.exitTime || '',
            record.status
        ].map(field => `"${String(field).replace(/"/g, '""')}"`)
         .join(',');
        csvContent += row + "\n";
    });
    
    return csvContent;
}

function displayTokenInfo(record) {
    document.getElementById('tokenInfo').classList.remove('d-none');
    document.getElementById('tokenNumber').textContent = record.tokenNumber;
    document.getElementById('entryTime').textContent = record.entryTime;
    
    const studentPhoto = document.getElementById('studentPhoto');
    studentPhoto.innerHTML = `<img src="${record.photo}" alt="Student Photo" class="img-fluid">`;
}

function generateNewToken() {
    if (currentTokenNumber > 10000) {
        alert('Maximum token limit (10000) reached!');
        return;
    }

    // Get form values
    const studentName = document.getElementById('tokenStudentName').value;
    const department = document.getElementById('tokenDepartment').value;
    const semester = document.getElementById('tokenSemester').value;
    const vehicleNumber = document.getElementById('tokenVehicleNumber').value;
    const vehicleType = document.getElementById('tokenVehicleType').value;

    if (!studentName || !department || !semester || !vehicleNumber || !vehicleType) {
        alert('Please fill in all required fields');
        return;
    }
    
    const tokenInfo = {
        tokenNumber: formatTokenNumber(currentTokenNumber),
        studentName: studentName,
        department: department,
        semester: semester,
        vehicleNumber: vehicleNumber,
        vehicleType: vehicleType,
        generatedTime: new Date().toLocaleString(),
        status: 'Inside'
    };

    // Store token
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    parkingRecords.push(tokenInfo);
    localStorage.setItem('parkingRecords', JSON.stringify(parkingRecords));

    // Display generated token information
    displayGeneratedToken(tokenInfo);

    // Increment token number and update display
    currentTokenNumber = Math.min(currentTokenNumber + 1, 10000);
    updateNextTokenDisplay();
}

function displayGeneratedToken(tokenInfo) {
    const generatedTokenInfo = document.getElementById('generatedTokenInfo');
    if (!generatedTokenInfo) return;

    // Update all token information fields
    document.getElementById('generatedTokenNumber').textContent = tokenInfo.tokenNumber;
    document.getElementById('generatedStudentName').textContent = tokenInfo.studentName;
    document.getElementById('generatedDepartment').textContent = tokenInfo.department;
    document.getElementById('generatedSemester').textContent = tokenInfo.semester;
    document.getElementById('generatedVehicleNumber').textContent = tokenInfo.vehicleNumber;
    document.getElementById('generatedVehicleType').textContent = tokenInfo.vehicleType;
    document.getElementById('generatedTime').textContent = tokenInfo.generatedTime;

    // Show the token information
    generatedTokenInfo.classList.remove('d-none');
}

function verifyExit() {
    const tokenNumber = document.getElementById('exitTokenNumber').value.trim().toUpperCase();
    
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    const record = parkingRecords.find(r => 
        r.tokenNumber === tokenNumber && 
        r.status === 'Inside'
    );

    if (!record) {
        alert('No matching active record found or vehicle has already exited. Please check token number.');
        return;
    }

    displayExitVerification(record);
}

function displayExitVerification(record) {
    const resultDiv = document.getElementById('exitVerificationResult');
    if (!resultDiv) return;

    resultDiv.classList.remove('d-none');
    
    // Update verification details
    document.getElementById('verifiedTokenNumber').textContent = record.tokenNumber;
    document.getElementById('verifiedStudentName').textContent = record.studentName;
    document.getElementById('verifiedDepartment').textContent = record.department;
    document.getElementById('verifiedVehicleNumber').textContent = record.vehicleNumber;
    document.getElementById('verifiedVehicleType').textContent = record.vehicleType;
    document.getElementById('verifiedEntryTime').textContent = record.generatedTime;
    document.getElementById('verifiedStatus').textContent = record.status;
    
    // Display student photo
    const photoDiv = document.getElementById('verifiedPhoto');
    if (photoDiv && record.photo) {
        photoDiv.innerHTML = `<img src="${record.photo}" alt="Student Photo" class="img-thumbnail" style="max-width: 200px">`;
    } else if (photoDiv) {
        photoDiv.innerHTML = '<p class="text-muted">No photo available</p>';
    }
}

function confirmExit() {
    const tokenNumber = document.getElementById('exitTokenNumber').value.trim().toUpperCase();
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    
    const recordIndex = parkingRecords.findIndex(r => r.tokenNumber === tokenNumber);
    if (recordIndex === -1) return;

    // Update record with exit time and status
    parkingRecords[recordIndex] = {
        ...parkingRecords[recordIndex],
        exitTime: new Date().toLocaleString(),
        status: 'Outside'
    };

    // Save updated records
    localStorage.setItem('parkingRecords', JSON.stringify(parkingRecords));
    
    // Quietly save to single CSV file
    const csvContent = generateCSVContent(parkingRecords);
    fetch('/save-csv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent })
    });
    
    // Reset form and hide result without showing alert
    document.getElementById('exitForm').reset();
    document.getElementById('exitVerificationResult').classList.add('d-none');
}

function captureExitPhoto() {
    const video = document.getElementById('exitVerificationCamera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const exitPhoto = canvas.toDataURL('image/jpeg');
    document.getElementById('exitPhotoPreview').src = exitPhoto;
    document.getElementById('exitPhotoPreview').classList.remove('d-none');
    document.getElementById('confirmExitButton').disabled = false;
    
    // Stop camera stream
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
}

function downloadBackupAsHTML() {
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>UET Mardan Parking Records - ${new Date().toLocaleDateString()}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; }
                .record-card { 
                    margin-bottom: 20px; 
                    border: 1px solid #ddd; 
                    padding: 15px; 
                    border-radius: 8px;
                }
                .record-card.Outside { background-color: #f8f9fa; }
                .record-card.Inside { background-color: #e7f5e7; }
                .student-photo { max-width: 150px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="text-center mb-4">UET Mardan Parking Records</h1>
                <div class="text-center mb-4">
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Total Records: ${parkingRecords.length}</p>
                    <p>Currently Inside: ${parkingRecords.filter(r => r.status === 'Inside').length}</p>
                </div>
                <div class="records">
    `;

    parkingRecords.forEach(record => {
        html += `
            <div class="record-card ${record.status}">
                <div class="row">
                    <div class="col-md-8">
                        <h4>Token: ${record.tokenNumber}</h4>
                        <p><strong>Status:</strong> <span class="badge ${record.status === 'Inside' ? 'bg-success' : 'bg-secondary'}">${record.status}</span></p>
                        <p><strong>Student:</strong> ${record.studentName}</p>
                        <p><strong>Department:</strong> ${record.department}</p>
                        <p><strong>Semester:</strong> ${record.semester}</p>
                        <p><strong>Vehicle:</strong> ${record.vehicleNumber} (${record.vehicleType})</p>
                        <p><strong>Entry Time:</strong> ${record.entryTime}</p>
                        ${record.exitTime ? `<p><strong>Exit Time:</strong> ${record.exitTime}</p>` : ''}
                    </div>
                    <div class="col-md-4 text-center">
                        ${record.photo ? 
                            `<img src="${record.photo}" alt="Student Photo" class="student-photo img-thumbnail">` : 
                            '<p class="text-muted">No photo available</p>'}
                    </div>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parking_records_backup_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function printGeneratedToken() {
    const tokenInfo = document.getElementById('generatedTokenInfo').cloneNode(true);
    tokenInfo.classList.remove('d-none');
    
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Parking Token - UET Mardan</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 20px; }
                    .token-card {
                        border: 2px solid #000;
                        padding: 20px;
                        margin: 20px;
                        border-radius: 10px;
                    }
                    .university-name {
                        font-size: 24px;
                        font-weight: bold;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .qr-code {
                        text-align: center;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="token-card">
                    <div class="university-name">UET Mardan - Parking Token</div>
                    ${tokenInfo.innerHTML}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
        </html>
    `);
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toUpperCase();
    const parkingRecords = JSON.parse(localStorage.getItem('parkingRecords') || '[]');
    
    const results = parkingRecords.filter(record => 
        (record.tokenNumber && record.tokenNumber.includes(searchTerm)) ||
        (record.vehicleNumber && record.vehicleNumber.toUpperCase().includes(searchTerm))
    );

    displaySearchResults(results);
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert alert-warning">No records found</div>';
        return;
    }

    let html = '<div class="list-group">';
    results.forEach(record => {
        html += `
            <div class="list-group-item">
                <h5 class="mb-1">Token Number: ${record.tokenNumber}</h5>
                ${record.studentName ? `<p class="mb-1">Student: ${record.studentName}</p>` : ''}
                ${record.vehicleNumber ? `<p class="mb-1">Vehicle: ${record.vehicleNumber}</p>` : ''}
                <p class="mb-1">Time: ${record.entryTime || record.generatedTime}</p>
                ${record.photo ? 
                    `<img src="${record.photo}" alt="Student Photo" class="img-thumbnail mt-2" style="max-width: 200px">` : 
                    ''}
            </div>
        `;
    });
    html += '</div>';
    resultsContainer.innerHTML = html;
}

// Clean up resources when leaving the page
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});
