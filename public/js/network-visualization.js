async function visualizeNetworkData(providedMetadata = null) {
    try {
        d3.select('#graph svg').remove();

        let allMetadata;

        if (providedMetadata) {
            allMetadata = providedMetadata;
            console.log(`Using provided metadata: ${allMetadata.length} files`);
        } else {
            console.log('Fetching metadata file list...');
            const response = await fetch('/api/metadata/files');
            const files = await response.json();
            console.log(`${files.length} metadata files found`);

            if (!files || files.length === 0) {
                showPlaceholder('No Metadata Files', 'Please generate metadata first');
                document.getElementById('applyDateFilter').disabled = true;
                return;
            }

            allMetadata = [];
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
        }

        if (allMetadata.length === 0) {
            showPlaceholder('No Valid Data Found', 'Please check your metadata files');
            document.getElementById('progressStatus').textContent = 'No valid data found';
            return;
        }

        console.log('Metadata loading completed');

        const playerInfoMap = new Map();
        const playerTimeMap = new Map();
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

        if (nodes.length === 0) {
            showPlaceholder('No Significant Connections', 'Try adjusting the time period or connection threshold');
            document.getElementById('progressStatus').textContent = 'No significant connections found';
            document.getElementById('applyDateFilter').disabled = false;
            return;
        }

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

        document.getElementById('applyDateFilter').disabled = false;

        try {
            const response = await fetch('/api/metadata/date-range');
            if (!response.ok) throw new Error('Failed to fetch date range');

            const { start, end } = await response.json();
            if (start && end) {
                document.getElementById('startDate').textContent = start;
                document.getElementById('endDate').textContent = end;
                document.getElementById('startDateSlider').disabled = false;
                document.getElementById('endDateSlider').disabled = false;

            } else {
                document.getElementById('startDate').textContent = 'No Data';
                document.getElementById('endDate').textContent = 'No Data';
                document.getElementById('startDateSlider').disabled = true;
                document.getElementById('endDateSlider').disabled = true;
            }
        } catch (error) {
            console.error('Error fetching date range:', error);
            document.getElementById('startDate').textContent = 'Error';
            document.getElementById('endDate').textContent = 'Error';
            document.getElementById('startDateSlider').disabled = true;
            document.getElementById('endDateSlider').disabled = true;
        }

    } catch (error) {
        console.error('Error visualizing network:', error);
        showPlaceholder('Error Occurred', 'Please check the debug information below');
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

function showPlaceholder(mainMessage, subMessage) {
    document.getElementById('applyDateFilter').disabled = true;

    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;

    const svg = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const background = svg.append('g')
        .attr('class', 'no-data-placeholder');

    background.append('rect')
        .attr('width', width)
        .attr('height', height);

    const textGroup = background.append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);

    textGroup.append('text')
        .attr('class', 'main-message')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('dy', '-1em')
        .text(mainMessage);

    textGroup.append('text')
        .attr('class', 'sub-message')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('dy', '1em')
        .text(subMessage);
}
