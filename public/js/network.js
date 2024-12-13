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
        this.textContent = `Data Filter ${arrow}`;
    });

    const startDateSlider = document.getElementById('startDateSlider');
    const endDateSlider = document.getElementById('endDateSlider');
    const startDateLabel = document.getElementById('startDate');
    const endDateLabel = document.getElementById('endDate');

    startDateSlider?.addEventListener('input', function(e) {
        const startVal = parseInt(this.value);
        const maxLimit = parseInt(endDateSlider.max) - 1;

        if (startVal > maxLimit) {
            this.value = maxLimit;
            return;
        }

        const endVal = parseInt(endDateSlider.value);
        if (startVal >= endVal) {
            endDateSlider.value = Math.min(maxLimit + 1, startVal + 1);
        }

        updateSliderTrack();
    });

    endDateSlider?.addEventListener('input', function(e) {
        const endVal = parseInt(this.value);
        const minLimit = 1;

        if (endVal < minLimit) {
            this.value = minLimit;
            return;
        }

        const startVal = parseInt(startDateSlider.value);
        if (endVal <= startVal) {
            startDateSlider.value = Math.max(0, endVal - 1);
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

    document.getElementById('applyDateFilter')?.addEventListener('click', async function() {
        const startDate = document.getElementById('startDate').textContent;
        const endDate = document.getElementById('endDate').textContent;
        const loadingOverlay = document.getElementById('loadingOverlay');
        const progressStatus = document.getElementById('progressStatus');

        try {
            loadingOverlay.style.display = 'flex';
            progressStatus.textContent = 'Filtering data...';

            const response = await fetch('/api/metadata/filter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate: startDate,
                    endDate: endDate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to filter metadata');
            }

            const filteredFiles = await response.json();
            progressStatus.textContent = 'Loading filtered data...';

            const allMetadata = [];
            for (const file of filteredFiles) {
                try {
                    const res = await fetch(`/api/metadata/file/${file}`);
                    if (res.ok) {
                        const data = await res.json();
                        allMetadata.push(data);
                    }
                } catch (error) {
                    console.error(`Error loading filtered metadata: ${file}`, error);
                }
            }

            progressStatus.textContent = 'Updating visualization...';
            d3.select('#graph svg').remove();
            await visualizeNetworkData(allMetadata);

            document.getElementById('applyDateFilter').disabled = false;

        } catch (error) {
            console.error('Error applying date filter:', error);
            progressStatus.textContent = 'Error filtering data';
            document.getElementById('applyDateFilter').disabled = false;
        } finally {
            loadingOverlay.style.display = 'none';
            progressStatus.textContent = '';
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

        const startDateSlider = document.getElementById('startDateSlider');
        const endDateSlider = document.getElementById('endDateSlider');
        const startDateLabel = document.getElementById('startDate');
        const endDateLabel = document.getElementById('endDate');

        if (startDateSlider && endDateSlider) {
            startDateSlider.value = '0';
            endDateSlider.value = endDateSlider.max || '100';
            updateSliderTrack();
        }

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

                        // sliderの状態からアップデート
                        await updateDateRange();
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
    await updateDateRange();
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

async function updateDateRange() {
    try {
        const response = await fetch('/api/metadata/date-range');
        const data = await response.json();

        const startDateLabel = document.getElementById('startDate');
        const endDateLabel = document.getElementById('endDate');
        const applyDateFilter = document.getElementById('applyDateFilter');
        const startDateSlider = document.getElementById('startDateSlider');
        const endDateSlider = document.getElementById('endDateSlider');

        if (!data.exists) {
            startDateLabel.textContent = 'No Metadata';
            endDateLabel.textContent = 'No Metadata';
            applyDateFilter.disabled = true;
            startDateSlider.disabled = true;
            endDateSlider.disabled = true;
            return;
        }

        if (currentNodes && currentLinks) {
            applyDateFilter.disabled = false;
            startDateSlider.disabled = false;
            endDateSlider.disabled = false;
        }

        if (data.exists && !data.hasFiles) {
            startDateLabel.textContent = 'No Data';
            endDateLabel.textContent = 'No Data';
            if (!currentNodes || !currentLinks) {
                applyDateFilter.disabled = true;
                startDateSlider.disabled = true;
                endDateSlider.disabled = true;
            }
            return;
        }

        if (data.exists && data.hasFiles && !data.hasValidDates) {
            startDateLabel.textContent = 'Invalid Dates';
            endDateLabel.textContent = 'Invalid Dates';
            if (!currentNodes || !currentLinks) {
                applyDateFilter.disabled = true;
                startDateSlider.disabled = true;
                endDateSlider.disabled = true;
            }
            return;
        }

        if (data.start && data.end) {
            // Parse dates
            const startDate = new Date(data.start + '-01');
            const endDate = new Date(data.end + '-01');

            // Calculate total months between dates
            const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12
                + (endDate.getMonth() - startDate.getMonth());

            // Update slider attributes
            startDateSlider.min = 0;
            startDateSlider.max = totalMonths;
            startDateSlider.value = 0;

            endDateSlider.min = 0;
            endDateSlider.max = totalMonths;
            endDateSlider.value = totalMonths;

            // Update labels
            startDateLabel.textContent = data.start;
            endDateLabel.textContent = data.end;

            // Store the date range for slider calculations
            window.dateRange = {
                start: startDate,
                end: endDate,
                totalMonths: totalMonths
            };

            // Update the slider track
            updateSliderTrack();
        }
    } catch (error) {
        console.error('Error fetching date range:', error);
        const startDateLabel = document.getElementById('startDate');
        const endDateLabel = document.getElementById('endDate');
        const applyDateFilter = document.getElementById('applyDateFilter');
        const startDateSlider = document.getElementById('startDateSlider');
        const endDateSlider = document.getElementById('endDateSlider');

        startDateLabel.textContent = 'Error';
        endDateLabel.textContent = 'Error';
        if (!currentNodes || !currentLinks) {
            applyDateFilter.disabled = true;
            startDateSlider.disabled = true;
            endDateSlider.disabled = true;
        }
    }
}

function calculateDate(value) {
    if (!window.dateRange) {
        return 'No Data';
    }

    const { start, totalMonths } = window.dateRange;
    const monthsToAdd = Math.round((value / totalMonths) * totalMonths);

    const date = new Date(start);
    date.setMonth(start.getMonth() + monthsToAdd);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
}

function updateSliderTrack() {
    const startDateSlider = document.getElementById('startDateSlider');
    const endDateSlider = document.getElementById('endDateSlider');
    const startDateLabel = document.getElementById('startDate');
    const endDateLabel = document.getElementById('endDate');

    if (!startDateSlider || !endDateSlider) return;

    const startVal = parseInt(startDateSlider.value);
    const endVal = parseInt(endDateSlider.value);
    const max = parseInt(endDateSlider.max);

    const startPercent = (startVal / max) * 100;
    const endPercent = (endVal / max) * 100;

    const track = document.querySelector('.slider-track');
    if (track) {
        track.style.background =
            `linear-gradient(to right, 
            #ddd 0%, 
            #ddd ${startPercent}%, 
            #4CAF50 ${startPercent}%, 
            #4CAF50 ${endPercent}%, 
            #ddd ${endPercent}%, 
            #ddd 100%
        )`;
    }

    if (startDateLabel && endDateLabel) {
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
}