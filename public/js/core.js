let currentNodes;
let currentLinks;
let currentEventSource = null;
let zoom;
let width;
let height;
let searchTimeout;

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

    const collapsible = document.querySelector('.collapsible-button');
    const content = document.querySelector('.collapsible-content');

    collapsible?.addEventListener('click', function() {
        this.classList.toggle('active');
        content.classList.toggle('active');

        const arrow = this.textContent.includes('▼') ? '▲' : '▼';
        this.textContent = `Data Filter ${arrow}`;
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
});

function showPlaceholder(title, subtitle) {
    const graphDiv = document.getElementById('graph');
    graphDiv.innerHTML = `
        <div class="placeholder">
            <h1>${title}</h1>
            <p>${subtitle}</p>
        </div>
    `;
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