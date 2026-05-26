App.map = {};

(function (m) {
    var map, streetLayer, satLayer, labelLayer;
    var drawingVertexMarkers = [];

    m.init = function () {
        map = L.map('map', { zoomControl: false }).setView([37.3885, -5.6263], 16);
        L.control.zoom({ position: 'topright' }).addTo(map);

        streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20, attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
            detectRetina: true
        });

        satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 20, attribution: '&copy; <a href="https://esri.com">Esri</a>'
        }).addTo(map);

        labelLayer = L.tileLayer('https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            maxZoom: 20, attribution: '&copy; <a href="https://carto.com">CARTO</a>',
            detectRetina: true
        }).addTo(map);

        App.state.isSatellite = true;

        L.control.layers({
            'Satélite': satLayer,
            'Mapa': streetLayer
        }, {
            'Nombres': labelLayer
        }, { position: 'bottomleft' }).addTo(map);

        App.state.streetLayer = streetLayer;
        App.state.satLayer = satLayer;

        App.state.map = map;
        App.state.labelLayer = labelLayer;
        map.on('click', onMapClick);

        var satBtn = document.getElementById('btn-satellite');
        if (satBtn) {
            satBtn.classList.add('active');
            satBtn.textContent = '🔲';
            satBtn.title = 'Cambiar a mapa';
        }
    };

    function onMapClick(e) {
        if (App.state.drawingMode === 'recuadro' || App.state.drawingMode === 'zona') {
            var v = App.state.drawingVertices;
            var clickPixel = map.latLngToContainerPoint(e.latlng);
            var nearVertex = false;
            for (var i = 0; i < v.length; i++) {
                if (map.latLngToContainerPoint(v[i]).distanceTo(clickPixel) < 15) {
                    nearVertex = true;
                    if (i === 0 && v.length >= 3) {
                        if (App.state.drawingMode === 'zona') { finishZoneDrawing(); showModals(); }
                        else finishDrawing();
                        return;
                    }
                    break;
                }
            }
            if (nearVertex) return;
            App.state.drawingVertices.push(e.latlng);
            updateDrawingPreview();
            App.ui.showToast(
                App.state.drawingVertices.length + ' v\u00e9rtice' +
                (App.state.drawingVertices.length > 1 ? 's' : '') +
                ' (clic en inicio para cerrar)'
            );
            return;
        }
        if (App.state.drawingMode === 'marcador') {
            placeMarker(e.latlng);
            return;
        }
        if (App.state.selectingZone) {
            if (App.state.zoneMarker) map.removeLayer(App.state.zoneMarker);
            App.state.zoneMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
            document.getElementById('cf-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('cf-lng').value = e.latlng.lng.toFixed(6);
            App.state.zoneMarker.on('dragend', function () {
                var pos = App.state.zoneMarker.getLatLng();
                document.getElementById('cf-lat').value = pos.lat.toFixed(6);
                document.getElementById('cf-lng').value = pos.lng.toFixed(6);
            });
            App.ui.showToast('Ubicaci\u00f3n seleccionada. Arrastra para ajustar.');
            App.state.selectingZone = false;
            return;
        }
        if (App.state.placingPoint) {
            var icon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background:#2d5a27;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
                iconSize: [20, 20], iconAnchor: [10, 10]
            });
            if (App.state.pointMarker) map.removeLayer(App.state.pointMarker);
            App.state.pointMarker = L.marker(e.latlng, { icon: icon, draggable: true }).addTo(map);
            document.getElementById('ap-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('ap-lng').value = e.latlng.lng.toFixed(6);
            App.state.pointMarker.on('dragend', function () {
                var pos = App.state.pointMarker.getLatLng();
                document.getElementById('ap-lat').value = pos.lat.toFixed(6);
                document.getElementById('ap-lng').value = pos.lng.toFixed(6);
            });
            App.ui.showToast('Punto colocado. Arrastra para ajustar.');
            App.state.placingPoint = false;
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('modal-add-point').style.display = 'block';
            return;
        }
    }

    function updateDrawingPreview() {
        removeDrawingPreview();
        var v = App.state.drawingVertices;
        if (!v.length) return;

        drawingVertexMarkers = v.map(function (latlng, i) {
            var isFirst = i === 0;
            var circle = L.circleMarker(latlng, {
                radius: isFirst ? 9 : 7,
                color: '#2d5a27',
                fillColor: isFirst ? '#2d5a27' : 'white',
                fillOpacity: isFirst ? 0.85 : 1,
                weight: 3
            }).addTo(map);
            var label = i === 0 && v.length >= 3 ? '⬤ Cerrar' : (i + 1).toString();
            circle.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10], className: 'vertex-tooltip' });
            return circle;
        });

        if (v.length >= 2) {
            App.state.drawingPolyline = L.polyline(v, {
                color: '#2d5a27', weight: 3, dashArray: '8, 6'
            }).addTo(map);
        }
    }

    function removeDrawingPreview() {
        drawingVertexMarkers.forEach(function (c) { map.removeLayer(c); });
        drawingVertexMarkers = [];
        if (App.state.drawingPolyline) {
            if (App.state.drawingPolyline._vertexMarkers) {
                App.state.drawingPolyline._vertexMarkers.forEach(function (c) { map.removeLayer(c); });
            }
            map.removeLayer(App.state.drawingPolyline);
            App.state.drawingPolyline = null;
        }
    }

    function placeMarker(latlng) {
        if (App.state.placingMarker) map.removeLayer(App.state.placingMarker);
        var icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#2d5a27;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
            iconSize: [20, 20], iconAnchor: [10, 10]
        });
        App.state.placingMarker = L.marker(latlng, { icon: icon, draggable: true }).addTo(map);
        App.ui.showPointForm('marcador', latlng);
        App.state.drawingMode = null;
    }

    function finishDrawing() {
        var v = App.state.drawingVertices;
        if (v.length < 3) {
            App.ui.showToast('Necesitas al menos 3 puntos para crear un recuadro (tienes ' + v.length + ')');
            return;
        }
        removeDrawingPreview();
        var group = L.featureGroup();
        var polygon = L.polygon(v, {
            color: '#2d5a27', weight: 3, fillColor: '#2d5a27', fillOpacity: 0.3
        }).addTo(group);
        var vertexMarkers = [];
        v.forEach(function (latlng) {
            vertexMarkers.push(L.marker(latlng, {
                draggable: true,
                icon: L.divIcon({
                    className: '',
                    html: '<div style="width:12px;height:12px;border-radius:50%;background:white;border:3px solid #2d5a27;cursor:grab"></div>',
                    iconSize: [12, 12], iconAnchor: [6, 6]
                })
            }).addTo(group));
        });
        function onVertexDrag() {
            var newLatLngs = vertexMarkers.map(function (m) { return m.getLatLng(); });
            polygon.setLatLngs(newLatLngs);
            document.getElementById('pf-coords').value = JSON.stringify(
                newLatLngs.map(function (ll) { return { lat: ll.lat, lng: ll.lng }; })
            );
        }
        vertexMarkers.forEach(function (m) { m.on('drag', onVertexDrag); });
        group.addTo(map);
        App.state.placingMarker = group;
        App.ui.showPointForm('recuadro', v);
        App.state.drawingMode = null;
        App.state.drawingVertices = [];
    }

    function cancelDrawing() {
        removeDrawingPreview();
        if (App.state.placingMarker) { map.removeLayer(App.state.placingMarker); App.state.placingMarker = null; }
        App.state.drawingVertices = [];
        App.state.drawingMode = null;
        map.off('dblclick', onMapDblClick);
        map.getContainer().style.cursor = '';
        App.ui.hidePointForm();
    }

    function onMapDblClick(e) {
        e.originalEvent.preventDefault();
        if (App.state.drawingMode === 'recuadro' || App.state.drawingMode === 'zona') {
            if (App.state.drawingVertices.length >= 3) {
                if (App.state.drawingMode === 'zona') { finishZoneDrawing(); showModals(); }
                else finishDrawing();
            } else {
                App.ui.showToast('A\u00f1ade al menos 3 v\u00e9rtices (tienes ' + App.state.drawingVertices.length + ')');
            }
        }
    }

    function showModals() {
        setTimeout(function () {
            document.querySelectorAll('#modal-login, #modal-register, #modal-create-fair, #modal-add-point, #modal-delete-confirm, #modal-admin, #modal-settings').forEach(function (e) { e.style.display = 'none'; });
            document.getElementById('modal-create-fair').style.display = 'block';
            document.getElementById('modal-overlay').style.display = 'flex';
        }, 100);
    }

    function finishZoneDrawing() {
        var v = App.state.drawingVertices;
        removeDrawingPreview();
        var zoneColor = document.getElementById('cf-color').value || '#e74c3c';
        var polygon = L.polygon(v, { color: zoneColor, weight: 4, fillColor: zoneColor, fillOpacity: 0 });
        var center = polygon.getBounds().getCenter();
        var group = L.featureGroup();
        polygon.addTo(group);
        var vertexMarkers = [];
        v.forEach(function (latlng) {
            vertexMarkers.push(L.marker(latlng, {
                draggable: true,
                icon: L.divIcon({
                    className: '',
                    html: '<div style="width:12px;height:12px;border-radius:50%;background:white;border:3px solid ' + zoneColor + ';cursor:grab"></div>',
                    iconSize: [12, 12], iconAnchor: [6, 6]
                })
            }).addTo(group));
        });
        function onVertexDrag() {
            var newLatLngs = vertexMarkers.map(function (m) { return m.getLatLng(); });
            polygon.setLatLngs(newLatLngs);
            var json = JSON.stringify(newLatLngs.map(function (ll) { return { lat: ll.lat, lng: ll.lng }; }));
            document.getElementById('cf-zona').value = json;
            var newCenter = polygon.getBounds().getCenter();
            document.getElementById('cf-lat').value = newCenter.lat.toFixed(6);
            document.getElementById('cf-lng').value = newCenter.lng.toFixed(6);
        }
        vertexMarkers.forEach(function (m) { m.on('drag', onVertexDrag); });
        group.addTo(map);
        if (App.state.zonePreviewGroup) { map.removeLayer(App.state.zonePreviewGroup); }
        App.state.zonePreviewGroup = group;
        document.getElementById('cf-zona').value = JSON.stringify(v.map(function (c) { return { lat: c.lat, lng: c.lng }; }));
        document.getElementById('cf-lat').value = center.lat.toFixed(6);
        document.getElementById('cf-lng').value = center.lng.toFixed(6);
        document.getElementById('cf-zona-status').textContent = '\u2705 Zona definida (' + v.length + ' v\u00e9rtices)';
        document.getElementById('cf-zona-status').style.color = '#28a745';
        map.fitBounds(polygon.getBounds().pad(0.3));
        App.ui.showToast('Zona de la feria definida');
        App.state.drawingMode = null;
        App.state.drawingVertices = [];
        map.off('dblclick', onMapDblClick);
        map.getContainer().style.cursor = '';
    }

    m.startDrawingRecuadro = function () {
        m.setMoveMode(false);
        cancelDrawing();
        App.state.drawingMode = 'recuadro';
        App.state.drawingVertices = [];
        map.on('dblclick', onMapDblClick);
        map.getContainer().style.cursor = 'crosshair';
        App.ui.showToast('Haz clic para a\u00f1adir v\u00e9rtices. Doble clic para cerrar.');
    };

    m.startZoneDrawing = function () {
        cancelDrawing();
        if (App.state.zonePreviewGroup) { map.removeLayer(App.state.zonePreviewGroup); App.state.zonePreviewGroup = null; }
        document.getElementById('cf-zona').value = '';
        document.getElementById('cf-zona-status').textContent = 'Dibuja un recuadro delimitando el \u00e1rea de la feria';
        document.getElementById('cf-zona-status').style.color = '#999';
        App.state.drawingMode = 'zona';
        App.state.drawingVertices = [];
        map.on('dblclick', onMapDblClick);
        map.getContainer().style.cursor = 'crosshair';
        App.ui.showToast('Dibuja la zona: clic para v\u00e9rtices, doble clic para cerrar');
    };

    m.renderZone = function (zonaJson, color) {
        m.clearZone();
        if (!zonaJson) return;
        color = color || '#e74c3c';
        try {
            var coords = JSON.parse(zonaJson);
            if (!Array.isArray(coords) || coords.length < 3) return;
            var latlngs = coords.map(function (c) { return [parseFloat(c.lat), parseFloat(c.lng)]; });
            var group = L.featureGroup();
            var poly = L.polygon(latlngs, {
                color: color, weight: 5, fillColor: color, fillOpacity: 0, dashArray: '6, 4'
            }).addTo(group);
            poly.bindTooltip(App.state._currentFairName || 'Zona de la feria', { sticky: true });
            latlngs.forEach(function (ll) {
                L.circleMarker(ll, { radius: 5, color: color, fillColor: 'white', fillOpacity: 1, weight: 2 }).addTo(group);
            });
            group.addTo(map);
            map.fitBounds(poly.getBounds().pad(0.2));
            App.state.zoneGroup = group;
        } catch (e) { console.error('zone parse error', e); }
    };

    m.clearZone = function () {
        if (App.state.zoneGroup) { map.removeLayer(App.state.zoneGroup); App.state.zoneGroup = null; }
    };

    function updateMoveButton() {
        var btn = document.getElementById('btn-move-points');
        if (!btn) return;
        btn.classList.toggle('active', !!App.state.movingPointsMode);
        btn.textContent = App.state.movingPointsMode ? 'Terminar mover' : 'Mover puntos';
    }

    function pointCoords(latlng) {
        return {
            lat: parseFloat(latlng.lat.toFixed(7)),
            lng: parseFloat(latlng.lng.toFixed(7))
        };
    }

    function recuadroCoords(latlngs) {
        return latlngs.map(function (ll) { return pointCoords(ll); });
    }

    function savePointCoordinates(punto, coordenadas, message) {
        App.api.updatePoint({
            id_punto: parseInt(punto.id_punto, 10),
            coordenadas: JSON.stringify(coordenadas)
        }).then(function (res) {
            if (res.success) {
                punto.coordenadas = JSON.stringify(coordenadas);
                if (punto.tipo_geometria === 'marcador') {
                    punto.latitud = coordenadas.lat;
                    punto.longitud = coordenadas.lng;
                }
                App.ui.showToast(message || 'Ubicaci\u00f3n guardada');
                App.ui.loadFairs();
            } else {
                App.ui.showToast(res.message || 'No se pudo guardar la ubicaci\u00f3n');
                m.renderPoints();
            }
        }).catch(function () {
            App.ui.showToast('Error al guardar la ubicaci\u00f3n');
            m.renderPoints();
        });
    }

    m.setMoveMode = function (enabled) {
        enabled = !!enabled;
        if (enabled && !App.state.editMode) {
            App.ui.showToast('Activa la edici\u00f3n de un mapa primero');
            return;
        }
        if (App.state.movingPointsMode === enabled) {
            updateMoveButton();
            return;
        }
        App.state.movingPointsMode = enabled;
        updateMoveButton();
        if (App.state.points && App.state.points.length) m.renderPoints();
    };

    m.toggleMoveMode = function () {
        if (App.state.movingPointsMode) {
            m.setMoveMode(false);
            App.ui.showToast('Modo mover desactivado');
            return;
        }
        cancelDrawing();
        m.setMoveMode(true);
        App.ui.showToast('Arrastra marcadores o recuadros para moverlos');
    };

    m.startPlacingMarker = function () {
        m.setMoveMode(false);
        cancelDrawing();
        App.state.drawingMode = 'marcador';
        map.getContainer().style.cursor = 'crosshair';
        App.ui.showToast('Haz clic en el mapa para colocar el marcador.');
    };

    m.confirmDrawing = finishDrawing;
    m.cancelDrawing = cancelDrawing;

    m.flyTo = function (lat, lng, zoom) {
        map.setView([parseFloat(lat), parseFloat(lng)], parseInt(zoom) || 16);
    };

    var _locationMarker = null;

    m.goToMyLocation = function () {
        if (!navigator.geolocation) { App.ui.showToast('Geolocalizaci\u00f3n no disponible'); return; }
        var btn = document.getElementById('btn-my-location');
        if (btn) btn.classList.add('active');
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                if (btn) btn.classList.remove('active');
                var lat = pos.coords.latitude, lng = pos.coords.longitude;
                if (_locationMarker) map.removeLayer(_locationMarker);
                var icon = L.divIcon({
                    className: '',
                    html: '<div class="my-location-dot"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                _locationMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 9999 }).addTo(map);
                map.setView([lat, lng], 17);
            },
            function () {
                if (btn) btn.classList.remove('active');
                App.ui.showToast('No se pudo obtener tu ubicaci\u00f3n');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    m.clearAll = function () {
        App.state.markers.forEach(function (m) { map.removeLayer(m.objeto); });
        App.state.recuadros.forEach(function (r) { map.removeLayer(r); });
        App.state.markers = [];
        App.state.recuadros = [];
    };

    function normalizeCat(cat) {
        if (!cat) return '';
        var idx = cat.indexOf('_');
        if (idx === -1) return cat;
        var prefix = cat.substring(0, idx);
        return App.consts.COLORS[prefix] !== undefined ? prefix : cat;
    }

    function getColor(cat) {
        var base = normalizeCat(cat);
        return App.consts.COLORS[base] || App.consts.COLORS[cat] || '#007bff';
    }

    function getPointEmoji(punto) {
        if (punto.sinopsis) {
            var em = punto.sinopsis.match(/^EMOJI:([^\n]+)\n?/);
            if (em) return em[1].trim();
        }
        var cat = punto.categoria || '';
        return App.consts.EMOJIS[cat] || App.consts.EMOJIS[normalizeCat(cat)] || '📍';
    }

    m.renderPoints = function () {
        m.clearAll();
        var moveMode = App.state.editMode && App.state.movingPointsMode;
        App.state.points.forEach(function (punto) {
            var color = getColor(punto.categoria);

            if (punto.tipo_geometria === 'recuadro') {
                try {
                    var coords = JSON.parse(punto.coordenadas);
                    if (Array.isArray(coords) && coords.length >= 3) {
                        var latlngs = coords.map(function (c) {
                            return L.latLng(parseFloat(c.lat), parseFloat(c.lng));
                        });
                        var group = L.featureGroup();
                        var poly = L.polygon(latlngs, {
                            color: color, weight: 4, fillColor: color, fillOpacity: 0.3
                        }).addTo(group);
                        poly.bindTooltip('<b>' + App.ui.escapeHtml(punto.nombre) + '</b>', { permanent: false, direction: 'center' });
                        poly.bindPopup(App.ui.buildPopupHtml(punto));
                        var centroid = poly.getBounds().getCenter();
                        var recEmoji = getPointEmoji(punto);
                        var labelMarker = L.marker(centroid, {
                            icon: L.divIcon({
                                className: '',
                                html: '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="background:' + color + ';width:42px;height:42px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:20px;color:white;font-weight:bold">' + recEmoji + '</div><div style="background:' + color + ';color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)">' + App.ui.escapeHtml(punto.nombre) + '</div></div>',
                                iconSize: [42, 62], iconAnchor: [21, 31]
                            }),
                            draggable: moveMode
                        }).addTo(group).bindPopup(App.ui.buildPopupHtml(punto)).on('popupopen', function () {
                            App.ui.loadPopupResenas(punto.id_punto, punto.promedio, punto.num_resenas);
                        });
                        if (moveMode) {
                            var currentLatLngs = latlngs.slice();
                            var lastCenter = centroid;
                            var vertexIcon = L.divIcon({
                                className: '',
                                html: '<div style="width:12px;height:12px;border-radius:50%;background:white;border:3px solid ' + color + ';cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
                                iconSize: [12, 12], iconAnchor: [6, 6]
                            });
                            var vertexMarkers = currentLatLngs.map(function (ll) {
                                return L.marker(ll, { draggable: true, icon: vertexIcon }).addTo(group);
                            });

                            function setRecuadroLatLngs(newLatLngs, syncLabel) {
                                currentLatLngs = newLatLngs;
                                poly.setLatLngs(currentLatLngs);
                                vertexMarkers.forEach(function (vm, i) { vm.setLatLng(currentLatLngs[i]); });
                                if (syncLabel) {
                                    lastCenter = poly.getBounds().getCenter();
                                    labelMarker.setLatLng(lastCenter);
                                }
                            }

                            vertexMarkers.forEach(function (vm) {
                                vm.on('drag', function () {
                                    currentLatLngs = vertexMarkers.map(function (marker) { return marker.getLatLng(); });
                                    poly.setLatLngs(currentLatLngs);
                                    lastCenter = poly.getBounds().getCenter();
                                    labelMarker.setLatLng(lastCenter);
                                });
                                vm.on('dragend', function () {
                                    savePointCoordinates(punto, recuadroCoords(currentLatLngs), 'Recuadro actualizado');
                                });
                            });

                            labelMarker.on('dragstart', function () { labelMarker.closePopup(); });
                            labelMarker.on('drag', function () {
                                var nextCenter = labelMarker.getLatLng();
                                var deltaLat = nextCenter.lat - lastCenter.lat;
                                var deltaLng = nextCenter.lng - lastCenter.lng;
                                setRecuadroLatLngs(currentLatLngs.map(function (ll) {
                                    return L.latLng(ll.lat + deltaLat, ll.lng + deltaLng);
                                }), false);
                                lastCenter = nextCenter;
                            });
                            labelMarker.on('dragend', function () {
                                savePointCoordinates(punto, recuadroCoords(currentLatLngs), 'Recuadro movido');
                            });
                        }
                        group.addTo(map);
                        App.state.recuadros.push(group);
                        App.state.markers.push({
                            objeto: group, categoria: punto.categoria, id: punto.id_punto
                        });
                    }
                } catch (e) { console.error('recuadro parse error', e); }
            } else {
                if (!punto.latitud || !punto.longitud) return;
                var mkrEmoji = getPointEmoji(punto);
                var icon = L.divIcon({
                    className: '',
                    html: '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="background:' + color + ';width:42px;height:42px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:20px;color:white;font-weight:bold">' + mkrEmoji + '</div><div style="background:' + color + ';color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)">' + App.ui.escapeHtml(punto.nombre) + '</div></div>',
                    iconSize: [42, 62], iconAnchor: [21, 31], popupAnchor: [0, -32]
                });
                var marker = L.marker([parseFloat(punto.latitud), parseFloat(punto.longitud)], { icon: icon, draggable: moveMode }).addTo(map);
                marker.bindPopup(App.ui.buildPopupHtml(punto));
                marker.on('popupopen', function () {
                    App.ui.loadPopupResenas(punto.id_punto, punto.promedio, punto.num_resenas);
                });
                if (moveMode) {
                    marker.on('dragstart', function () { marker.closePopup(); });
                    marker.on('dragend', function () {
                        savePointCoordinates(punto, pointCoords(marker.getLatLng()), 'Marcador movido');
                    });
                }
                App.state.markers.push({
                    objeto: marker, categoria: punto.categoria, id: punto.id_punto
                });
            }
        });
        var activeFilter = document.querySelector('#filter-bar .active');
        if (activeFilter && activeFilter.dataset.cat !== 'todos') {
            m.filtrar(activeFilter.dataset.cat);
        }
    };

    var FILTER_CATEGORIES = ['caseta', 'cacharrito', 'puesto', 'ba\u00F1o', 'estacionamiento', 'otro'];

    m.filtrar = function (cat) {
        App.state.markers.forEach(function (mk) {
            var norm = normalizeCat(mk.categoria);
            var inFilter = FILTER_CATEGORIES.indexOf(norm) !== -1;
            if (cat === 'todos' || norm === cat || !inFilter) {
                map.addLayer(mk.objeto);
            } else {
                map.removeLayer(mk.objeto);
            }
        });
        document.querySelectorAll('#filter-bar button').forEach(function (b) {
            b.classList.toggle('active', b.dataset.cat === cat);
        });
    };
})(App.map);
