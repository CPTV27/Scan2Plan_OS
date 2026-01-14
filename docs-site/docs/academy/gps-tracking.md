---
sidebar_position: 22
---

# GPS Tracking

Time entries include GPS location for verification.

## How It Works

When you Clock In:
1. System requests browser location permission
2. GPS coordinates are captured
3. Timestamp + location sent to server
4. Mission log entry created

## Location Storage

Each clock event stores:
- Latitude/Longitude
- Accuracy radius
- Timestamp (UTC)
- Device info

## Privacy

- Location only captured at clock events
- No continuous tracking
- Data visible to supervisors
- Stored securely

## Troubleshooting

**GPS not working?**
- Location permissions not granted in browser
- GPS signal weak (indoors or parking garage)
- Browser privacy settings blocking geolocation

:::note
If geolocation fails, Clock In still works but location won't be recorded.
:::
