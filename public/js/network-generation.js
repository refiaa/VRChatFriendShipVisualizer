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