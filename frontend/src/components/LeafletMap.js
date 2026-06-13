import React from 'react';
import { StyleSheet, View, Linking } from 'react-native';

export default function LeafletMap({ latitude = 13.0827, longitude = 80.2707, onLocationConfirm, readOnly = false, issues = [] }) {
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>SmartFix Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        #map { height: 100%; width: 100%; }

        .confirm-btn {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          z-index: 1000; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: bold;
          border-radius: 12px; cursor: pointer; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          transition: all 0.2s ease; display: ${readOnly ? 'none' : 'block'};
        }
        .confirm-btn:active { transform: translateX(-50%) scale(0.95); opacity: 0.9; }

        .gmaps-btn {
          position: absolute; bottom: ${readOnly ? '16px' : '74px'}; right: 14px;
          z-index: 1000; background-color: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.10); padding: 9px 16px; font-size: 12px; font-weight: 700;
          border-radius: 10px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          color: #1f2937; display: flex; align-items: center; gap: 6px;
          transition: all 0.2s ease;
        }
        .gmaps-btn:hover { background-color: #f9fafb; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .gmaps-btn:active { transform: scale(0.97); }

        .info-bubble {
          position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
          z-index: 1000; background-color: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0,0,0,0.06); padding: 7px 16px; border-radius: 20px;
          color: #1f2937; font-size: 11px; font-weight: 600; pointer-events: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06); text-align: center; white-space: nowrap;
          display: ${readOnly ? 'none' : 'block'};
        }

        .coords-badge {
          position: absolute; bottom: ${readOnly ? '60px' : '130px'}; left: 12px;
          z-index: 1000; background-color: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(255,255,255,0.12); padding: 7px 12px; border-radius: 10px;
          font-size: 10px; font-weight: 700; color: #e2e8f0;
          font-family: monospace; line-height: 1.6;
          display: ${readOnly ? 'block' : 'none'};
        }

        .leaflet-bar { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
        .leaflet-bar a { background-color: #ffffff !important; color: #1f2937 !important; border-bottom: 1px solid #e5e7eb !important; }
        .leaflet-bar a:hover { background-color: #f3f4f6 !important; }
      </style>
    </head>
    <body>
      ${readOnly ? '' : '<div class="info-bubble">Drag pin to confirm complaint spot</div>'}
      <div id="map"></div>
      <button class="gmaps-btn" onclick="openGoogleMaps()">Open in Google Maps</button>
      ${readOnly ? '' : '<button class="confirm-btn" onclick="submitCoords()">Confirm Location</button>'}
      <div class="coords-badge" id="coordsBadge">
        LAT: ${latitude.toFixed(6)}<br/>LNG: ${longitude.toFixed(6)}
      </div>

      <script>
        const map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 16);
        L.control.zoom({ position: 'topleft' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CartoDB',
          maxZoom: 19
        }).addTo(map);

        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [28, 46],
          iconAnchor: [14, 46],
          popupAnchor: [1, -38],
          shadowSize: [46, 46]
        });

        let currentLat = ${latitude};
        let currentLng = ${longitude};

        const issuesData = ${JSON.stringify(issues || [])};
        
        if (issuesData && issuesData.length > 0) {
          const getMarkerIcon = (status) => {
            const s = (status || '').toLowerCase();
            let color = 'red';
            if (['resolved', 'done'].includes(s)) color = 'green';
            else if (s === 'scheduled') color = 'orange';
            else if (s === 'in progress') color = 'blue';
            else if (['assigned', 'escalated'].includes(s)) color = 'violet';
            
            return L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
          };

          const bounds = [];
          issuesData.forEach(issue => {
            if (issue.latitude && issue.longitude) {
              const m = L.marker([issue.latitude, issue.longitude], {
                icon: getMarkerIcon(issue.status)
              }).addTo(map);
              
              const refId = issue._id ? 'SF-' + issue._id.substring(issue._id.length - 6).toUpperCase() : 'SF-NEW';
              const popupContent = '<div style="font-family: sans-serif; padding: 4px; font-size: 12px; line-height: 1.4;">' +
                '<strong style="color: #4f46e5;">Ref: ' + refId + '</strong><br/>' +
                '<strong>Category:</strong> ' + (issue.category || '').toUpperCase() + '<br/>' +
                '<strong>Status:</strong> ' + (issue.status || '').toUpperCase() + '<br/>' +
                '<strong>Desc:</strong> ' + (issue.description || '').substring(0, 50) + '...' +
                '</div>';
              m.bindPopup(popupContent);
              bounds.push([issue.latitude, issue.longitude]);
            }
          });

          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [30, 30] });
          }
        } else {
          const marker = L.marker([${latitude}, ${longitude}], {
            draggable: ${!readOnly},
            icon: customIcon
          }).addTo(map);

          ${!readOnly ? `
          marker.on('dragend', function (e) {
            const latlng = marker.getLatLng();
            currentLat = latlng.lat;
            currentLng = latlng.lng;
            map.panTo(latlng);
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            currentLat = e.latlng.lat;
            currentLng = e.latlng.lng;
            map.panTo(e.latlng);
          });
          ` : ''}
        }

        function submitCoords() {
          const coords = { latitude: currentLat, longitude: currentLng };
          window.ReactNativeWebView.postMessage(JSON.stringify(coords));
        }

        function openGoogleMaps() {
          const msg = { action: 'openGoogleMaps', latitude: currentLat, longitude: currentLng };
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.action === 'openGoogleMaps') {
        const url = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
        Linking.openURL(url);
      } else if (data && data.latitude && data.longitude && onLocationConfirm) {
        onLocationConfirm(data.latitude, data.longitude);
      }
    } catch (e) {
      // Ignore
    }
  };

  const { WebView } = require('react-native-webview');

  return (
    <View style={readOnly ? styles.readOnlyContainer : styles.mobileContainer}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        onMessage={handleMessage}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden'
  },
  readOnlyContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden'
  }
});
