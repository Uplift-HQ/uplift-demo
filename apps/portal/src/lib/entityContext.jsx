// ============================================================
// ENTITY / LOCATION CONTEXT
// Multi-location selector - fetches real locations from API
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { locationsApi } from './api';

// Colour palette for location dots (cycles through)
const LOCATION_COLORS = {
  ALL: '#6366f1', // indigo
  DEFAULT: ['#1d4ed8', '#dc2626', '#d97706', '#047857', '#7c3aed', '#0891b2', '#be185d', '#4f46e5'],
};

// Default "All Locations" entry
const ALL_LOCATIONS_ENTRY = { id: 'all', name: 'All Locations', code: 'ALL', country: null, color: LOCATION_COLORS.ALL, employees: 0 };

const EntityContext = createContext(null);

export function EntityProvider({ children }) {
  const [locations, setLocations] = useState([ALL_LOCATIONS_ENTRY]);
  const [selectedLocation, setSelectedLocationState] = useState(ALL_LOCATIONS_ENTRY);
  const [loading, setLoading] = useState(true);

  // Fetch locations from API on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const result = await locationsApi.list();
        if (result.locations && result.locations.length > 0) {
          // Map API locations to context format with colors
          const apiLocations = result.locations.map((loc, idx) => ({
            id: loc.id,
            name: loc.name,
            code: loc.code || loc.country_code || 'XX',
            country: loc.country || loc.address?.country || null,
            color: LOCATION_COLORS.DEFAULT[idx % LOCATION_COLORS.DEFAULT.length],
            employees: loc.employee_count || 0,
            tag: idx === 0 ? 'Primary' : undefined,
          }));
          // Calculate total employees for "All"
          const totalEmployees = apiLocations.reduce((sum, l) => sum + (l.employees || 0), 0);
          const allEntry = { ...ALL_LOCATIONS_ENTRY, employees: totalEmployees };
          setLocations([allEntry, ...apiLocations]);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load locations for entity context:', err);
        // Keep the default "All Locations" entry
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []);

  const setSelectedLocation = useCallback((idOrObj) => {
    if (typeof idOrObj === 'string') {
      const found = locations.find((l) => l.id === idOrObj);
      if (found) setSelectedLocationState(found);
    } else if (idOrObj && idOrObj.id) {
      // Accept a full location object (backward compat with old setCurrentEntity(entity))
      const found = locations.find((l) => l.id === idOrObj.id);
      if (found) setSelectedLocationState(found);
    }
  }, [locations]);

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
  const entities = locations;

  const value = {
    // New API
    selectedLocation,
    setSelectedLocation,
    locations,
    filterByLocation,
    locationColors: LOCATION_COLORS,
    loading,
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

// Export for backward compatibility (now dynamic, starts empty)
export const LOCATIONS = [ALL_LOCATIONS_ENTRY];
export { LOCATION_COLORS };
