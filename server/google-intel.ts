/**
 * Google Intel Enrichment Service
 * 
 * Fetches building insights from Solar API and travel data from Distance Matrix API
 * to enrich lead records with Google-sourced data.
 */

import type { GoogleIntel, GoogleBuildingInsights, GoogleTravelInsights } from "@shared/schema";
import { calculateTravelDistance, type DistanceResult } from "./travel-scheduling";
import { log } from "./lib/logger";

// Dispatch location addresses mapping
const DISPATCH_LOCATION_ADDRESSES: Record<string, string> = {
  woodstock: "3272 Rt 212, Bearsville, NY 12409",
  brooklyn: "176 Borinquen Place, Brooklyn, NY 11211",
  troy: "188 1st St, Troy, NY 12180",
};

// Default to Woodstock if no dispatch location specified
const DEFAULT_DISPATCH_LOCATION = "woodstock";

function getDispatchAddress(dispatchLocation?: string): string {
  if (!dispatchLocation) {
    return DISPATCH_LOCATION_ADDRESSES[DEFAULT_DISPATCH_LOCATION];
  }
  const normalized = dispatchLocation.toLowerCase().trim();
  return DISPATCH_LOCATION_ADDRESSES[normalized] || DISPATCH_LOCATION_ADDRESSES[DEFAULT_DISPATCH_LOCATION];
}

function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY;
}

function getGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY;
}

interface GeocodeResult {
  lat: number;
  lng: number;
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = getGoogleMapsApiKey() || getGoogleApiKey();
  if (!apiKey) {
    log("WARN: [Google Intel] No Google API key configured for geocoding");
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
    }
    return null;
  } catch (error) {
    log(`ERROR: Geocoding failed - ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function fetchBuildingInsights(lat: number, lng: number): Promise<GoogleBuildingInsights> {
  const apiKey = getGoogleApiKey() || getGoogleMapsApiKey();
  if (!apiKey) {
    log("WARN: [Google Intel] No Google API key configured for building insights");
    return { available: false, error: "No API key configured" };
  }

  try {
    const url = new URL("https://solar.googleapis.com/v1/buildingInsights:findClosest");
    url.searchParams.set("location.latitude", lat.toString());
    url.searchParams.set("location.longitude", lng.toString());
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`ERROR: Solar API error: ${response.status} - ${errorText}`);
      return { available: false, error: `Solar API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.solarPotential?.roofSegmentStats) {
      return { available: false, error: "No building data found" };
    }

    const roofStats = data.solarPotential.roofSegmentStats;
    const totalRoofArea = roofStats.reduce((sum: number, seg: any) => 
      sum + (seg.stats?.areaMeters2 || 0), 0);
    
    const squareMeters = Math.round(totalRoofArea);
    const squareFeet = Math.round(totalRoofArea * 10.764);

    const maxHeight = data.solarPotential.maxArrayAreaMeters2 
      ? Math.round(Math.sqrt(data.solarPotential.maxArrayAreaMeters2))
      : undefined;

    return {
      available: true,
      squareFeet,
      squareMeters,
      maxRoofHeightFeet: maxHeight ? Math.round(maxHeight * 3.281) : undefined,
      maxRoofHeightMeters: maxHeight,
      roofSegments: roofStats.length,
      imageryDate: data.imageryDate?.date,
      imageryQuality: data.imageryQualityScore,
      coordinates: { lat, lng },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    log(`ERROR: Building insights fetch failed - ${error instanceof Error ? error.message : String(error)}`);
    return { available: false, error: String(error) };
  }
}

function convertDistanceResult(result: DistanceResult): GoogleTravelInsights {
  return {
    available: true,
    origin: result.origin,
    destination: result.destination,
    distanceMiles: result.distanceMiles,
    durationMinutes: result.durationMinutes,
    durationText: result.durationText,
    scenarioType: result.scenario.type,
    scenarioLabel: result.scenario.label,
    fetchedAt: new Date().toISOString(),
  };
}

export async function enrichLeadWithGoogleIntel(
  projectAddress: string,
  dispatchLocation?: string
): Promise<GoogleIntel> {
  const intel: GoogleIntel = {};

  if (!projectAddress) {
    return intel;
  }

  const geocode = await geocodeAddress(projectAddress);
  
  if (geocode) {
    intel.buildingInsights = await fetchBuildingInsights(geocode.lat, geocode.lng);
  } else {
    intel.buildingInsights = { available: false, error: "Could not geocode address" };
  }

  const origin = getDispatchAddress(dispatchLocation);
  const distanceResult = await calculateTravelDistance(projectAddress, origin);
  
  if (distanceResult) {
    intel.travelInsights = convertDistanceResult(distanceResult);
  } else {
    intel.travelInsights = { available: false, error: "Could not calculate travel distance" };
  }

  return intel;
}

export async function refreshGoogleIntel(
  currentIntel: GoogleIntel | null,
  projectAddress: string,
  dispatchLocation?: string,
  forceRefresh: boolean = false
): Promise<GoogleIntel | null> {
  if (!projectAddress) {
    return null;
  }

  const STALE_THRESHOLD_HOURS = 24;
  const now = new Date();

  const isStale = (fetchedAt?: string) => {
    if (!fetchedAt || forceRefresh) return true;
    const fetched = new Date(fetchedAt);
    const hoursDiff = (now.getTime() - fetched.getTime()) / (1000 * 60 * 60);
    return hoursDiff > STALE_THRESHOLD_HOURS;
  };

  const buildingStale = isStale(currentIntel?.buildingInsights?.fetchedAt);
  const travelStale = isStale(currentIntel?.travelInsights?.fetchedAt);

  if (!buildingStale && !travelStale) {
    return null;
  }

  return enrichLeadWithGoogleIntel(projectAddress, dispatchLocation);
}
