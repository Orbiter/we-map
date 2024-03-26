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

// Add a marker to the map at a specific location
L.marker([51.505, -0.09], {icon: markerIcon}).addTo(map)
    .bindPopup('Hello, world!') // Add a popup with some text
    .openPopup(); // Open the popup automatically

// Define some locations as arrays of latitude and longitude coordinates
var locations = [
    [51.505, -0.09], // London
    [40.7128, -74.0060], // New York City
    [-33.8688, 151.2093] // Sydney
];

// Add a loop to create and add markers for each location
for (var i = 0; i < locations.length; i++) {
    L.marker(locations[i]).addTo(map)
        .bindPopup('Hello, ' + locations[i][1] + '!') // Add a popup with some text that includes the longitude coordinate
        .openPopup(); // Open the popup automatically
}

// Add a click event listener to the map
map.on('click', function(e) {
    // Create a new marker at the location of the click event
    var marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);

    // Add a popup to the marker with some text that includes the latitude and longitude coordinates
    marker.bindPopup('Hello, ' + e.latlng.toString() + '!').openPopup();
});

// Add a click event listener to the map
map.on('click', function(e) {
    // Create a new marker at the location of the click event
    var marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);

    // Add a popup to the marker with some text that includes the latitude and longitude coordinates
    marker.bindPopup('Hello, ' + e.latlng.toString() + '!').openPopup();

    // Get the current URL and extract any existing Notion data
    var url = window.location.href;
    var notionData = url.substring(url.indexOf('#') + 1);

    // If there is already Notion data in the URL, parse it into an array of triples
    if (notionData) {
        notionData = notionData.split('&');
        var triples = [];
        for (var i = 0; i < notionData.length; i++) {
            var triple = notionData[i].split('=');
            triples.push([parseFloat(triple[0]), parseFloat(triple[1]), triple[2]]);
        }
    } else {
        // If there is no existing Notion data in the URL, create an empty array
        var triples = [];
    }

    // Add a new triple to the array for the new marker
    triples.push([e.latlng.lat, e.latlng.lng, '']);

    // Construct a new Notion string from the array of triples
    var notionString = '';
    for (var i = 0; i < triples.length; i++) {
         notionString += triples[i][0] + ',' + triples[i][1] + ',' + encodeURIComponent(triples[i][2]) + '&';
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
    // Get the current URL and extract any existing Notion data
    var url = window.location.href;
    var notionData = url.substring(url.indexOf('#') + 1);

    // If there is Notion data in the URL, parse it into an array of triples
    if (notionData) {
        notionData = notionData.split('&');
        var triples = [];
        for (var i = 0; i < notionData.length; i++) {
            var triple = notionData[i].split('=');
            triples.push([parseFloat(triple[0]), parseFloat(triple[1]), decodeURIComponent(triple[2])]);
        }

        // Add a marker for each triple in the array
        for (var i = 0; i < triples.length; i++) {
            L.marker([triples[i][0], triples[i][1]]).addTo(map)
                .bindPopup('Hello, ' + triples[i][0] + ', ' + triples[i][1] + '! (' + triples[i][2] + ')') // Add a popup with some text that includes the latitude and longitude coordinates and the comment
                .openPopup(); // Open the popup automatically
        }
    }
}