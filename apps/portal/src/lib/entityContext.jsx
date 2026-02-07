// ============================================================
// ENTITY / LOCATION CONTEXT
// Multi-location selector for Grand Metropolitan Hotel Group
// ============================================================

import { createContext, useContext, useState, useCallback } from 'react';

// Colour map for location dots (no emoji flags)
const LOCATION_COLORS = {
  ALL: '#6366f1', // indigo
  GB: '#1d4ed8',  // blue
  FR: '#dc2626',  // red
  AE: '#d97706',  // amber
  US: '#047857',  // emerald
  JP: '#7c3aed',  // violet
};

const LOCATIONS = [
  { id: 'all', name: 'All Locations', code: 'ALL', country: null, color: LOCATION_COLORS.ALL, employees: 300 },
  { id: 'london', name: 'London Mayfair', code: 'GB', country: 'United Kingdom', color: LOCATION_COLORS.GB, employees: 108, tag: 'HQ' },
  { id: 'paris', name: 'Paris Champs-Elysees', code: 'FR', country: 'France', color: LOCATION_COLORS.FR, employees: 45 },
  { id: 'dubai', name: 'Dubai Marina', code: 'AE', country: 'UAE', color: LOCATION_COLORS.AE, employees: 62 },
  { id: 'nyc', name: 'New York Central Park', code: 'US', country: 'United States', color: LOCATION_COLORS.US, employees: 47 },
  { id: 'tokyo', name: 'Tokyo Ginza', code: 'JP', country: 'Japan', color: LOCATION_COLORS.JP, employees: 38 },
];

const EntityContext = createContext(null);

export function EntityProvider({ children }) {
  const [selectedLocation, setSelectedLocationState] = useState(LOCATIONS[0]);

  const setSelectedLocation = useCallback((idOrObj) => {
    if (typeof idOrObj === 'string') {
      const found = LOCATIONS.find((l) => l.id === idOrObj);
      if (found) setSelectedLocationState(found);
    } else if (idOrObj && idOrObj.id) {
      // Accept a full location object (backward compat with old setCurrentEntity(entity))
      const found = LOCATIONS.find((l) => l.id === idOrObj.id);
      if (found) setSelectedLocationState(found);
    }
  }, []);

  // Filter helper: filters an array by a location field
  // If "all" is selected, returns all items
  const filterByLocation = useCallback(
    (items, locationKey = 'locationId') => {
      if (!items) return [];
      if (selectedLocation.id === 'all') return items;
      return items.filter((item) => item[locationKey] === selectedLocation.id);
    },
    [selectedLocation]
  );

  // Backward-compatible aliases so existing code using currentEntity still works
  const currentEntity = selectedLocation;
  const setCurrentEntity = setSelectedLocation;
  const entities = LOCATIONS;

  const value = {
    // New API
    selectedLocation,
    setSelectedLocation,
    locations: LOCATIONS,
    filterByLocation,
    locationColors: LOCATION_COLORS,
    // Backward-compatible API
    currentEntity,
    setCurrentEntity,
    entities,
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}

export { LOCATIONS, LOCATION_COLORS };
