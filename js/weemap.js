/**
 *  weemap.js - A simple map to remember and share locations
 *  Copyright 26.03.2024 by Michael Peter Christen, mc@yacy.net
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with this program in the file lgpl21.txt
 *  If not, see <http://www.gnu.org/licenses/>.
 */

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

// sanitize strings to remove characters which are not allowed in a URL, in web content or in triples lists
function sanitized(comment) {
    return comment.replace(new RegExp('[,;&<>]', 'g'), ' ');
}

// markers on the map are stored in triples inside the url of the page after the hash
function readTriplesFromURL(url) {
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

function readTriples() {
    const url = window.location.href;
    return readTriplesFromURL(url);
}

function writeTriples(triples) {
    const notionString = triples.map(triple => `${float6(triple.lat)},${float6(triple.lng)},${encodeURIComponent(triple.comment)}`).join(';');
    window.history.replaceState(null, null, `#${notionString}`);
}

function resetViewbox(triples) {
    // set the view in such a way that all markers are visible
    let group = new L.featureGroup(triples.map(function(triple) {
        return L.marker([triple.lat, triple.lng]);
    }));
    map.fitBounds(group.getBounds());
    if (map.getZoom() > 19) map.setZoom(19);
}

function extendTriples(triples, newTriples) {
    // for a given array of triples, the function adds new triples to it from newTriples
    // we do this doing a check for duplicates
    for (let i = 0; i < newTriples.length; i++) {
        let found = false;
        let newTriple = {lat: float6(newTriples[i].lat), lng: float6(newTriples[i].lng), comment: sanitized(newTriples[i].comment)}
        for (let j = 0; j < triples.length; j++) {
            if (triples[j].lat == newTriple.lat && triples[j].lng == newTriple.lng) {
                found = true;
                break;
            }
        }
        if (!found) {
            triples.push(newTriple);
        }
    }
    return triples;
}

function controlContainer(title, content) {
    let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-custom');
    container.style.pointerEvents = 'auto';
    container.style.backgroundColor = 'white';
    container.style.backgroundSize = '70px 30px';
    container.style.width = '70px';
    container.style.height = '30px';
    container.style.cursor = 'pointer';
    container.style.marginRight = '85px';
    container.style.marginBottom = '20px';
    container.textContent = content;
    container.title = title;
    container.style.fontSize = '16px';
    container.style.lineHeight = '30px';
    container.style.textAlign = 'center';
    return container;
}

function help() {        
    // Setup help modal content
    document.getElementById('helpModalHeadline').textContent = 'Help Information';
    document.getElementById('helpModalTextarea').value = 
    'This is a map where you can add markers to remember and share locations. \n\n' +
    'Functions: \n' + 
    '- Click on the map to add a location (blue marker). \n' +
    '- Right-click on a marker to remove it. \n' +
    '- Click on a marker to show its comment. \n' +
    '- Click on the comment to edit it. \n\n' +
    'All markers are stored in the URL of the page! \n' +
    'This means there are no accounts or logins. \n\n' +
    'You can share the URL with others to collaborate with the markers: \n' +
    '- Copy the URL with the "Share" button. \n' +
    '- Export all markers with the "Export" button into a text file. \n' +
    '- Import markers with the "Import" button. The import format is identical to the export format, but you can also import other weemap urls. \n\n' +
    'You can also search for locations: \n' +
    '- Click on the "Search" button and enter a location name. \n' +
    '- Results are only searched within the visible view box! \n' +
    '- Click on a search result location (green marker) to view the location name. \n' +
    '- To convert a search result marker (green) into a normal, stored marker (blue), right-click on it. \n\n' +
    'FAQ: \n' +
    '- Does weemap.org store any of the location data?\n  No, all data is only stored in the URL of the page on your own device. \n' +
    '- Does weemap.org store any cookies or personal data?\n  No, weemap.org works without cookies. You do not need to have an account to use weemap.org thus we don\'t have any personal data from you. \n' +
    '- How many locations can be stored in the URL?\n  About 40\n' +
    '- Does the import function recognize and ignore duplicates?\n  Yes, locations are matched using a similarity metric on the coordinates to avoid duplicates.\n' +
    '- Can I use the map offline?\n  Yes, if you have visited the map before. All visited tiles are cached in the browser. \n' +
    '- Is this open source? Where can I get the source code?\n  Yes, the source code is available on GitHub: https://github.com/orbiter/weemap\n' +
    '- Can I contribute or help?\n  Yes, pull requests are welcome. You are also welcome to subscribe to https://www.patreon.com/orbiterlab\n\n' +
    'Have fun!';
    document.getElementById('helpModal').style.display = 'block';

    // "Close" button action
    document.getElementById('helpModalCloseButton').onclick = function() {
        document.getElementById('helpModal').style.display = 'none';
    };
};

// add a leaflet control to show help
L.Control.Help = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('WeeMap Help', 'Help');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            help();
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

// add a leaflet control to copy the weekmap URL
L.Control.ShareMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Copy URL of map', 'Share');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            // get the url of the page as string
            let url = window.location.href;
            // copy the url into the clipboard
            navigator.clipboard.writeText(url).then(function() {
                alert('URL copied to clipboard - share it with others!');
            }, function() {
                alert('Error copying URL to clipboard');
            });
        });
        return container;
    }
});

// add a leaflet control to the map to reset the markers
L.Control.ResetMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Clear all markers', 'Clear');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            // open a dialog to confirm the deletion of all markers
            if (!confirm('Do you really want to delete all markers?')) return;
            
            // remove all markers from the map
            map.eachLayer(function(layer) {
                if (layer instanceof L.Marker) map.removeLayer(layer);
            });
            writeTriples([]); // remove the triples from the URL
        });
        return container;
    }
});

// add a leaflet control to the map to export the markers
L.Control.ExportMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Export all markers', 'Export');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e);

            // construct an export string from the triples
            let triples = readTriples();
            let exportString = triples.map(triple => `${triple.comment}\nhttps://www.openstreetmap.org/?mlat=${float6(triple.lat)}&mlon=${float6(triple.lng)}&zoom=15`).join('\n\n');

            // Populate the textarea and show the modal
            document.getElementById('exportModal').style.display = 'block';
            document.getElementById('exportModalTextarea').value = exportString;
            document.getElementById('exportModalHeadline').textContent = 'Exported markers, copy the text below:';

            // Copy button functionality
            document.getElementById('exportModalCopyButton').onclick = function() {
                document.getElementById('exportModalTextarea').select();
                document.execCommand('copy');
            };

            // Close button functionality
            document.getElementById('exportModalCloseButton').onclick = function() {
                document.getElementById('exportModal').style.display = 'none';
            };

        });
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

L.Control.ImportMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Import markers', 'Import');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            
            // Setup modal for import
            document.getElementById('importModalHeadline').textContent = 'Import Markers';
            document.getElementById('importModalTextarea').value = ''; // Clear previous content
            document.getElementById('importModal').style.display = 'block';

            // Setup buttons
            document.getElementById('importModalImportButton').textContent = 'Import';
            document.getElementById('importModalAbortButton').textContent = 'Abort';

            // "Paste" button functionality
            document.getElementById('importModalPasteButton').onclick = async function() {
                if (navigator.clipboard) {
                    document.getElementById('importModalTextarea').value = await navigator.clipboard.readText();
                }
            };

            // "Import" button triggers the import process
            document.getElementById('importModalImportButton').onclick = function() {
                let input = document.getElementById('importModalTextarea').value;
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
                        resetViewbox(triples);
                        document.getElementById('importModal').style.display = 'none'; // Close modal on success
                    } catch (error) {
                        alert("Error parsing input: " + error.message);
                    }
                }
            };

            // "Abort" button closes the modal without action
            document.getElementById('importModalAbortButton').onclick = function() {
                document.getElementById('importModal').style.display = 'none';
            };
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
        if (line.startsWith('https://www.openstreetmap.org') && line.indexOf('?mlat=') > 0 && line.indexOf('&mlon=') > 0) {
            url = line;
        } else if (line.indexOf('weemap.org/#') > 0) {
            // parse the weemap.org URL and extract the triples
            newTriples = readTriplesFromURL(line);
            triples = extendTriples(triples, newTriples);
        } else if (!line.startsWith('https://') && !line.startsWith('http://') && line.length > 0 && comment.length === 0) {
            // check if line has exactly one comma inside and the two parts are floats
            let parts = line.split(',');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0].trim())) && !isNaN(parseFloat(parts[1].trim()))) {
                let lat = parseFloat(parts[0].trim());
                let lng = parseFloat(parts[1].trim());
                url = `https://www.openstreetmap.org/?mlat=${float6(lat)}&mlon=${float6(lng)}&zoom=15`;
                // check if the next line is not a URL
                if (i + 1 < lines.length && !lines[i + 1].startsWith('https://') && !lines[i + 1].startsWith('http://')) {
                    comment = sanitized(lines[i + 1]).trim();
                    i++;
                }
            } else {
                // this can be the first line in a newline-separated block
                comment = sanitized(line).trim();
            }
        }
        if (url.length > 0) {
            // add the triple to the triples array
            let urlObject = new URL(url);
            let lat = urlObject.searchParams.get("mlat");
            let lng = urlObject.searchParams.get("mlon");
            if (comment.length === 0) comment = "wee";
            triples = extendTriples(triples, [{lat: parseFloat(lat), lng: parseFloat(lng), comment: comment}]);
            comment = '';
            url = '';
        }
    }
    return triples;
}

L.Control.SearchMarkers = L.Control.extend({
    onAdd: function(map) {
        let container = controlContainer('Search Locations', 'Search');
        L.DomEvent.on(container, 'click', function(e) {
            L.DomEvent.stopPropagation(e); // Prevent click event from propagating to the map
            let query = prompt("Search for:");
            if (query) {
                try {
                    let bounds = map.getBounds();
                    let viewbox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
                    let searchurl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;
                    fetch(searchurl)
                        .then(response => response.json())
                        .then(data => {
                            searchResultsLayer.clearLayers();
                            data.forEach(item => {
                                let newTriple = {lat: parseFloat(item.lat), lng: parseFloat(item.lon), comment: sanitized(item.display_name)};
                                let marker = L.marker([item.lat, item.lon], {icon: searchIcon}).bindPopup(`${item.display_name}`);
                                searchResultsLayer.addLayer(marker);

                                // Add a right-click event listener to transform the marker into a normal marker
                                marker.on('contextmenu', function(e) {
                                    //console.log('Right-clicked on search result marker');
                                    L.DomEvent.preventDefault(e); // Prevent the default right-click behavior
                                    // Remove from search results
                                    searchResultsLayer.removeLayer(marker);

                                    // Add to the main triples list and update the URL
                                    let triples = readTriples(); // Retrieve the current list of triples
                                    let n = triples.length;
                                    triples = extendTriples(triples, [newTriple]); // Add the new triple
                                    writeTriples(triples); // Update the triples list

                                    // Add a new normal marker to the map
                                    if (triples.length > n) addMarker(newTriple.lat, newTriple.lng, newTriple.comment);
                                });
                            });
                        })
                    .catch(error => {
                        console.log('Error:', error);
                    });


                } catch (error) {
                    alert("Error searching: " + error.message);
                }
            };
        });
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

L.control.help = function(opts) { return new L.Control.Help(opts); }
L.control.shareMarkers = function(opts) { return new L.Control.ShareMarkers(opts); }
L.control.resetMarkers = function(opts) { return new L.Control.ResetMarkers(opts); }
L.control.exportMarkers = function(opts) { return new L.Control.ExportMarkers(opts); }
L.control.importMarkers = function(opts) { return new L.Control.ImportMarkers(opts); }
L.control.searchMarkers = function(opts) { return new L.Control.SearchMarkers(opts); }
L.control.help({ position: 'topright' }).addTo(map);
L.control.shareMarkers({ position: 'topright' }).addTo(map);
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
                    newComment = sanitized(newComment);
                    marker.getPopup().setContent(`<span>${newComment}</span>`).update();
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
        help();
    } else { 
        // Add a marker for each valid triple
        for (let i = 0; i < triples.length; i++) {
            let marker = addMarker(triples[i].lat, triples[i].lng, triples[i].comment);
        }
        resetViewbox(triples);
    }
}

document.addEventListener('DOMContentLoaded', loadMarkers);
