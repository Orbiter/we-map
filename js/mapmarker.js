// Initialize the map
let map = L.map('map').setView([51.505, -0.09], 13);

// adopt for different screen resolutions
let dpr = window.devicePixelRatio || 1;
let markerSize = [40 * dpr, 66 * dpr]; // Adjust base size according to the DPR

// Define a marker icon
let markerIcon = L.icon({
    iconUrl: 'img/marker.svg',
    iconSize: markerSize, // Size of the icon
    iconAnchor: [markerSize[0] / 2, markerSize[1]], // Point from which the popup should open relative to the iconAnchor
    popupAnchor: [-3, -76 * dpr] // Point from which the popup should open relative to the iconAnchor
});

// set the map to retina mode if the device has a higher pixel ratio
if (window.devicePixelRatio > 1) {
    let mapElement = document.getElementById('map');
    mapElement.classList.add('leaflet-retina');
}

// Add a tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

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
                const lat = parseFloat(triple[0]);
                const lng = parseFloat(triple[1]);
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
    const notionString = triples.map(triple => `${triple.lat},${triple.lng},${encodeURIComponent(triple.comment)}`).join(';');
    window.history.replaceState(null, null, `#${notionString}`);
}

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
        map.removeLayer(this);
        
        // get the current URL and extract any existing Notion data
        let triples = readTriples();

        // remove the triple for the marker from the array
        for (let i = 0; i < triples.length; i++) {
            if (triples[i][0] == marker.getLatLng().lat && triples[i][1] == marker.getLatLng().lng) {
                triples.splice(i, 1);
                break;
            }
        }

        // Update the URL with the new Notion data
        writeTriples(triples);
    });
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

    // Create a new marker at the location of the click event
    let marker = addMarker(e.latlng.lat, e.latlng.lng, 'wee');

    // Get the current URL and extract any existing Notion data
    let triples = readTriples();

    // Add a new triple to the array for the new marker
    // Before adding the new triple to the array, check if the values are valid numbers
    if (!isNaN(e.latlng.lat) && !isNaN(e.latlng.lng)) {
        triples.push([e.latlng.lat, e.latlng.lng, 'wee']); // Assume empty string for the comment if undefined
    } else {
        console.error("Invalid marker coordinates:", e.latlng.lat, e.latlng.lng);
    }

    // Update the URL with the new Notion data
    writeTriples(triples);
});

// Add a function to load the markers from the URL when the page loads
function loadMarkers() {
    let triples = readTriples();

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

document.addEventListener('DOMContentLoaded', loadMarkers);
