# Design Guidelines: Scan2Plan Pricing Calculator

## Design Approach
**Material Design-Inspired Professional Tool** - This is a utility-focused B2B application where clarity, efficiency, and data organization are paramount. The design emphasizes clean forms, strong hierarchy, and professional aesthetics suitable for construction industry professionals.

## Typography System

**Font Family:**
- Primary: Inter (via Google Fonts)
- Monospace: JetBrains Mono (for numbers, prices, calculations)

**Type Scale:**
- Page Titles: text-3xl, font-bold
- Section Headers: text-xl, font-semibold
- Form Labels: text-sm, font-medium, uppercase tracking
- Body Text: text-base
- Helper Text: text-sm, text-gray-600
- Prices/Numbers: JetBrains Mono, font-semibold

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 for consistent rhythm (p-4, m-6, gap-8, etc.)

**Container Strategy:**
- Max-width: max-w-7xl for main content areas
- Dashboard/Admin: Full-width with inner max-w-7xl
- Forms: max-w-4xl centered for optimal data entry
- Pricing summaries: max-w-3xl for focused reading

**Grid System:**
- Form fields: Single column on mobile, 2-column grid (grid-cols-2) on desktop for related pairs
- Dashboard cards: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Pricing matrix table: Horizontal scroll on mobile, full table on desktop

## Component Library

### Navigation
- Top navigation bar with Scan2Plan logo (left), navigation links (center), theme not needed (right)
- Sticky navigation on scroll
- Active state: Border-bottom indicator for current page
- Mobile: Hamburger menu collapsing to drawer

### Forms & Inputs
- Text inputs: Border with focus ring, clear labels above
- Dropdowns: Native select styled with custom arrow
- Multi-select checkboxes: Grouped with subtle container backgrounds
- Number inputs: Right-aligned text for prices/quantities
- File uploads: Drag-and-drop zone with file list display
- Inline editing: Click-to-edit with save/cancel actions appearing on focus

### Cards
- Project/quote cards: Subtle shadow, hover lift effect
- Padding: p-6
- Border radius: rounded-lg
- Two-CTA home cards: Larger cards (p-8) with icon, title, description, and prominent button

### Tables
- Header row: Sticky with background
- Zebra striping for alternating rows
- Editable cells: Subtle hover state indicating clickability
- Responsive: Stack to cards on mobile for complex tables
- Pricing tables: Right-align numerical columns

### Buttons
- Primary: Solid background, medium font-weight
- Secondary: Outlined style
- Sizes: Small (px-3 py-2), Default (px-4 py-3), Large (px-6 py-4)
- Icons: Use Heroicons (via CDN) for all interface icons

### Status & Badges
- Status badges: Small rounded pills with text-xs
- Color coding: Pending (yellow), Complete (green), Draft (gray)
- Pricing indicators: Green for discounts, red for premiums, blue for info

### Modals & Overlays
- Centered modal with backdrop blur
- Close button (X) in top-right
- Actions in footer (right-aligned)
- Max-width: max-w-2xl for forms

### Pricing Display
- Large, prominent total at bottom
- Itemized breakdown with indentation showing hierarchy
- Editable fields: Dashed underline on hover
- Discount/premium rows: Colored text with +/- indicators
- Summary cards: Elevated with stronger shadow

### Dashboard Elements
- Tab navigation: Underline indicator for active tab
- List items: Hover background change
- Action buttons: Icon-only for compact display, tooltips on hover
- Empty states: Centered with icon and helpful message

### Admin Interface
- Parameter groups: Collapsible sections with headers
- Inline editors: Click-to-edit throughout
- Matrix editor: Scrollable table with fixed headers
- Save indication: Auto-save with timestamp display

## Animations
Minimal, purposeful animations only:
- Button hover: Subtle scale (scale-105) or brightness change
- Card hover: Translate-y lift with shadow increase
- Modal entry: Fade-in with scale-95 to scale-100
- Form validation: Shake animation for errors
- No scroll-triggered or loading animations

## Professional Touches
- Consistent 8px grid alignment throughout
- Generous whitespace in forms (gap-6 between sections)
- Clear visual hierarchy with font-weight and size
- Professional color palette (will be defined separately)
- Print-friendly layout for PDF exports
- Keyboard navigation support for power users

## Images
No hero images needed. This is a professional tool interface focused on data entry and display. Use Heroicons for all iconography (calculator, document, chart, folder, etc.) throughout the interface.