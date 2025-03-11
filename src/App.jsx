import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import * as toGeoJSON from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';

function App() {
  const [kmlData, setKmlData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [elementSummary, setElementSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [elementDetails, setElementDetails] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const kmlContent = e.target.result;
      setKmlData(kmlContent);
      
      // Parse KML to XML
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
      
      // Convert to GeoJSON
      const geoJson = toGeoJSON.kml(kmlDoc);
      setGeoJsonData(geoJson);
      
      // Process data for summary and details
      processKmlData(geoJson);
    };
    reader.readAsText(file);
  };

  const processKmlData = (geoJson) => {
    // Count elements by type
    const elementCounts = {};
    let totalElements = 0;
    
    // Element details with lengths
    const details = [];
    
    if (geoJson && geoJson.features) {
      geoJson.features.forEach(feature => {
        const type = feature.geometry.type;
        elementCounts[type] = (elementCounts[type] || 0) + 1;
        totalElements++;
        
        // Calculate length for line elements
        if (type === 'LineString' || type === 'MultiLineString') {
          const length = calculateLength(feature);
          details.push({
            type: type,
            name: feature.properties.name || 'Unnamed',
            length: length.toFixed(2)
          });
        } else {
          details.push({
            type: type,
            name: feature.properties.name || 'Unnamed',
            length: 'N/A'
          });
        }
      });
    }
    
    setElementSummary({ counts: elementCounts, total: totalElements });
    setElementDetails(details);
  };
  
  const calculateLength = (feature) => {
    // Simple length calculation for lines
    // For a production app, use a geodesic calculation library
    let length = 0;
    
    if (feature.geometry.type === 'LineString') {
      const coordinates = feature.geometry.coordinates;
      for (let i = 1; i < coordinates.length; i++) {
        const [x1, y1] = coordinates[i-1];
        const [x2, y2] = coordinates[i];
        // Euclidean distance as simplification
        const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        length += segmentLength;
      }
    } else if (feature.geometry.type === 'MultiLineString') {
      feature.geometry.coordinates.forEach(line => {
        for (let i = 1; i < line.length; i++) {
          const [x1, y1] = line[i-1];
          const [x2, y2] = line[i];
          const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          length += segmentLength;
        }
      });
    }
    
    return length;
  };

  return (
    <div className="app-container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>KML File Viewer</h1>
      
      <div className="upload-section" style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept=".kml"
          onChange={handleFileUpload}
          style={{ marginBottom: '10px' }}
        />
        
        {geoJsonData && (
          <div className="buttons" style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => { setShowSummary(true); setShowDetails(false); }}
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              Summary
            </button>
            <button 
              onClick={() => { setShowDetails(true); setShowSummary(false); }}
              style={{ padding: '8px 16px' }}
            >
              Detailed
            </button>
          </div>
        )}
      </div>
      
      {showSummary && elementSummary && (
        <div className="summary-section" style={{ marginBottom: '20px' }}>
          <h2>KML Summary</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Element Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(elementSummary.counts).map(([type, count]) => (
                <tr key={type}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{type}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{count}</td>
                </tr>
              ))}
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Total</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{elementSummary.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      
      {showDetails && elementDetails.length > 0 && (
        <div className="details-section" style={{ marginBottom: '20px' }}>
          <h2>KML Details</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Element Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Length</th>
              </tr>
            </thead>
            <tbody>
              {elementDetails.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.type}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {geoJsonData && (
        <div className="map-container" style={{ height: '500px', marginTop: '20px' }}>
          <MapContainer 
            center={[0, 0]} 
            zoom={2} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <GeoJSON data={geoJsonData} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}

export default App;