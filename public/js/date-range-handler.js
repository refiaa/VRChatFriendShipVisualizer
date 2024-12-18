document.addEventListener('DOMContentLoaded', function() {
    const startDateSlider = document.getElementById('startDateSlider');
    const endDateSlider = document.getElementById('endDateSlider');

    startDateSlider?.addEventListener('input', function(e) {
        if (window.dateRange && window.dateRange.totalMonths === 0) {
            this.value = 0;
            return;
        }

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
        updateSliderState();
    });

    endDateSlider?.addEventListener('input', function(e) {
        if (window.dateRange && window.dateRange.totalMonths === 0) {
            this.value = 0;
            return;
        }

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
        updateSliderState();
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

        const startSliderValue = document.getElementById('startDateSlider').value;
        const endSliderValue = document.getElementById('endDateSlider').value;

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

            document.getElementById('startDateSlider').value = startSliderValue;
            document.getElementById('endDateSlider').value = endSliderValue;
            updateSliderTrack();

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
            const startDate = new Date(data.start + '-01');
            const endDate = new Date(data.end + '-01');

            const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12
                + (endDate.getMonth() - startDate.getMonth());

            startDateSlider.min = 0;
            startDateSlider.max = totalMonths;
            startDateSlider.value = 0;

            endDateSlider.min = 0;
            endDateSlider.max = totalMonths;
            endDateSlider.value = totalMonths;

            startDateLabel.textContent = data.start;
            endDateLabel.textContent = data.end;

            window.dateRange = {
                start: startDate,
                end: endDate,
                totalMonths: totalMonths
            };

            updateSliderTrack();
            updateSliderState();
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

    const { start, end, totalMonths } = window.dateRange;

    if (totalMonths === 0) {
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

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

function areDatesEqual() {
    const startDateLabel = document.getElementById('startDate');
    const endDateLabel = document.getElementById('endDate');
    return startDateLabel.textContent === endDateLabel.textContent;
}

function updateSliderState() {
    const isEqual = areDatesEqual();
    const startDateSlider = document.getElementById('startDateSlider');
    const endDateSlider = document.getElementById('endDateSlider');

    if (!startDateSlider || !endDateSlider) return;

    startDateSlider.disabled = isEqual;
    endDateSlider.disabled = isEqual;

    if (isEqual) {
        startDateSlider.style.opacity = '0.5';
        endDateSlider.style.opacity = '0.5';
    } else {
        startDateSlider.style.opacity = '1';
        endDateSlider.style.opacity = '1';
    }
}