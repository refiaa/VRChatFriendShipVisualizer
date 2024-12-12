let searchTimeout;
let currentNodes;
let currentLinks;
let currentEventSource = null;
let zoom;
let width;
let height;

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

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').style.display = 'none';

    d3.selectAll('.node')
        .classed('highlighted-node', false)
        .classed('dimmed', false);

    d3.selectAll('.link')
        .classed('dimmed', false);
}

// directory管理
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

// Twitter共有
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

// Export
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

// Metadata生成及び視覚化
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

async function visualizeNetworkData() {
    try {
        d3.select('#graph svg').remove();

        console.log('Fetching metadata file list...');
        const files = await fetch('/api/metadata/files').then(res => res.json());
        console.log(`${files.length} metadata files found`);

        const allMetadata = [];
        const concurrencyLimit = 5;
        let index = 0;

        async function fetchFile() {
            while (index < files.length) {
                const file = files[index++];
                try {
                    const res = await fetch(`/api/metadata/file/${file}`);
                    if (!res.ok) {
                        throw new Error(`Failed to fetch file: ${file}`);
                    }
                    const data = await res.json();
                    allMetadata.push(data);
                } catch (error) {
                    console.error(`Error fetching file ${file}:`, error);
                }
            }
        }

        const workers = [];
        for (let i = 0; i < concurrencyLimit; i++) {
            workers.push(fetchFile());
        }

        await Promise.all(workers);

        console.log('Metadata loading completed');

        // Process metadata and create visualization
        const playerInfoMap = new Map();
        const playerTimeMap = new Map();

        allMetadata.forEach(metadata => {
            if (!metadata.players || !metadata.timestamp) return;

            const timestamp = new Date(metadata.timestamp).getTime();
            metadata.players.forEach(player => {
                if (!player.id) return;

                if (!playerInfoMap.has(player.id)) {
                    playerInfoMap.set(player.id, player.displayName);
                }

                if (!playerTimeMap.has(player.id)) {
                    playerTimeMap.set(player.id, new Set());
                }
                playerTimeMap.get(player.id).add(timestamp);
            });
        });

        const playerConnections = new Map();
        const playerAppearances = new Map();
        const relationshipStrength = new Map();

        const getTimeWeight = (timestamp) => {
            const now = new Date().getTime();
            const monthsDiff = (now - timestamp) / (1000 * 60 * 60 * 24 * 30);
            return Math.exp(-monthsDiff / 12);
        };

        allMetadata.forEach(metadata => {
            if (!metadata.players || !metadata.timestamp) return;
            const timestamp = new Date(metadata.timestamp).getTime();
            const timeWeight = getTimeWeight(timestamp);

            metadata.players.forEach(player => {
                if (!player.id) return;

                const count = playerAppearances.get(player.id) || 0;
                playerAppearances.set(player.id, count + 1);
            });

            const validPlayers = metadata.players.filter(player => player.id);
            validPlayers.forEach((player1, i) => {
                validPlayers.slice(i + 1).forEach(player2 => {
                    if (player1.id === player2.id) return;

                    const connectionKey = [player1.id, player2.id].sort().join('--');
                    const currentWeight = playerConnections.get(connectionKey) || 0;
                    playerConnections.set(connectionKey, currentWeight + timeWeight);

                    const set1 = playerTimeMap.get(player1.id);
                    const set2 = playerTimeMap.get(player2.id);
                    const intersection = new Set([...set1].filter(x => set2.has(x)));
                    const union = new Set([...set1, ...set2]);
                    const jaccardCoeff = intersection.size / union.size;

                    relationshipStrength.set(connectionKey, jaccardCoeff);
                });
            });
        });

        const avgAppearances = Array.from(playerAppearances.values())
            .reduce((a, b) => a + b, 0) / playerAppearances.size;
        const stdAppearances = Math.sqrt(
            Array.from(playerAppearances.values())
                .reduce((a, b) => a + Math.pow(b - avgAppearances, 2), 0) /
            playerAppearances.size
        );

        const nodes = Array.from(playerAppearances.entries())
            .filter(([_, count]) => count >= Math.max(2, avgAppearances - 2 * stdAppearances))
            .map(([id, count]) => ({
                id: id,
                name: playerInfoMap.get(id) || id,
                count: count
            }));

        const validNodeIds = new Set(nodes.map(n => n.id));

        const links = Array.from(playerConnections.entries())
            .filter(([key, weight]) => {
                const [source, target] = key.split('--');
                if (!validNodeIds.has(source) || !validNodeIds.has(target)) return false;

                const jaccardCoeff = relationshipStrength.get(key);
                return jaccardCoeff >= 0.1 && weight >= 1;
            })
            .map(([key, weight]) => {
                const [source, target] = key.split('--');
                return {
                    source: source,
                    target: target,
                    value: weight,
                    strength: relationshipStrength.get(key)
                };
            });

        currentNodes = nodes;
        currentLinks = links;

        console.log(`${nodes.length} nodes and ${links.length} links created`);

        width = document.getElementById('graph').clientWidth;
        height = document.getElementById('graph').clientHeight;

        const svg = d3.select('#graph')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g');

        const colorScale = d3.scaleSequential()
            .domain([0, d3.max(nodes, d => d.count)])
            .interpolator(d3.interpolateYlOrRd);

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(d => 200 / (d.strength || 1))
                .strength(d => 0.1 + d.strength * 0.9))
            .force('charge', d3.forceManyBody()
                .strength(d => -500 * Math.sqrt(d.count / avgAppearances))
                .distanceMax(1000))
            .force('collide', d3.forceCollide()
                .radius(d => Math.sqrt(d.count) * 10 + 20)
                .strength(0.5))
            .force('x', d3.forceX(width / 2).strength(0.03))
            .force('y', d3.forceY(height / 2).strength(0.03))
            .velocityDecay(0.3);

        const linkElements = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .style('stroke', d => d.strength <= 0.2 ? '#ddd' : '#999')
            .style('stroke-width', d => Math.max(Math.sqrt(d.value), 0.5))
            .style('stroke-opacity', d => {
                if (d.strength <= 0.2) return 0.1;
                if (d.strength <= 0.5) return 0.2;
                return 0.4;
            });

        const drag = d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        const nodeElements = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .call(drag);

        nodeElements.append('circle')
            .attr('r', d => Math.sqrt(d.count) * 8 + 5)
            .style('fill', d => colorScale(d.count))
            .style('stroke', '#fff')
            .style('stroke-width', 2)
            .style('stroke-opacity', 0.8)
            .style('fill-opacity', 0.7);

        nodeElements.append('text')
            .text(d => d.name)
            .attr('x', d => Math.sqrt(d.count) * 8 + 8)
            .attr('y', 5)
            .style('font-size', d => Math.min(12 + d.count / 2, 16) + 'px')
            .style('fill', '#333')
            .style('font-weight', d => d.count > avgAppearances ? 'bold' : 'normal');

        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        nodeElements.on('mouseover', function(event, d) {
            const connectedIds = new Set();
            const connectionInfo = new Map();

            links.forEach(l => {
                if (l.source.id === d.id) {
                    connectedIds.add(l.target.id);
                    connectionInfo.set(l.target.id, {
                        strength: l.strength,
                        value: l.value
                    });
                }
                if (l.target.id === d.id) {
                    connectedIds.add(l.source.id);
                    connectionInfo.set(l.source.id, {
                        strength: l.strength,
                        value: l.value
                    });
                }
            });

            linkElements.style('stroke-opacity', l =>
                (l.source.id === d.id || l.target.id === d.id)
                    ? Math.min(0.9, l.strength + 0.3)
                    : (l.strength <= 0.2 ? 0.1 : 0.2)
            );

            nodeElements.style('opacity', n =>
                connectedIds.has(n.id) || n.id === d.id ? 1 : 0.3
            );

            tooltip.transition()
                .duration(200)
                .style('opacity', .9);

            const connections = Array.from(connectedIds)
                .map(id => {
                    const info = connectionInfo.get(id);
                    const node = nodes.find(n => n.id === id);
                    return {
                        name: node.name,
                        strength: info.strength,
                        value: info.value
                    };
                })
                .sort((a, b) => b.strength - a.strength)
                .map(c => `${c.name} (Relationship Strength: ${(c.strength * 100).toFixed(1)}%, ${c.value.toFixed(1)} times)`)
                .join('<br/>');

            tooltip.html(`
                <strong>${d.name}</strong><br/>
                Total Appearances: ${d.count}<br/>
                <br/>
                Connected Players:<br/>
                ${connections}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
            .on('mouseout', function() {
                linkElements.style('stroke-opacity', d => {
                    if (d.strength <= 0.2) return 0.1;
                    if (d.strength <= 0.5) return 0.2;
                    return 0.4;
                });
                nodeElements.style('opacity', 1);

                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity);

        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
        });

    } catch (error) {
        console.error('Error visualizing network:', error);
        document.getElementById('progressStatus').textContent = 'Error during network visualization';

        const debugDiv = document.getElementById('debug');
        if (debugDiv) {
            debugDiv.innerHTML = `
                <div class="error">
                    <strong>Error Details:</strong><br/>
                    ${error.message}<br/>
                    ${error.stack}
                </div>
            `;
        }

        throw error;
    } finally {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}