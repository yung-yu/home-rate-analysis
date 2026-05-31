let rawData = [];
let chartInstance = null;

const typeNames = {
    'transaction': '買賣',
    'auction': '拍賣',
    'inheritance': '繼承',
    'gift': '贈與'
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('./data.json');
        rawData = await response.json();
        
        rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

        const now = new Date();
        document.getElementById('updateTime').textContent = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        initFilters();
        renderChart();
        setupEventListeners();

    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('summaryText').textContent = '資料加載失敗，請確認 data.json 是否存在。';
    }
});

function initFilters() {
    const years = [...new Set(rawData.map(d => d.date.substring(0, 4)))];
    
    const startSelect = document.getElementById('startYear');
    const endSelect = document.getElementById('endYear');
    
    years.forEach(year => {
        const optStart = document.createElement('option');
        optStart.value = year;
        optStart.textContent = year;
        startSelect.appendChild(optStart);
        
        const optEnd = document.createElement('option');
        optEnd.value = year;
        optEnd.textContent = year;
        endSelect.appendChild(optEnd);
    });

    startSelect.value = years[0];
    endSelect.value = years[years.length - 1];
}

function setupEventListeners() {
    document.getElementById('startYear').addEventListener('change', updateView);
    document.getElementById('endYear').addEventListener('change', updateView);
    document.getElementById('dataType').addEventListener('change', updateView);
    document.getElementById('trendToggle').addEventListener('change', updateView);
}

function updateView() {
    renderChart();
}

function calculateSMA(data, windowSize = 6) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            sma.push(null); 
        } else {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                sum += data[i - j];
            }
            sma.push(Math.round(sum / windowSize));
        }
    }
    return sma;
}

function renderChart() {
    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;
    const dataType = document.getElementById('dataType').value;
    const showTrend = document.getElementById('trendToggle').checked;

    const filteredData = rawData.filter(d => {
        const year = d.date.substring(0, 4);
        return year >= startYear && year <= endYear;
    });

    if (filteredData.length === 0) {
        document.getElementById('summaryText').textContent = '該區間無資料，請重新選擇。';
        if (chartInstance) chartInstance.destroy();
        return;
    }

    const labels = filteredData.map(d => d.date);
    const dataValues = filteredData.map(d => d[dataType]);
    const currentTypeName = typeNames[dataType];
    
    const datasets = [{
        label: `${currentTypeName}移轉棟數`,
        data: dataValues,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
    }];

    if (showTrend) {
        const smaData = calculateSMA(dataValues, 6);
        datasets.push({
            label: '趨勢預測 (6個月移動平均)',
            data: smaData,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false
        });
    }

    updateSummary(dataValues, showTrend, currentTypeName);

    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(51, 65, 85, 0.9)',
                    titleFont: { family: 'Inter', size: 14 },
                    bodyFont: { family: 'Inter', size: 13 },
                    padding: 12,
                    cornerRadius: 8
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Inter', size: 14 },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 12,
                        font: { family: 'Inter' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#E2E8F0',
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: 'Inter' }
                    }
                }
            }
        }
    });
}

function updateSummary(dataValues, showTrend, typeName) {
    if (dataValues.length < 2) {
        document.getElementById('summaryText').textContent = '資料點不足，無法分析。';
        return;
    }

    const firstVal = dataValues[0];
    const lastVal = dataValues[dataValues.length - 1];
    
    let baseText = '';
    
    if (firstVal === 0 && lastVal === 0) {
         baseText = `在選定區間內，建物「${typeName}」棟數皆為 0。`;
    } else {
        const diff = lastVal - firstVal;
        const percent = firstVal > 0 ? ((diff / firstVal) * 100).toFixed(1) : 100;
        baseText = `在選定區間內，建物「${typeName}」棟數從 ${firstVal} 棟變動至 ${lastVal} 棟（${diff >= 0 ? '成長' : '衰退'} ${Math.abs(percent)}%）。`;
    }
    
    if (showTrend) {
        const sma = calculateSMA(dataValues, 6);
        const lastSma = sma[sma.length - 1];
        const prevSma = sma[sma.length - 2];
        
        if (lastSma !== null && prevSma !== null) {
            if (lastSma > prevSma) {
                baseText += ' 結合移動平均線來看，近期「上升」跡象明顯。';
            } else if (lastSma < prevSma) {
                baseText += ' 結合移動平均線來看，近期呈現「冷卻」跡象。';
            } else {
                baseText += ' 結合移動平均線來看，近期保持「平穩」。';
            }
        } else {
            baseText += ' (需更多資料以提供趨勢預測)';
        }
    }
    
    document.getElementById('summaryText').textContent = baseText;
}
