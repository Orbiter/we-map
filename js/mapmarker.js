// Initialize the map
let map = L.map('map').setView([51.505, -0.09], 13);
map.getContainer().style.cursor = 'pointer';
var searchResultsLayer = L.layerGroup().addTo(map);

// adopt for different screen resolutions
let dpr = window.devicePixelRatio || 1;

// fail-over screen resolution detection in case the devicePixelRatio is not available
if (window.devicePixelRatio === undefined) {
    if (window.matchMedia) {
        let mq = window.matchMedia('only screen and (min-resolution: 2dppx), only screen and (min-resolution: 192dpi)');
        if (mq && mq.matches) {
            dpr = 2;
        }
    }
}

let markerSize = [40 * dpr, 66 * dpr]; // Adjust base size according to the DPR

// Define marker icons
let markerIcon = L.icon({
    iconUrl: 'img/marker.svg',
    iconSize: markerSize, // Size of the icon
    iconAnchor: [markerSize[0] / 2, markerSize[1] - 22], // Point from which the popup should open relative to the iconAnchor
    popupAnchor: [-3, -76 * dpr] // Point from which the popup should open relative to the iconAnchor
});
let searchIcon = L.icon({
    iconUrl: 'img/search.svg',
    iconSize: markerSize, // Size of the icon
    iconAnchor: [markerSize[0] / 2, markerSize[1] - 22], // Point from which the popup should open relative to the iconAnchor
    popupAnchor: [-3, -76 * dpr] // Point from which the popup should open relative to the iconAnchor
});

// Add a tile layer from OpenStreetMap
let tilehost = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
let tileconfig = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    //tileSize: 512, zoomOffset: -1, // tiles from openstreetmap.org are 256x256 and we fake 512x512 to make them bigger
    maxZoom: 22,
    detectRetina: true,
	useCache: true, // use the puchdb as cache for the tiles
    //useOnlyCache: true, // can be used to test the offline mode
	crossOrigin: true
};
// set the map to retina mode if the device has a higher pixel ratio
if (dpr > 1) {
    // add a style to the head of the document to increase the font size of the popup
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '.leaflet-popup-content { font-size: ' + (16 * window.devicePixelRatio) + 'px; }';
    document.getElementsByTagName('head')[0].appendChild(style);

    // set the tileconfig to retina mode
    tileconfig.hq = L.Browser.retina;
    tileconfig.tileSize = 1024;
    tileconfig.zoomOffset = -2;    

    // switch the map to retina mode
    let mapElement = document.getElementById('map');
    mapElement.classList.add('leaflet-retina');
}
L.tileLayer(tilehost, tileconfig).addTo(map);

function float6(value) {
    // convert the value into a string with at most six digits after the decimal point
    return parseFloat(value.toFixed(6));
}

// markers on the map are stored in triples inside the url of the page after the hash
function readTriples() {
    const url = window.location.href;
    const triples = [];
    const notionDataIndex = url.indexOf('#');

    if (notionDataIndex > 0) {
        const notionData = url.substring(notionDataIndex + 1).split(';');
        for (const ndi of notionData) {
            if (ndi.length === 0) continue;
            const triple = ndi.split(',');
            if (triple.length === 3) {
                const lat = parseFloat(float6(parseFloat(triple[0])));
                const lng = parseFloat(float6(parseFloat(triple[1])));
                const comment = decodeURIComponent(triple[2]);
                // check if this is a correct triple
                if (!isNaN(lat) && !isNaN(lng)) {
                    triples.push({lat, lng, comment});
                }
            }
        }
    }
    
    return triples;
}

function writeTriples(triples) {
    const notionString = triples.map(triple => `${float6(triple.lat)},${float6(triple.lng)},${encodeURIComponent(triple.comment)}`).join(';');
    window.history.replaceState(null, null, `#${notionString}`);
}

function extendTriples(triples, newTriples) {
    // for a given array of triples, the function adds new triples to it from newTriples
    // we do this doing a check for duplicates
    for (let i = 0; i < newTriples.length; i++) {
        let found = false;
        for (let j = 0; j < triples.length; j++) {
            if (triples[j].lat == newTriples[i].lat && triples[j].lng == newTriples[i].lng) {
                found = true;
                break;
            }
        }
        if (!found) {
            triples.push(newTriples[i]);
        }
    }
    return triples;
}

function searchLocation(query) {
    var bounds = map.getBounds();
    var viewbox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;

    var url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            searchResultsLayer.clearLayers(); // Assuming searchResultsLayer is already defined

            data.forEach(item => {
                var marker = L.marker([item.lat, item.lon], {icon: searchIcon})
                .bindPopup(`${item.display_name}`);
            searchResultsLayer.addLayer(marker);
                searchResultsLayer.addLayer(marker);
            });
        })
        .catch(error => console.log('Error:', error));
}

function controlContainer(title, content) {
    let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-custom');
    container.style.pointerEvents = 'auto';
    container.style.backgroundColor = 'white';
    container.style.backgroundSize = '30px 30px';
    container.style.width = '30px';
    container.style.height = '30px';
    container.style.cursor = 'pointer';
    container.textContent = content;
    container.title = title;
    container.style.fontSize = '16px';
    container.style.lineHeight = '30px';
    container.style.textAlign = 'center';
    return container;
}

// add a leaflet control to the map to reset the markers
L.Control.ResetMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Reset all markers', 'R');
        container.onclick = function() {
            // remove all markers from the map
            map.eachLayer(function(layer) {
                if (layer instanceof L.Marker) map.removeLayer(layer);
            });
            writeTriples([]); // remove the triples from the URL
        };
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
        });
        return container;
    }
});


// add a leaflet control to the map to export the markers
L.Control.ExportMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Export all markers', 'E');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            // construct an export string from the triples
            let triples = readTriples();
            let exportString = triples.map(triple => `${triple.comment}\nhttps://www.openstreetmap.org/?mlat=${float6(triple.lat)}&mlon=${float6(triple.lng)}&zoom=15`).join('\n\n');
            // get the width and height of the map
            let mapWidth = map.getSize().x;
            let mapHeight = map.getSize().y;
            let content = `<textarea style='width: ${mapWidth * 0.9}px; height: ${mapHeight * 0.9}px;'>${exportString}</textarea>`;
            // Create and open a popup with the content. Make sure it is placed in such a way that it fits in the middle of the map
            let popup = L.popup().setLatLng(map.getCenter()).setContent(content).openOn(map);
            //let popup = L.popup({className: 'leaflet-popup-custom', offset: L.point(0, -mapHeight * 0.45)});
            map.once('popupopen', function() {
                let popupElement = document.querySelector('.leaflet-popup-custom .leaflet-popup-content');
                if (popupElement) {
                    popupElement.style.maxWidth = "none";
                    popupElement.parentNode.style.maxWidth = "none";
                }
            });
        });
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

L.Control.ImportMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Import markers', 'I');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            let input = prompt("Paste the exported marker data here:");
            if (input) {
                try {
                    let newTriples = parseAndConstructTriples(input);
                    let triples = readTriples();
                    triples = extendTriples(triples, newTriples);
                    writeTriples(triples);
                    map.eachLayer(function(layer) {
                        if (layer instanceof L.Marker) map.removeLayer(layer);
                    });
                    triples.forEach(triple => addMarker(triple.lat, triple.lng, triple.comment, map));
                } catch (error) {
                    alert("Error parsing input: " + error.message);
                }
            }
        });
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

function parseAndConstructTriples(input) {
    // the function reads an import text and creates an array of triples
    let triples = [];
    let lines = input.split('\n');
    let comment = '';
    let url = '';
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.length === 0 && comment.length > 0 && url.length > 0) {
            // add the triple to the triples array
            let urlObject = new URL(url);
            let lat = urlObject.searchParams.get("mlat");
            let lng = urlObject.searchParams.get("mlon");
            if (lat && lng) {
                triples.push({lat: parseFloat(lat), lng: parseFloat(lng), comment: comment});
            }
            comment = '';
            url = '';
        } else if (line.startsWith('https://www.openstreetmap.org')) {
            url = line;
        } else if (!line.startsWith('https://') && !line.startsWith('http://') && comment.length === 0) {
            comment = line;
        }
    }
    return triples;
}


L.Control.SearchMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Search Locations', '?');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            let input = prompt("Search for:");
            if (input) {
                try {
                    searchLocation(input);
                } catch (error) {
                    alert("Error parsing input: " + error.message);
                }
            }
        });
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

L.control.resetMarkers = function(opts) { return new L.Control.ResetMarkers(opts); }
L.control.exportMarkers = function(opts) { return new L.Control.ExportMarkers(opts); }
L.control.importMarkers = function(opts) { return new L.Control.ImportMarkers(opts); }
L.control.searchMarkers = function(opts) { return new L.Control.SearchMarkers(opts); }
L.control.resetMarkers({ position: 'topright' }).addTo(map);
L.control.exportMarkers({ position: 'topright' }).addTo(map);
L.control.importMarkers({ position: 'topright' }).addTo(map);
L.control.searchMarkers({ position: 'topright' }).addTo(map);

// function which adds a marker to the map
function addMarker(lat, lng, comment) {
    let marker = L.marker([lat, lng], {icon: markerIcon});
    marker.addTo(map);
    let popupContent = `<span id="editableComment">${comment}</span>`;
    marker.bindPopup(popupContent);//.openPopup();

    // click event listener to the popup to edit the content
    marker.on('popupopen', function() {
        let popupElement = document.querySelector('.leaflet-popup-content');
        if (popupElement) {
            popupElement.style.cursor = 'pointer'; // Optional: Change cursor to indicate it's clickable
            popupElement.addEventListener('click', function() {
                // Extract only the text content for editing
                let currentCommentText = popupElement.textContent || popupElement.innerText;
                let newComment = prompt("Enter a new comment for this marker:", currentCommentText.trim());
                if (newComment !== null && newComment !== '') {
                    updatePopupContent(marker, newComment);
                    // update the triples array with the new comment
                    let triples = readTriples();
                    for (let i = 0; i < triples.length; i++) {
                        if (triples[i].lat == lat && triples[i].lng == lng) {
                            triples[i].comment = newComment;
                            break;
                        }
                    }
                    writeTriples(triples);
                }
            });
        }
    });

    // click event listener to remove the marker
    marker.on('contextmenu', function() {
        // remove the triple from the triples array
        let triples = readTriples();
        triples = removeMarker(triples, {lat: marker.getLatLng().lat, lng: marker.getLatLng().lng, comment: ''});
        writeTriples(triples);

        // remove the layer from the map
        map.removeLayer(this);
    });
}

// function which removes a triple from the triples array
function removeMarker(triples, triple) {
    for (let i = 0; i < triples.length; i++) {
        if (triples[i].lat == triple.lat && triples[i].lng == triple.lng) {
            triples.splice(i, 1);
            break;
        }
    }
    return triples;
}

// Define the editComment function outside so it has a consistent reference
function editComment() {
    let marker = map._popup._source; // Get the marker associated with the current popup
    let currentComment = marker.getPopup().getContent().match(/[^<>]+(?=<button)/)[0]; // Extract current comment from popup content
    let newComment = prompt("Enter a new comment for this marker:", currentComment);
    if (newComment !== null && newComment !== '') {
        updatePopupContent(marker, newComment);
    }
}

function updatePopupContent(marker, comment) {
    // Ensure the content string properly escapes any user input to avoid XSS vulnerabilities
    let sanitizedComment = comment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let newPopupContent = `<span>${sanitizedComment}</span>`;
    marker.getPopup().setContent(newPopupContent).update();
}

// Add a click event listener to the map
map.on('click', function(e) {
    let lat = parseFloat(float6(e.latlng.lat));
    let lng = parseFloat(float6(e.latlng.lng));
    let comment = 'wee';
    addMarker(lat, lng, comment);
    let triples = readTriples();
    triples.push({lat: lat, lng: lng, comment: comment});
    writeTriples(triples);
});

// Add a function to load the markers from the URL when the page loads
function loadMarkers() {
    let triples = readTriples();

    if (triples.length === 0) {
        // set bounds to the default view
        map.setView([51.505, -0.09], 13);
    } else { 
        // Add a marker for each valid triple
        for (let i = 0; i < triples.length; i++) {
            let marker = addMarker(triples[i].lat, triples[i].lng, triples[i].comment);
        }

        // set the view in such a way that all markers are visible
        let group = new L.featureGroup(triples.map(function(triple) {
            return L.marker([triple.lat, triple.lng]);
        }));
        map.fitBounds(group.getBounds());
    }
}

document.addEventListener('DOMContentLoaded', loadMarkers);
