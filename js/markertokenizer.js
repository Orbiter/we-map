// token list
const markerTokens = [
    "Accommodation", "Aeropuerto", "Airport", "Allee", "Amusement", "Aquarium", "Arena", "Attraction", "Avenue",
    "Bahnhof", "Beach", "Bibliothek", "Boulevard", "Bridge", "Building", 
    "Castle", "Center", "Church", "Cinema", "Clinic", "Convention",
    "Damm", "Diner", "District", "Drive",
    "Embassy", "Entrance", "Exhibition",
    "Ferry", "Food", "Forest", "Finca",
    "Garden", "Guest",
    "Harbor", "History", "Hotel",
    "Information", "Isla", "Institute",
    "Jardin", "Junction",
    "Katedrale", "Kirche", "Küche",
    "Lake", "Lighthouse", "Lodge",
    "Mall", "Metro", "Monument", "Motel", "Museum",
    "National", "Nightclub",
    "Observatory", "Office", "Oper", "Outlet", "Overpass",
    "Palace", "Plaza", "Port",
    "Restaurant", "River", "Road", "Ruins",
    "Sanctuary", "Schloß", "Shopping", "Skigebiet", "Square", "Street", "Synagogue",
    "Taxi", "Terminal", "Theater", "Tower", "Trail", "Tunnel",
    "University", "Urban",
    "Valley", "Venue", "Village", "Vulkan",
    "Waterfall", "Wellness", "Wharf", "Windmill", "Winery",
    "Xpressway",
    "Yacht", "Youth",
]

function encodeMarker(marker) {
    // first replace all spaces with underscores because they will have a shorter URLEncoding
    let encoded = marker.replace(/ /g, "_");
    // Then find all the tokens and replace them with a bang "!" and the first two letters of the token
    markerTokens.forEach(token => {
        encoded = encoded.replace(token, "!" + token.substring(0, 2));
    });
    return encoded;
}

function decodeMarker(encoded) {
    // first replace all underscores with spaces
    let marker = encoded.replace(/_/g, " ");
    // Then find all the tokens and replace them with the full token
    markerTokens.forEach(token => {
        marker = marker.replace("!" + token.substring(0, 2), token);
    });
    return marker;
}