# Enterprise CEO Command Center - Design Guidelines

## Design Approach
**Selected System**: Fluent Design principles adapted for glassmorphism aesthetic
**Justification**: Enterprise dashboard requiring data clarity with premium glass treatment for executive appeal
**Key References**: Linear's data hierarchy + Stripe's restraint + Modern dashboard glassmorphism

## Core Design Elements

### Typography
- **Primary Font**: Inter (via Google Fonts CDN)
- **Hierarchy**: 
  - Page titles: 2xl font-weight-600
  - Section headers: lg font-weight-600
  - Card titles: base font-weight-500
  - Body text: sm font-weight-400
  - Labels/captions: xs font-weight-500 uppercase tracking-wide

### Layout System
**Spacing Units**: Tailwind 4, 6, 8, 12 (p-4, gap-6, m-8, py-12)
- Sidebar: Fixed 280px width
- Main content: max-w-7xl with px-8
- Card padding: p-6
- Form spacing: gap-6 between elements, gap-4 within groups

### Glassmorphism Implementation
- Glass panels: backdrop-blur-xl bg-opacity-10 (white in light, white in dark)
- Border: 1px solid with opacity-20
- Shadow: lg with subtle glow in dark mode
- Nested glass: Use backdrop-blur-md for cards within glass panels

### Component Library

**Settings Page Layout**:
- Left sidebar (260px): Vertical nav with icon + label sections (Account, Integrations, Security, Billing)
- Main area: Two-column layout (2/3 configuration, 1/3 preview/status)

**Configuration Cards**:
- Header: Title + description + status badge
- Body: Form fields with glass input styling
- Footer: Action buttons (right-aligned)
- Test connection button with real-time status indicator

**Feed Source Cards** (Grid: grid-cols-3 gap-6):
1. BidNet API Card: Logo area, connection status dot, "Configure" button
2. RSS Feeds Card: Feed count badge, last sync timestamp
3. Webhooks Card: Active endpoint count, security indicator

**Form Elements**:
- Text inputs: Glass background, border on focus, height h-10
- Toggles: Large with glass track, colored active state
- Dropdowns: Glass panel with backdrop-blur
- Code blocks: Monospace font in glass container with copy button

**Icons**: Heroicons (via CDN) - outline for nav, solid for status indicators

### Navigation
Top bar (h-16): Logo left, search center, profile + notifications right
Left sidebar: Collapsible sections with expand/collapse icons
Breadcrumbs: Below top bar showing Settings > Integrations > Feed Sources

### Data Display
**API Configuration Section**:
- Credential inputs with show/hide toggle
- Endpoint URL with validation indicator
- Rate limit display (current/max with progress ring)
- Last sync status with timestamp

**Webhook Manager**:
- Table of active webhooks (URL, events, status, actions)
- "Add Webhook" prominent button
- Event type checkboxes in modal overlay

**RSS Feed Manager**:
- URL input with auto-validate
- Feed preview pane showing parsed articles
- Refresh interval slider (15min to 24hr)

### Modals & Overlays
Glass modals with darker backdrop (backdrop-blur-sm bg-black/50)
Modal content: max-w-2xl with p-8
Close button: top-right with glass circle background

## Images
**No hero images** - This is a settings/configuration page. Use:
- Integration logos (BidNet, generic RSS icon, webhook icon) at 48x48 in cards
- Empty state illustration when no feeds configured (centered, max-w-md)

## Dark/Light Mode
**Light**: White glass (bg-white/10), dark text (gray-900)
**Dark**: White glass (bg-white/5), light text (gray-100), subtle glow shadows
Mode toggle in top-right profile menu