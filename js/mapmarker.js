// Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13); // Set the initial view to London

// Add a tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define a marker icon
var markerIcon = L.icon({
    iconUrl: 'img/marker.svg',
    iconSize: [25, 41], // Size of the icon
    iconAnchor: [13, 41], // Point from which the popup should open relative to the iconAnchor
    popupAnchor: [-3, -76] // Point from which the popup should open relative to the iconAnchor
});

// function which adds a marker to the map
function addMarker(lat, lng, comment) {
    var marker = L.marker([lat, lng], {icon: markerIcon});
    marker.addTo(map);
    var popupContent = `<span id="editComment">${comment}</span> <button id="editBtn">Edit</button>`;
    marker.bindPopup(popupContent);//.openPopup();

    // When creating a new marker, attach a click event listener directly to it
    marker.on('popupopen', function() {
        var editBtn = document.querySelector('.leaflet-popup #editBtn');
        if (editBtn) {
            // Remove previous event listeners that may have been attached
            editBtn.removeEventListener('click', editComment);
            // Attach the event listener
            editBtn.addEventListener('click', editComment);
        }
    });
    marker.on('contextmenu', function() {
        map.removeLayer(this);
        
        // get the current URL and extract any existing Notion data
        var url = window.location.href;
        var notionDataIndex = url.indexOf('#');
        if (notionDataIndex > 0) {
            // If there is already Notion data in the URL, parse it into an array of triples
            var notionData = url.substring(notionDataIndex + 1).split(';');
            var triples = [];
            for (var i = 0; i < notionData.length; i++) {
                var ndi = notionData[i];
                if (ndi.length == 0) continue;
                var triple = notionData[i].split(',');
                triples.push([parseFloat(triple[0]), parseFloat(triple[1]), triple[2]]);
            }
        } else {
            // If there is no existing Notion data in the URL, create an empty array
            var triples = [];
        }
        // remove the triple for the marker from the array
        for (var i = 0; i < triples.length; i++) {
            if (triples[i][0] == marker.getLatLng().lat && triples[i][1] == marker.getLatLng().lng) {
                triples.splice(i, 1);
                break;
            }
        }
        // Construct a new Notion string from the array of triples
        var notionString = '';
        for (var i = 0; i < triples.length; i++) {
            notionString += triples[i][0] + ',' + triples[i][1] + ',' + encodeURIComponent(triples[i][2]) + ';';
        }
        // Remove the trailing ampersand from the Notion string
        if (notionString) {
            notionString = notionString.slice(0, -1);
        }
        // Update the URL with the new Notion data
        window.history.replaceState(null, null, '#' + notionString);
    });
}

// Define the editComment function outside so it has a consistent reference
function editComment() {
    var marker = map._popup._source; // Get the marker associated with the current popup
    var currentComment = marker.getPopup().getContent().match(/[^<>]+(?=<button)/)[0]; // Extract current comment from popup content
    var newComment = prompt("Enter a new comment for this marker:", currentComment);
    if (newComment !== null && newComment !== '') {
        updatePopupContent(marker, newComment);
    }
}

function updatePopupContent(marker, comment) {
    // Ensure the content string properly escapes any user input to avoid XSS vulnerabilities
    var popupContent = `<span>${comment}</span> <button id="editBtn">Edit</button>`;
    marker.bindPopup(popupContent).openPopup();
}

// Add a click event listener to the map
map.on('click', function(e) {

    // Create a new marker at the location of the click event
    var marker = addMarker(e.latlng.lat, e.latlng.lng, 'wee');

    // Get the current URL and extract any existing Notion data
    var url = window.location.href;
    var notionDataIndex = url.indexOf('#');
    if (notionDataIndex > 0) {
        // If there is already Notion data in the URL, parse it into an array of triples
        var notionData = url.substring(notionDataIndex + 1).split(';');
        var triples = [];
        for (var i = 0; i < notionData.length; i++) {
            var ndi = notionData[i];
            if (ndi.length == 0) continue;
            var triple = notionData[i].split(',');
            triples.push([parseFloat(triple[0]), parseFloat(triple[1]), triple[2]]);
        }
    } else {
        // If there is no existing Notion data in the URL, create an empty array
        var triples = [];
    }

    // Add a new triple to the array for the new marker
    // Before adding the new triple to the array, check if the values are valid numbers
    if (!isNaN(e.latlng.lat) && !isNaN(e.latlng.lng)) {
        triples.push([e.latlng.lat, e.latlng.lng, 'wee']); // Assume empty string for the comment if undefined
    } else {
        console.error("Invalid marker coordinates:", e.latlng.lat, e.latlng.lng);
    }

    // Construct a new Notion string from the array of triples
    var notionString = '';
    for (var i = 0; i < triples.length; i++) {
         notionString += triples[i][0] + ',' + triples[i][1] + ',' + encodeURIComponent(triples[i][2]) + ';';
    }
 
    // Remove the trailing ampersand from the Notion string
    if (notionString) {
        notionString = notionString.slice(0, -1);
    }
 
    // Update the URL with the new Notion data
    window.history.replaceState(null, null, '#' + notionString);
});

// Add a function to load the markers from the URL when the page loads
function loadMarkers() {
    var url = window.location.href;
    var notionData = url.substring(url.indexOf('#') + 1);

    if (notionData && notionData !== "") {
        var dataPairs = notionData.split(';');
        var triples = [];

        for (var i = 0; i < dataPairs.length; i++) {
            var triple = dataPairs[i].split(',');
            if (triple.length === 3) { // Ensure the triple has exactly 3 parts
                var lat = parseFloat(triple[0]);
                var lng = parseFloat(triple[1]);
                var comment = decodeURIComponent(triple[2]);
                
                if (!isNaN(lat) && !isNaN(lng)) { // Check if lat and lng are valid numbers
                    triples.push([lat, lng, comment]);
                } else {
                    console.error("Invalid LatLng values:", triple[0], triple[1]);
                }
            }
        }

        // Add a marker for each valid triple
        for (var i = 0; i < triples.length; i++) {
            var marker = addMarker(triples[i][0], triples[i][1], triples[i][2]);
        }

        // set the view in such a way that all markers are visible
        var group = new L.featureGroup(triples.map(function(triple) {
            return L.marker([triple[0], triple[1]]);
        }));
        map.fitBounds(group.getBounds());

    } else {
        console.log("No valid Notion data in URL");
    }
}

document.addEventListener('DOMContentLoaded', loadMarkers);
