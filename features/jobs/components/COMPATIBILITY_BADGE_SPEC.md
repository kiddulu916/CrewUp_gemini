# Compatibility Badge Visual Specification

## Badge Appearance

The compatibility badge appears in the **top-right corner** of each job card for Pro workers.

### Position
- `position: absolute`
- `top: 0.5rem` (8px)
- `right: 0.5rem` (8px)
- `z-index: 10` (above card content)

### Styling
- **Shape**: Rounded pill (`rounded-full`)
- **Padding**: `px-3 py-1` (12px horizontal, 4px vertical)
- **Shadow**: `shadow-md` for subtle elevation
- **Text**: `text-sm font-semibold` (14px, bold)

## Color Variations

### Perfect Match (90-100%)
```
Background: bg-green-100 (light green)
Text: text-green-700 (dark green)
Example: "95% Match"
```

### Great Match (75-89%)
```
Background: bg-blue-100 (light blue)
Text: text-blue-700 (dark blue)
Example: "82% Match"
```

### Good Match (60-74%)
```
Background: bg-yellow-100 (light yellow)
Text: text-yellow-700 (dark yellow)
Example: "67% Match"
```

### Fair Match (0-59%)
```
Background: bg-gray-100 (light gray)
Text: text-gray-700 (dark gray)
Example: "45% Match"
```

## Example Badge HTML

```html
<!-- Perfect Match (90-100%) -->
<div class="absolute top-2 right-2 z-10">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 shadow-md">
    95% Match
  </span>
</div>

<!-- Great Match (75-89%) -->
<div class="absolute top-2 right-2 z-10">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 shadow-md">
    82% Match
  </span>
</div>

<!-- Good Match (60-74%) -->
<div class="absolute top-2 right-2 z-10">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700 shadow-md">
    67% Match
  </span>
</div>

<!-- Fair Match (0-59%) -->
<div class="absolute top-2 right-2 z-10">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 shadow-md">
    45% Match
  </span>
</div>
```

## Visual Examples

### Job Card WITH Badge (Pro Worker)
```
┌─────────────────────────────────────────────────┐
│                            [85% Match]          │ ← Badge here
│  Senior Electrician                             │
│  🔧 Electrical  🔌 Residential  📋 Full-time   │
│  📍 Austin, TX (5.2 mi) • 👤 ABC Electric       │
│  📜 Master Electrician  📜 OSHA 30              │
└─────────────────────────────────────────────────┘
```

### Job Card WITHOUT Badge (Free Worker or Employer)
```
┌─────────────────────────────────────────────────┐
│  Senior Electrician                             │
│  🔧 Electrical  🔌 Residential  📋 Full-time   │
│  📍 Austin, TX (5.2 mi) • 👤 ABC Electric       │
│  📜 Master Electrician  📜 OSHA 30              │
└─────────────────────────────────────────────────┘
```

## Badge Display Logic

### SHOW Badge When:
1. ✅ User is authenticated
2. ✅ User role is "worker"
3. ✅ User subscription_status is "pro"
4. ✅ `currentUser` prop is provided
5. ✅ Job has sufficient data for scoring

### HIDE Badge When:
1. ❌ User is not authenticated
2. ❌ User role is "employer"
3. ❌ User subscription_status is "free"
4. ❌ `currentUser` prop is null/undefined
5. ❌ Job data is incomplete

## Accessibility Considerations

The badge is purely visual and does not require ARIA labels because:
- It's decorative information (not critical to job application)
- The score is also available in the detailed job view
- The badge enhances UX but isn't essential for functionality

However, for future enhancement, consider:
```html
<span
  class="..."
  role="status"
  aria-label="Job compatibility score: 85 percent match"
>
  85% Match
</span>
```

## Responsive Behavior

The badge maintains the same position and styling across all screen sizes:
- Mobile (< 640px): Same position, may overlap slightly with title on very small screens
- Tablet (640px - 1024px): Comfortable spacing
- Desktop (> 1024px): Optimal spacing

If overlap becomes an issue on mobile, consider:
```css
@media (max-width: 640px) {
  .compatibility-badge {
    top: 0.25rem;
    right: 0.25rem;
    font-size: 0.75rem; /* xs */
    padding: 0.125rem 0.5rem; /* tighter padding */
  }
}
```

## Animation (Future Enhancement)

For a polished UX, consider adding a subtle fade-in animation:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.compatibility-badge {
  animation: fadeIn 200ms ease-out;
}
```

Add to Tailwind config:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
      },
    },
  },
}
```

Then use: `className="... animate-fade-in"`
