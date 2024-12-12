let currentNodes;
let currentLinks;
let currentEventSource = null;
let zoom;
let width;
let height;

document.addEventListener('DOMContentLoaded', function() {
    showPlaceholder('VRChat Friend Network Analysis', 'Click "Update Visualization" to start');

    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchText = e.target.value.toLowerCase();
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            if (!searchText) {
                clearSearch();
                return;
            }

            const matches = currentNodes.filter(node =>
                node.name.toLowerCase().includes(searchText)
            );

            showSearchResults(matches);
        }, 300);
    });

    fetch('/api/version')
        .then(response => response.json())
        .then(data => {
            const versionElement = document.getElementById('version');
            if (versionElement) {
                versionElement.textContent = `v ${data.version}`;
            }
        })
        .catch(error => {
            console.error('Failed to load version:', error);
            const versionElement = document.getElementById('version');
            if (versionElement) {
                versionElement.textContent = '';
            }
        });

    const collapsible = document.querySelector('.collapsible-button');
    const content = document.querySelector('.collapsible-content');

    collapsible?.addEventListener('click', function() {
        this.classList.toggle('active');
        content.classList.toggle('active');

        const arrow = this.textContent.includes('▼') ? '▲' : '▼';
        this.textContent = `Date Range Filter ${arrow}`;
    });

    const startDateSlider = document.getElementById('startDateSlider');
    const endDateSlider = document.getElementById('endDateSlider');
    const startDateLabel = document.getElementById('startDate');
    const endDateLabel = document.getElementById('endDate');

    function calculateDate(value) {
        const today = new Date();
        const monthsAgo = Math.round((100 - value) / 100 * 12);
        const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        return `${year}-${month}`;
    }

    function updateSliderTrack() {
        const startVal = parseInt(startDateSlider.value);
        const endVal = parseInt(endDateSlider.value);

        document.querySelector('.slider-track').style.background =
            `linear-gradient(to right, 
               #ddd ${startVal}%, 
               #4CAF50 ${startVal}%, 
               #4CAF50 ${endVal}%, 
               #ddd ${endVal}%
           )`;

        startDateLabel.textContent = calculateDate(startVal);
        endDateLabel.textContent = calculateDate(endVal);

        startDateLabel.classList.remove('active');
        endDateLabel.classList.remove('active');
        if (document.activeElement === startDateSlider) {
            startDateLabel.classList.add('active');
        } else if (document.activeElement === endDateSlider) {
            endDateLabel.classList.add('active');
        }
    }

    startDateSlider?.addEventListener('input', function(e) {
        const startVal = parseInt(this.value);
        const endVal = parseInt(endDateSlider.value);

        if (startVal > endVal) {
            this.value = endVal;
            return;
        }
        updateSliderTrack();
    });

    endDateSlider?.addEventListener('input', function(e) {
        const startVal = parseInt(startDateSlider.value);
        const endVal = parseInt(this.value);

        if (endVal < startVal) {
            this.value = startVal;
            return;
        }
        updateSliderTrack();
    });

    startDateSlider?.addEventListener('focus', updateSliderTrack);
    endDateSlider?.addEventListener('focus', updateSliderTrack);
    startDateSlider?.addEventListener('blur', updateSliderTrack);
    endDateSlider?.addEventListener('blur', updateSliderTrack);

    if (startDateSlider && endDateSlider) {
        updateSliderTrack();
    }

    document.getElementById('applyDateFilter').addEventListener('click', function() {
        if (currentNodes && currentLinks) {
            generateMetadata();
        }
    });
});

async function generateMetadata() {
    const updateButton = document.getElementById('updateButton');
    const stopButton = document.getElementById('stopButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const progressStatus = document.getElementById('progressStatus');
    const resultDiv = document.getElementById('result');
    const debugDiv = document.getElementById('debug');

    try {
        updateButton.disabled = true;
        stopButton.disabled = false;
        loadingOverlay.style.display = 'flex';
        progressStatus.textContent = 'Initializing...';
        debugDiv.innerHTML = '';

        currentEventSource = new EventSource('/api/metadata/generate');

        currentEventSource.onmessage = async function(event) {
            const data = JSON.parse(event.data);

            switch(data.type) {
                case 'start':
                    progressStatus.textContent = `Starting to process ${data.total} files...`;
                    break;

                case 'progress':
                    progressStatus.textContent = `Processing file ${data.current}/${data.total}`;
                    if (data.error) {
                        debugDiv.innerHTML += `<div class="error">Error processing: ${data.file}</div>`;
                    }
                    break;

                case 'complete':
                    closeEventSource();
                    if (data.stopped) {
                        progressStatus.textContent = '';
                        resultDiv.innerHTML = '';
                        loadingOverlay.style.display = 'none';

                        d3.select('#graph svg').remove();
                        currentNodes = null;
                        currentLinks = null;
                    } else {
                        progressStatus.textContent = 'Processing network data...';
                        await visualizeNetworkData();

                        resultDiv.innerHTML = `
                            <h3>Processing Results</h3>
                            <div class="success">Completed: ${data.successful} / ${data.total}</div>
                            ${data.failed > 0 ? `<div class="error">Failed: ${data.failed}</div>` : ''}
                        `;
                    }
                    updateButton.disabled = false;
                    stopButton.disabled = true;
                    break;

                case 'error':
                    closeEventSource();
                    throw new Error(data.error);
            }
        };

        currentEventSource.onerror = function() {
            closeEventSource();
            updateButton.disabled = false;
            stopButton.disabled = true;
            throw new Error('EventSource failed');
        };

    } catch (error) {
        console.error('Error:', error);
        progressStatus.textContent = 'An error occurred';
        resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        updateButton.disabled = false;
        stopButton.disabled = true;
    }
}

function closeEventSource() {
    if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
    }
}

async function stopGeneration() {
    try {
        const response = await fetch('/api/metadata/stop', {
            method: 'POST'
        });
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to stop generation');
        }
    } catch (error) {
        console.error('Error stopping generation:', error);
    }
}