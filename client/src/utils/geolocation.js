/**
 * Geolocation & Distance Calculation Utility (Haversine Formula)
 */

// City directory with predefined coordinates for instant lookup
export const CITY_COORDINATES = {
  // India
  'bengaluru': { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, currency: 'INR' },
  'bangalore': { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, currency: 'INR' },
  'hyderabad': { name: 'Hyderabad', country: 'India', lat: 17.3850, lng: 78.4867, currency: 'INR' },
  'mumbai': { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, currency: 'INR' },
  'delhi': { name: 'Delhi NCR', country: 'India', lat: 28.6139, lng: 77.2090, currency: 'INR' },
  'new delhi': { name: 'Delhi NCR', country: 'India', lat: 28.6139, lng: 77.2090, currency: 'INR' },
  'chennai': { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, currency: 'INR' },
  'pune': { name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567, currency: 'INR' },
  'kolkata': { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, currency: 'INR' },
  'ahmedabad': { name: 'Ahmedabad', country: 'India', lat: 23.0225, lng: 72.5714, currency: 'INR' },
  'jaipur': { name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873, currency: 'INR' },
  'kochi': { name: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673, currency: 'INR' },
  
  // United States & Global
  'san francisco': { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194, currency: 'USD' },
  'austin': { name: 'Austin', country: 'United States', lat: 30.2672, lng: -97.7431, currency: 'USD' },
  'seattle': { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321, currency: 'USD' },
  'new york': { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060, currency: 'USD' },
  'los angeles': { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, currency: 'USD' },
  'london': { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, currency: 'GBP' },
  'dubai': { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, currency: 'AED' },
  'singapore': { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, currency: 'SGD' },
  'tokyo': { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, currency: 'JPY' },
};

/**
 * Calculate distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

/**
 * Format distance in a human-friendly label
 */
export function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return '< 1 km away';
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/**
 * Detect default country from system time zone
 */
export function detectDefaultCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('India')) {
      return { country: 'India', city: 'Bengaluru', lat: 12.9716, lng: 77.5946, currency: 'INR' };
    }
  } catch (e) {
    // ignore
  }
  return { country: 'India', city: 'Bengaluru', lat: 12.9716, lng: 77.5946, currency: 'INR' };
}

/**
 * Request user's real browser location
 */
export function requestUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, ...detectDefaultCountry(), reason: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          success: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          country: 'India', // User stated "i am in india"
          source: 'gps',
        });
      },
      (err) => {
        console.warn('Geolocation permission not granted or timeout, using fallback:', err.message);
        resolve({
          success: false,
          ...detectDefaultCountry(),
          reason: err.message,
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

