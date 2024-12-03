function updateCountdown() {
    const targetDate = new Date('2024-12-14T00:00:00');
    const now = new Date();
    const diff = targetDate - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    document.getElementById('countdown').innerText =
        `距离六级考试还有 ${days}天 ${hours}小时`;
}

updateCountdown();
setInterval(updateCountdown, 1000 * 60 * 60);

function groupRecordsByDate(records) {
    const groups = {};
    records.forEach(record => {
        const date = new Date(record.completionTime).toLocaleDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(record);
    });
    return groups;
}

function loadRecords() {
    const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]');
    const recordsList = document.getElementById('recordsList');
    recordsList.innerHTML = '';

    const groupedRecords = groupRecordsByDate(records);

    Object.entries(groupedRecords)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .forEach(([date, dateRecords]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = date;
            dateGroup.appendChild(dateHeader);

            const dateRecordsDiv = document.createElement('div');
            dateRecordsDiv.className = 'date-records';

            dateRecords.forEach((record, index) => {
                const recordDiv = document.createElement('div');
                recordDiv.className = 'record-item';
                const time = new Date(record.completionTime).toLocaleTimeString();
                recordDiv.innerHTML = `
                            <p><strong>时间：</strong>${time}</p>
                            <p><strong>内容：</strong>${record.content}</p>
                            <div class="record-image-container">
                                <img src="${record.imageData}" class="record-image" alt="打卡图片">
                            </div>
                            <button onclick="deleteRecord('${record.timestamp}')" class="delete-btn">删除</button>
                        `;
                dateRecordsDiv.appendChild(recordDiv);
            });

            dateGroup.appendChild(dateRecordsDiv);
            recordsList.appendChild(dateGroup);
        });
}

function deleteRecord(timestamp) {
    if (confirm('确定要删除这条记录吗？')) {
        const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]');
        const index = records.findIndex(record => record.timestamp.toString() === timestamp.toString());
        if (index !== -1) {
            records.splice(index, 1);
            localStorage.setItem('checkInRecords', JSON.stringify(records));
            loadRecords();
        }
    }
}

document.getElementById('image').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('preview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('checkInForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const content = document.getElementById('content').value;
    const imageFile = document.getElementById('image').files[0];
    const currentTime = new Date().toISOString();

    try {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageData = e.target.result;

            const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]');

            records.unshift({
                content,
                completionTime: currentTime,
                imageData,
                timestamp: new Date().getTime()
            });

            localStorage.setItem('checkInRecords', JSON.stringify(records));

            loadRecords();

            document.getElementById('checkInForm').reset();
            document.getElementById('preview').src = '';

            alert('打卡成功！');
        };
        reader.readAsDataURL(imageFile);

    } catch (error) {
        console.error('Error:', error);
        alert('打卡失败，请重试');
    }
});

function exportData() {
    const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]');
    if (records.length === 0) {
        alert('没有可导出的数据！');
        return;
    }

    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        records: records
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `打卡记录_${new Date().toLocaleDateString()}.json`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importedData = JSON.parse(text);

        if (!importedData.records || !Array.isArray(importedData.records)) {
            throw new Error('无效的数据格式');
        }

        const existingRecords = JSON.parse(localStorage.getItem('checkInRecords') || '[]');
        const confirmMessage = existingRecords.length > 0 ?
            '是否将导入的数据与现有数据合并？\n点击"确定"合并数据，点击"取消"替换现有数据。' :
            '确认导入数据？';

        if (confirm(confirmMessage)) {
            if (existingRecords.length > 0) {
                const mergedRecords = [...existingRecords];

                importedData.records.forEach(importedRecord => {
                    const exists = mergedRecords.some(
                        record => record.timestamp === importedRecord.timestamp
                    );
                    if (!exists) {
                        mergedRecords.push(importedRecord);
                    }
                });

                mergedRecords.sort((a, b) => b.timestamp - a.timestamp);

                localStorage.setItem('checkInRecords', JSON.stringify(mergedRecords));
            } else {
                localStorage.setItem('checkInRecords', JSON.stringify(importedData.records));
            }
        } else if (existingRecords.length > 0) {
            localStorage.setItem('checkInRecords', JSON.stringify(importedData.records));
        }

        loadRecords();
        alert('数据导入成功！');

    } catch (error) {
        console.error('导入错误:', error);
        alert('导入失败：' + error.message);
    }

    event.target.value = '';
}

loadRecords();