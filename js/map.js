var ignoreList = function(key) {
    retValue = key == "title" ? true :
        key == "url" ? true :
        key == "features" ? true :
        key == "image" ? true :
        key == "description" ? true :
        key == "colour" ? true :
        key == "data" ? true :
        key == "type" ? true :
        key == "background" ? true :
        false;
    return retValue;
};
var minZoom = -2;
var nationZoom = -2;
var regionMinZoom = -1;
var poiMinZoom = 1;
var topLeft = [0, 0];
var bottomRight = [4811, 6428];

function sideNavClick(t, e) {
    if (e.ctrlKey) {
        return true;
    } else {
        return false;
    }
}
var map = L.map('map', {
    minZoom: minZoom,
    crs: L.CRS.Simple
});
var isCtrlKeyPressed = false;
var isAltKeyPressed = false;
var bounds = [topLeft, bottomRight];
var image = L.imageOverlay('images/main_bw.png', bounds).addTo(map);
var geoJson = new L.geoJson();
var searchBar = new L.Control.Search({ layer: geoJson });
var nationsData = {};
var xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        nationsData = JSON.parse(this.responseText);
        createLayerFromZoom(nationsData);
    }
};
xmlhttp.open("GET", "data/geodata.json", true);
xmlhttp.send();

function createGeoJsonLayer(data) {
    map.removeLayer(geoJson);
    geoJson = L.geoJson(data, {
        style: geoJsonFeatureStyle,
        onEachFeature: onEachGeoJsonFeature
    }).addTo(map);
    map.removeControl(searchBar);
	searchBar = new L.Control.Search({layer: geoJson});
    map.addControl(searchBar);
}
var imageLayers = new Array();

function createImageLayers(data) {
    for (var i in imageLayers) {
        map.removeLayer(imageLayers[i]);
    }
    for (var i in data) {
        data.style = imageLayerStyle;
        imageLayers.push(data[i].addTo(map));
    }
}

function imageLayerStyle(layer) {
    var returnObj = {
        weight: 1,
        opacity: 1,
        color: 'black',
        dashArray: '3'
    };
    return returnObj;
}

function onEachGeoJsonFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: featureClicked,
    });
}

function onEachImageLayer(layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: featureClicked,
    });
}

function geoJsonFeatureStyle(feature) {
    var colour = feature.properties.colour;
    var returnObj = {
        weight: 1,
        opacity: 1,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.3
    };
    if (colour) {
        returnObj.fillColor = colour;
    }
    return returnObj;
}

function arrayIncludes(array, element) {
    for (var i in array) {
        if (array[i].properties.name == element.properties.name) {
            return true;
        }
    }
    return false;
}
var highlightImage = undefined;
var ignoreMouseOut = false;

function highlightFeature(e) {
    if (!ignoreMouseOut) {
        var layer = e.target;
        if (layer.feature.geometry.type == "Polygon" || layer.feature.geometry.type == "MultiPolygon") {
            var style = {
                weight: 5,
                color: '#666',
                dashArray: ''
            }
            if (layer.feature.properties.background) {
                style.fillOpacity = 0;
            } else {
                style.fillOpacity = 0.5;
            }
            layer.setStyle(style);
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
        }
        info.update(layer.feature.properties);
    }
}

function resetHighlight(e) {
    if (!ignoreMouseOut) {
        geoJson.resetStyle(e.target);
        info.update();
    }
}
var featureBuffer = new Array();

function featureClicked(e) {
    var geometryType = e.target.feature.geometry.type;
    if (isCtrlKeyPressed) {
        var url = e.target.feature.properties.url;
        if (url) {
            window.open(url);
        }
    } else if (isAltKeyPressed || geometryType == "Point") {
        openPOIInfo(map, e);
        var layer = e.target;
        if (layer.feature.geometry.type == "Polygon") {
            var style = {
                weight: 5,
                color: '#666',
                dashArray: ''
            }
            if (!layer.feature.properties.background) {
                style.fillOpacity = 0.7;
            }

            layer.setStyle(style);
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
        }
        info.update(layer.feature.properties);
    } else {
        var newBounds = map.fitBounds(e.target.getBounds());
        /*featureBuffer = new Array();
        var features = e.target.feature.properties.features.features;
        for(var i in features){
        	featureBuffer.push(features[i]);
        }*/
        //createLayerFromZoom(nationsData);
    }
}
var savedZoom = minZoom;

function saveZoom() {
    savedZoom = map.getZoom();
}

function createLayerFromZoom(data) {
    if (!ignoreMouseOut) {
        var newZoom = map.getZoom();
        var geoJsonLayerData = { "type": "FeatureCollection" };
        var toSave = function(type) {
            return false;
        };
        if (newZoom >= poiMinZoom) {
            toSave = function(type) {
                return type == "region" ? true : type == "poi" ? true : false
            };
        } else if (newZoom >= regionMinZoom) {
            toSave = function(type) {
                return type == "region" ? true : false;
            };
        } else if (newZoom >= nationZoom) {
            toSave = function(type) {
                return type == "nation" ? true : false;
            };
        }
        var returnData = createLayerFromZoomRec(data, toSave, featureBuffer);
        imageLayersData = returnData[0];
        geoJsonLayerData.features = returnData[1];
        for (var i in featureBuffer) {
            if (featureBuffer[i].properties.background) {
                imageLayersData.push(featureBuffer[i]);
            } else {
                geoJsonLayersData.features.push(featureBuffer[i]);
            }
        }
        featureBuffer = new Array();
        createImageLayers(imageLayersData);
        createGeoJsonLayer(geoJsonLayerData);
    }
}

function getBounds(coordinates) {
    var minLat = bottomRight[1];
    var maxLat = topLeft[1];
    var minLng = bottomRight[0];
    var maxLng = topLeft[0];
    for (var i = 0; i < coordinates.length; i++) {
        if (coordinates[i][1] < minLat) minLat = coordinates[i][1];
        if (coordinates[i][1] > maxLat) maxLat = coordinates[i][1];
        if (coordinates[i][0] < minLng) minLng = coordinates[i][0];
        if (coordinates[i][0] > maxLng) maxLng = coordinates[i][0];
    }
    return [
        [minLat, minLng],
        [maxLat, maxLng]
    ];
}

function createLayerFromZoomRec(data, toSave, ignoreArray) {
    var imageLayerArray = new Array();
    var geoJsonLayerArray = new Array();
    if (data.properties) {
        data.properties.show_on_map = toSave(data.properties.type) && (!ignoreArray || !arrayIncludes(ignoreArray, data));
        if (data.properties.background) {
            var regionBounds = getBounds(data.geometry.coordinates[0]);
            imageLayerArray.push(L.imageOverlay("images/" + data.properties.background, regionBounds));
        } else {
            geoJsonLayerArray.push(data);
        }
        if (data.properties.features && data.properties.features.features) {
            var dataFeatures = data.properties.features.features;
            if (dataFeatures) {
                for (var i in dataFeatures) {
                    var dataFeature = dataFeatures[i];
                    var dataFeatureArr = createLayerFromZoomRec(dataFeature, toSave, ignoreArray);
                    for (var j in dataFeatureArr[0]) {
                        imageLayerArray.push(dataFeatureArr[0][j]);
                    }
                    for (var j in dataFeatureArr[1]) {
                        geoJsonLayerArray.push(dataFeatureArr[1][j]);
                    }
                }
            }
        }
    }
    return [imageLayerArray, geoJsonLayerArray];
}
map.on({
    zoomstart: saveZoom,
    zoomend: function(e) { createLayerFromZoom(nationsData); },
});
var info = L.control();
info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};
info.update = function(props) {
    var innerHTML = '<h4>Empire Location Data</h4>'
    if (props) {
        innerHTML += '<b>' + props.title + '</b>';
        for (var key in props) {
            if (!ignoreList(key)) {
                innerHTML += '<br/>' + key + ': ' + props[key];
            }
        }
    } else {
        innerHTML += 'Hover over a nation'
    }
    this._div.innerHTML = innerHTML;
};

var menuButton = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');;
menuButton.style.backgroundColor = 'white';
menuButton.id = "menuButton";
menuButton.style.width = '30px';
menuButton.style.height = '30px';
menuButton.innerHTML = "<img src='images/menu.png' width='60%' class = 'center'/>";
menuButton.onclick = function() {
    openNav();
}
var myCustomControl = L.Control.extend({

    options: {
        position: 'topleft'
    },

    onAdd: function(map) {
        return menuButton;
    },
});

$(document).on("keydown", function(e) {
    if (e.ctrlKey) {
        isCtrlKeyPressed = true;
    }
    if (e.altKey) {
        isAltKeyPressed = true;
    }
});
$(document).on("keyup", function(e) {
    if (!e.ctrlKey) {
        isCtrlKeyPressed = false;
    }
    if (!e.altKey) {
        isAltKeyPressed = false;
    }
});

function openNav() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.getElementById("map").style.marginLeft = "250px";
    } else {
        document.getElementById("map").style.marginLeft = "250px";
    }
    document.getElementById("menuButton").onclick = closeNav;
}

function closeNav() {
    document.getElementById("map").style.marginLeft = "0";
    document.getElementById("menuButton").onclick = openNav;
}
L.Control.MousePosition = L.Control.extend({
    options: {
        position: 'bottomleft',
        separator: ' : ',
        emptyString: 'Unavailable',
        lngFirst: false,
        numDigits: 5,
        lngFormatter: undefined,
        latFormatter: undefined,
        prefix: ""
    },
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
        L.DomEvent.disableClickPropagation(this._container);
        map.on('mousemove', this._onMouseMove, this);
        this._container.innerHTML = this.options.emptyString;
        return this._container;
    },
    onRemove: function(map) {
        map.off('mousemove', this._onMouseMove)
    },
    _onMouseMove: function(e) {
        var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
        var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
        var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
        var prefixAndValue = this.options.prefix + ' ' + value;
        this._container.innerHTML = prefixAndValue;
    }
});

/* =========== MAIN =========== */

L.Map.mergeOptions({
    positionControl: false
});
L.Map.addInitHook(function() {
    if (this.options.positionControl) {
        this.positionControl = new L.Control.MousePosition();
        this.addControl(this.positionControl);
    }
});
L.control.mousePosition = function(options) {
    return new L.Control.MousePosition(options);
};
L.control.mousePosition().addTo(map);
info.addTo(map);
map.addControl(new myCustomControl());
map.fitBounds(bounds);