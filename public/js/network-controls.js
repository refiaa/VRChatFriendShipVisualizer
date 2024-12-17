function showSearchResults(matches) {
    const resultsDiv = document.getElementById('searchResults');

    if (matches.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    resultsDiv.innerHTML = matches
        .map(node => `
            <div class="search-result-item" onclick="highlightNode('${node.id}')">
                ${node.name} (${node.count} appearances)
            </div>
        `)
        .join('');

    resultsDiv.style.display = 'block';
}

function highlightNode(nodeId) {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return;

    const connectedIds = new Set();
    currentLinks.forEach(link => {
        if (link.source.id === nodeId) connectedIds.add(link.target.id);
        if (link.target.id === nodeId) connectedIds.add(link.source.id);
    });

    d3.selectAll('.node')
        .classed('highlighted-node', d => d.id === nodeId)
        .classed('dimmed', d => d.id !== nodeId && !connectedIds.has(d.id));

    d3.selectAll('.link')
        .classed('dimmed', d =>
            d.source.id !== nodeId && d.target.id !== nodeId
        );

    document.getElementById('searchResults').style.display = 'none';

    const svg = d3.select('#graph svg');
    const transform = d3.zoomTransform(svg.node());
    const dx = width / 2 - node.x * transform.k;
    const dy = height / 2 - node.y * transform.k;

    svg.transition()
        .duration(750)
        .call(zoom.transform,
            d3.zoomIdentity
                .translate(dx, dy)
                .scale(transform.k)
        );
}

async function updateDirectory() {
    const directoryInput = document.getElementById('directoryInput');
    const directory = directoryInput.value.trim();
    const updateButton = document.getElementById('updateButton');

    try {
        updateButton.disabled = true;
        const response = await fetch('/api/config/directory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ directory })
        });

        const result = await response.json();

        if (result.success) {
            showDirectoryStatus('Directory updated successfully', 'success');
            directoryInput.value = result.directory;
        } else {
            showDirectoryStatus(`Failed to update directory: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showDirectoryStatus(`Error updating directory: ${error.message}`, 'error');
    } finally {
        updateButton.disabled = false;
    }
}

function showDirectoryStatus(message, type) {
    const containerDiv = document.querySelector('.directory-container');

    const existingStatus = containerDiv.querySelector('.directory-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `directory-status ${type}`;
    statusDiv.textContent = message;

    containerDiv.appendChild(statusDiv);

    setTimeout(() => {
        statusDiv.remove();
    }, 3000);
}

async function shareOnX() {
    try {
        const xShareButton = document.querySelector('button[aria-label="Share on X"]');
        if (!xShareButton) {
            throw new Error('Share button not found');
        }

        const originalContent = xShareButton.innerHTML;
        xShareButton.disabled = true;
        xShareButton.innerHTML = `<span class="loading-spinner"></span>`;

        const svgElement = document.querySelector('#graph svg');
        if (!svgElement) {
            throw new Error('No visualization found');
        }

        const { pngData } = await convertSVGToPNG(svgElement);
        console.log('Image converted successfully');

        const response = await fetch('/api/upload/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageData: pngData })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Upload failed: ${errorData}`);
        }

        const result = await response.json();
        if (!result.success || !result.url) {
            throw new Error('Invalid response from server');
        }

        const text = "Check out my VRChat Friend Network visualization! #VRChatFriendShipVisualizer";
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(result.url)}`;

        window.open(
            twitterUrl,
            'Share on X',
            `width=550,height=420,left=${(window.innerWidth - 550) / 2},top=${(window.innerHeight - 420) / 2}`
        );

    } catch (error) {
        console.error('Error sharing:', error);
        alert('Failed to share visualization: ' + error.message);
    } finally {
        const xShareButton = document.querySelector('button[aria-label="Share on X"]');
        if (xShareButton) {
            xShareButton.disabled = false;
            xShareButton.innerHTML = `<img src="/icon/x_logo.svg" alt="X" class="x-icon">`;
        }
    }
}

async function convertSVGToPNG(svgElement) {
    if (!svgElement) {
        throw new Error('No SVG element provided');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
        await new Promise((resolve, reject) => {
            img.onload = function() {
                try {
                    const width = svgElement.width.baseVal.value || img.width;
                    const height = svgElement.height.baseVal.value || img.height;

                    canvas.width = width;
                    canvas.height = height;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);

                    ctx.drawImage(img, 0, 0);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Failed to load SVG'));
            img.src = url;
        });

        return {
            canvas,
            pngData: canvas.toDataURL('image/png'),
            svgData: svgData
        };
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function exportSVG() {
    try {
        const exportButton = document.querySelector('button[aria-label="Export SVG"]');
        if (!exportButton) {
            throw new Error('Export button not found');
        }

        const originalContent = exportButton.innerHTML;
        exportButton.disabled = true;
        exportButton.innerHTML = `<span class="loading-spinner"></span>`;

        const svgElement = document.querySelector('#graph svg');
        if (!svgElement) {
            throw new Error('No visualization found');
        }

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `vrchat-network-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting SVG:', error);
        alert('Failed to export SVG: ' + error.message);
    } finally {
        const exportButton = document.querySelector('button[aria-label="Export SVG"]');
        if (exportButton) {
            exportButton.disabled = false;
            exportButton.innerHTML = `<img src="/icon/download.svg" alt="Export" class="icon">`;
        }
    }
}