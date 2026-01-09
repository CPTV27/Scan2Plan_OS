import { getCalendarClient } from "./google-clients";
import type { Project, Scantech } from "@shared/schema";

// Note: Read env vars at runtime, not module initialization, to ensure secrets are loaded
function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY;
}

const OFFICE_ADDRESS = "101 Merrick Road, Rockville Centre, NY 11570";
const SHIFT_HOURS = 8;
const MIN_SCAN_DURATION_HOURS = 2;

export interface TravelScenario {
  type: "local" | "regional" | "flyout";
  label: string;
  description: string;
}

export interface DistanceResult {
  origin: string;
  destination: string;
  distanceMiles: number;
  durationMinutes: number;
  durationText: string;
  scenario: TravelScenario;
}

export interface ScheduleSlot {
  date: string;
  startTime: string;
  endTime: string;
  availableHours: number;
  travelTimeMinutes: number;
  canSchedule: boolean;
  reason?: string;
}

export function determineTravelScenario(distanceMiles: number): TravelScenario {
  if (distanceMiles <= 50) {
    return {
      type: "local",
      label: "NYC/LI Local",
      description: "Same-day round trip from office"
    };
  } else if (distanceMiles <= 250) {
    return {
      type: "regional",
      label: "Greater Northeast Regional",
      description: "May require early departure or overnight"
    };
  } else {
    return {
      type: "flyout",
      label: "Fly-Out Job",
      description: "Requires flights and multi-day scheduling"
    };
  }
}

// Clean address by removing parenthetical annotations like "(Historic)"
function cleanAddress(address: string): string {
  // Remove parenthetical content
  let cleaned = address.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned;
}

// Generate address variations for geocoding (e.g., "New York 212" -> "NY-212")
function generateAddressVariations(address: string): string[] {
  const variations: string[] = [address];
  
  // Convert "New York XXX" to "NY-XXX" (state route format)
  const nyRouteMatch = address.match(/(.*)New York\s+(\d+)(.*)/i);
  if (nyRouteMatch) {
    variations.push(`${nyRouteMatch[1]}NY-${nyRouteMatch[2]}${nyRouteMatch[3]}`);
  }
  
  // Convert "Route XXX" or "Rt XXX" to state abbreviation format
  const routeMatch = address.match(/(.*)(?:Route|Rt\.?)\s+(\d+)(.*)/i);
  if (routeMatch) {
    variations.push(`${routeMatch[1]}NY-${routeMatch[2]}${routeMatch[3]}`);
  }
  
  return variations;
}

// Helper to geocode an address to get the formatted address
async function geocodeAddress(address: string, apiKey: string): Promise<string | null> {
  try {
    // First try with cleaned address (remove parenthetical annotations)
    const cleanedAddress = cleanAddress(address);
    
    // Generate variations to try (e.g., "New York 212" -> "NY-212")
    const variations = generateAddressVariations(cleanedAddress);
    
    for (const variation of variations) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", variation);
      url.searchParams.set("key", apiKey);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        
        console.log("[Geocode] Attempt for:", variation, "Status:", data.status);
        
        if (data.status === "OK" && data.results?.[0]?.formatted_address) {
          console.log("[Geocode] Resolved:", variation, "->", data.results[0].formatted_address);
          return data.results[0].formatted_address;
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[Geocode] Fetch error for", variation, ":", error.message);
      }
    }
    
    console.log("[Geocode] No results for any variation of:", cleanedAddress);
    return null;
  } catch (error) {
    console.error("[Geocode] Failed:", error);
    return null;
  }
}

// Calculate distance between origin and destination
async function tryDistanceMatrix(from: string, destination: string, apiKey: string): Promise<{ distanceMeters: number; durationSeconds: number; durationText: string } | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", from);
  url.searchParams.set("destinations", destination);
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
      console.log("[Distance Matrix] API status:", data.status, "Element status:", data.rows?.[0]?.elements?.[0]?.status);
      return null;
    }

    const element = data.rows[0].elements[0];
    if (element.status !== "OK") {
      console.log("[Distance Matrix] Element status not OK:", element.status);
      return null;
    }

    return {
      distanceMeters: element.distance.value,
      durationSeconds: element.duration.value,
      durationText: element.duration.text,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("[Distance Matrix] Request timed out after 10 seconds");
    } else {
      console.error("[Distance Matrix] Fetch error:", error.message);
    }
    return null;
  }
}

export async function calculateTravelDistance(destination: string, origin?: string): Promise<DistanceResult | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.warn("[Distance Matrix] Google Maps API key not configured");
    return null;
  }

  const from = origin || OFFICE_ADDRESS;
  
  console.log("[Distance Matrix] Calculating:", { from, destination });
  
  try {
    // First attempt with original addresses
    let result = await tryDistanceMatrix(from, destination, apiKey);
    
    // If NOT_FOUND, try to geocode the destination first
    if (!result) {
      console.log("[Distance Matrix] First attempt failed, trying geocoded destination...");
      const formattedDestination = await geocodeAddress(destination, apiKey);
      
      if (formattedDestination && formattedDestination !== destination) {
        result = await tryDistanceMatrix(from, formattedDestination, apiKey);
        if (result) {
          console.log("[Distance Matrix] Success with geocoded destination");
        }
      }
    }
    
    // If still no result, try geocoding the origin (e.g., "Brooklyn, NY 11201")
    if (!result) {
      console.log("[Distance Matrix] Still failed, trying geocoded origin...");
      const formattedOrigin = await geocodeAddress(from, apiKey);
      
      if (formattedOrigin && formattedOrigin !== from) {
        result = await tryDistanceMatrix(formattedOrigin, destination, apiKey);
        if (result) {
          console.log("[Distance Matrix] Success with geocoded origin");
        } else {
          // Try both geocoded
          const formattedDest = await geocodeAddress(destination, apiKey);
          if (formattedDest) {
            result = await tryDistanceMatrix(formattedOrigin, formattedDest, apiKey);
            if (result) {
              console.log("[Distance Matrix] Success with both addresses geocoded");
            }
          }
        }
      }
    }
    
    if (!result) {
      console.error("[Distance Matrix] Route not found for", from, "->", destination);
      return null;
    }

    const distanceMiles = result.distanceMeters / 1609.34;

    return {
      origin: from,
      destination,
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      durationMinutes: Math.round(result.durationSeconds / 60),
      durationText: result.durationText,
      scenario: determineTravelScenario(distanceMiles),
    };
  } catch (error) {
    console.error("Failed to calculate travel distance:", error);
    return null;
  }
}

export function validateShiftGate(
  travelTimeMinutes: number,
  scanDurationHours: number = MIN_SCAN_DURATION_HOURS
): { valid: boolean; message: string; availableWorkHours: number } {
  const roundTripTravelHours = (travelTimeMinutes * 2) / 60;
  const totalRequiredHours = roundTripTravelHours + scanDurationHours;
  const availableWorkHours = SHIFT_HOURS - roundTripTravelHours;

  if (totalRequiredHours > SHIFT_HOURS) {
    return {
      valid: false,
      message: `Exceeds ${SHIFT_HOURS}-hour shift. Travel: ${roundTripTravelHours.toFixed(1)}h round-trip + ${scanDurationHours}h scan = ${totalRequiredHours.toFixed(1)}h total`,
      availableWorkHours: Math.max(0, availableWorkHours),
    };
  }

  return {
    valid: true,
    message: `Within ${SHIFT_HOURS}-hour shift. ${availableWorkHours.toFixed(1)}h available for scanning.`,
    availableWorkHours,
  };
}

export interface CreateScanEventParams {
  projectName: string;
  projectAddress: string;
  universalProjectId?: string;
  scanDate: Date;
  startTime: string;
  endTime: string;
  technicianEmail?: string;
  travelInfo?: DistanceResult;
  notes?: string;
}

export async function createScanCalendarEvent(params: CreateScanEventParams): Promise<{ eventId: string; htmlLink: string } | null> {
  try {
    const calendar = await getCalendarClient();

    const [startHour, startMinute] = params.startTime.split(":").map(Number);
    const [endHour, endMinute] = params.endTime.split(":").map(Number);

    const startDateTime = new Date(params.scanDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(params.scanDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    let description = `Scan2Plan Field Scan\n\n`;
    if (params.universalProjectId) {
      description += `Project ID: ${params.universalProjectId}\n`;
    }
    description += `Location: ${params.projectAddress}\n`;
    
    if (params.travelInfo) {
      description += `\n--- Travel Info ---\n`;
      description += `From: ${params.travelInfo.origin}\n`;
      description += `Distance: ${params.travelInfo.distanceMiles} miles\n`;
      description += `Drive Time: ${params.travelInfo.durationText}\n`;
      description += `Category: ${params.travelInfo.scenario.label}\n`;
    }

    if (params.notes) {
      description += `\n--- Notes ---\n${params.notes}`;
    }

    const event = {
      summary: `[SCAN] ${params.projectName}`,
      location: params.projectAddress,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/New_York",
      },
      attendees: params.technicianEmail ? [{ email: params.technicianEmail }] : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: params.technicianEmail ? "all" : "none",
    });

    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!,
    };
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

export async function getTechnicianAvailability(
  date: Date,
  technicianEmail?: string
): Promise<{ busy: boolean; events: Array<{ start: string; end: string; summary: string }> }> {
  try {
    const calendar = await getCalendarClient();
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (response.data.items || []).map(event => ({
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      summary: event.summary || "Busy",
    }));

    return {
      busy: events.length > 0,
      events,
    };
  } catch (error) {
    console.error("Failed to fetch calendar availability:", error);
    return { busy: false, events: [] };
  }
}
