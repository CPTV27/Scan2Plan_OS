import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { log } from "../../lib/logger";
import fetch from "node-fetch";

export const googleMapsRouter = Router();

// GET /api/maps/script
googleMapsRouter.get(
    "/api/maps/script",
    (req, res) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(503).send("// Google Maps API key not configured");
        }

        const libraries = req.query.libraries || "drawing,geometry";
        const callback = req.query.callback || "";

        const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}${callback ? `&callback=${callback}` : ""}`;
        res.redirect(scriptUrl);
    }
);

// GET /api/maps/static
googleMapsRouter.get(
    "/api/maps/static",
    asyncHandler(async (req, res) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ error: "Google Maps API key not configured" });
        }

        const { center, zoom, size, maptype, path } = req.query;

        if (!center || !zoom || !size) {
            return res.status(400).json({ error: "center, zoom, and size are required" });
        }

        const centerStr = String(center);
        const zoomStr = String(zoom);
        const sizeStr = String(size);
        const maptypeStr = String(maptype || "satellite");

        if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(centerStr)) {
            return res.status(400).json({ error: "Invalid center format" });
        }

        const zoomNum = parseInt(zoomStr, 10);
        if (isNaN(zoomNum) || zoomNum < 1 || zoomNum > 21) {
            return res.status(400).json({ error: "Invalid zoom level" });
        }

        if (!/^\d+x\d+$/.test(sizeStr)) {
            return res.status(400).json({ error: "Invalid size format" });
        }

        const pathStr = path ? String(path) : "";
        if (pathStr.length > 5000) {
            return res.status(400).json({ error: "Path too long, max 100 points" });
        }

        try {
            let url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(centerStr)}&zoom=${zoomNum}&size=${encodeURIComponent(sizeStr)}&maptype=${encodeURIComponent(maptypeStr)}&key=${apiKey}`;

            if (pathStr) {
                url += `&path=${encodeURIComponent(pathStr)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                return res.status(response.status).json({ error: "Failed to fetch static map" });
            }

            const contentType = response.headers.get("content-type");
            res.setHeader("Content-Type", contentType || "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400");

            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        } catch (error) {
            log("ERROR: Static map error - " + (error as any)?.message);
            res.status(500).json({ error: "Failed to generate static map" });
        }
    })
);

// GET /api/location/preview
googleMapsRouter.get(
    "/api/location/preview",
    asyncHandler(async (req, res) => {
        try {
            const address = req.query.address as string;
            if (!address || address.trim().length < 5) {
                return res.status(400).json({ error: "Address is required" });
            }

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                return res.status(503).json({
                    error: "Google Maps API key not configured",
                    available: false
                });
            }

            const encodedAddress = encodeURIComponent(address);

            let streetViewUrl = "";
            let lat: number | null = null;
            let lng: number | null = null;

            try {
                const geocodeResponse = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
                );
                const geocodeData = await geocodeResponse.json();

                if (geocodeData.status === "OK" && geocodeData.results?.[0]) {
                    const location = geocodeData.results[0].geometry?.location;
                    if (location) {
                        lat = location.lat;
                        lng = location.lng;
                        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${apiKey}`;
                    }
                }
            } catch (geoErr) {
                log("WARN: Geocoding failed for location preview - " + (geoErr as any)?.message);
            }

            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`;
            const satelliteUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat || 40.7},${lng || -74}&zoom=18&maptype=satellite`;

            res.json({
                available: true,
                mapUrl,
                satelliteUrl,
                streetViewUrl,
                geocoded: {
                    lat,
                    lng,
                    formattedAddress: address
                },
                coordinates: lat && lng ? { lat, lng } : undefined
            });
        } catch (error) {
            log("ERROR: Location preview error - " + (error as any)?.message);
            res.status(500).json({ error: "Failed to generate location preview" });
        }
    })
);

// GET /api/location/static-map (Proxy for thumbnails)
googleMapsRouter.get(
    "/api/location/static-map",
    asyncHandler(async (req, res) => {
        try {
            const address = req.query.address as string;
            const lat = req.query.lat as string;
            const lng = req.query.lng as string;
            const zoom = parseInt(req.query.zoom as string) || 17;
            const size = (req.query.size as string) || "400x300";
            const maptype = (req.query.maptype as string) || "satellite";

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                return res.status(503).json({
                    error: "Google Maps API key not configured"
                });
            }

            let center = "";
            if (lat && lng) {
                center = `${lat},${lng}`;
            } else if (address) {
                center = encodeURIComponent(address);
            } else {
                return res.status(400).json({ error: "Address or coordinates required" });
            }

            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${apiKey}`;

            const response = await fetch(staticMapUrl);

            if (!response.ok) {
                return res.status(response.status).json({ error: "Failed to fetch static map from Google" });
            }

            const contentType = response.headers.get("content-type");
            res.setHeader("Content-Type", contentType || "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400");

            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        } catch (error) {
            log("ERROR: Static map error - " + (error as any)?.message);
            res.status(500).json({ error: "Failed to generate static map" });
        }
    })
);

// GET /api/location/place-details
googleMapsRouter.get(
    "/api/location/place-details",
    asyncHandler(async (req, res) => {
        try {
            const address = req.query.address as string;
            if (!address || address.trim().length < 5) {
                return res.status(400).json({ error: "Address is required" });
            }

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                return res.status(503).json({ error: "Google Maps API key not configured" });
            }

            const encodedAddress = encodeURIComponent(address);
            const geocodeResponse = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
            );
            const geocodeData = await geocodeResponse.json();

            if (geocodeData.status !== "OK" || !geocodeData.results?.[0]) {
                return res.status(404).json({ error: "Location not found" });
            }

            const place = geocodeData.results[0];
            const addressComponents = place.address_components || [];

            const getComponent = (type: string) =>
                addressComponents.find((c: any) => c.types.includes(type))?.long_name;

            const state = getComponent("administrative_area_level_1");
            const zip = getComponent("postal_code");

            res.json({
                formattedAddress: place.formatted_address,
                location: place.geometry.location,
                state,
                zip,
                placeId: place.place_id,
                available: true
            });
        } catch (error) {
            log("ERROR: Place details error - " + (error as any)?.message);
            res.status(500).json({ error: "Failed to fetch place details" });
        }
    })
);
