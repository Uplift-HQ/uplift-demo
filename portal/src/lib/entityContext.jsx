import { createContext, useContext, useState } from 'react';

const entities = [
  { id: 'gm-uk', name: 'Grand Metro Hotels - UK', flag: '🇬🇧', employees: 108, tag: 'HQ' },
  { id: 'gm-de', name: 'Grand Metro Hotels - Germany', flag: '🇩🇪', employees: 45, tag: null },
  { id: 'gm-ae', name: 'Grand Metro Hotels - Dubai', flag: '🇦🇪', employees: 62, tag: null },
  { id: 'gm-sg', name: 'Grand Metro Hotels - Singapore', flag: '🇸🇬', employees: 38, tag: null },
  { id: 'gm-us', name: 'Grand Metro Hotels - USA', flag: '🇺🇸', employees: 47, tag: null },
];

const EntityContext = createContext();

export function EntityProvider({ children }) {
  const [currentEntity, setCurrentEntity] = useState(entities[0]);
  return (
    <EntityContext.Provider value={{ currentEntity, setCurrentEntity, entities }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
