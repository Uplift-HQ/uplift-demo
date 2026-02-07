// UK formatting utilities

// Format UK phone number
export const formatUKPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('44')) {
    return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Format temperature in Celsius
export const formatTemperature = (temp: number): string => {
  return `${Math.round(temp)}°C`;
};

// UK regions for reporting (used by reports API)
export const UK_REGIONS = [
  'North West',
  'North East',
  'Yorkshire',
  'West Midlands',
  'East Midlands',
  'South West',
  'South East',
  'London',
  'East Anglia',
  'Scotland',
  'Wales',
  'Northern Ireland',
];
