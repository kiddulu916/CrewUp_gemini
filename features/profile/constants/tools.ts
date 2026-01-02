/**
 * Power Tools Categories and Tools
 *
 * Organized by trade category for worker profile tool selection.
 * Tools are stored as a flat string array in the database.
 * Categories are only used in the UI for organization.
 */

export type ToolCategory = {
  name: string;
  tools: string[];
};

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  'general': {
    name: 'General / Multi-Trade',
    tools: [
      'Drills',
      'Hammer Drills',
      'Impact Drivers',
      'Impact Wrenches',
      'Rotary Tools',
      'Heat Guns',
      'Shop Vacs',
      'Laser Levels',
      'Work Lights',
      'Air Compressors',
      'Common Hand Tools'
    ]
  },
  'carpentry': {
    name: 'Carpentry / Framing',
    tools: [
      'Circular Saws',
      'Worm-Drive Saws',
      'Miter Saws',
      'Table Saws',
      'Sawzall',
      'Framing Nailers',
      'Brad Nailers',
      'Pin Nailers',
      'Power Planers',
      'Track Saws',
      'Panel Saws'
    ]
  },
  'finish-carpentry': {
    name: 'Finish Carpentry / Trim',
    tools: [
      'Miter Saws (Fine-Cut)',
      'Finish Nailers',
      'Brad Nailers',
      'Pin Nailers',
      'Routers',
      'Laminate Trimmers',
      'Random Orbital Sanders',
      'Detail Sanders',
      'Electric Staplers',
      'Power Caulking Guns'
    ]
  },
  'woodworking': {
    name: 'Woodworking / Cabinetry',
    tools: [
      'Table Saws',
      'Band Saws',
      'Scroll Saws',
      'Jointers',
      'Thickness Planers',
      'Routers',
      'CNC Routers',
      'Drill Presses',
      'Wood Lathes',
      'Mortisers',
      'Dust Collectors',
      'Sharpening Systems'
    ]
  },
  'metalworking': {
    name: 'Metalworking / Fabrication',
    tools: [
      'Angle Grinders',
      'Bench Grinders',
      'Die Grinders',
      'Band Saws (Metal)',
      'Drill Presses',
      'Plasma Cutters',
      'Oxy-Acetylene Torches',
      'MIG Welders',
      'TIG Welders',
      'Stick Welders',
      'Metal Lathes',
      'Milling Machines'
    ]
  },
  'concrete': {
    name: 'Concrete / Masonry',
    tools: [
      'Rotary Hammers',
      'Demolition Hammers',
      'Jackhammers',
      'Concrete Saws',
      'Wet Tile Saws',
      'Wall Chasers',
      'Power Trowels',
      'Concrete Vibrators',
      'Rebar Cutters',
      'Rebar Benders'
    ]
  },
  'electrical': {
    name: 'Electrical',
    tools: [
      'Hammer Drills',
      'Rotary Hammers',
      'Cable Pullers',
      'Electric Conduit Benders',
      'Mag Drills',
      'Knockout Punches (Powered)',
      'Power Fish Tapes',
      'Wire Strippers (Powered)',
      'Power Screwdrivers'
    ]
  },
  'plumbing': {
    name: 'Plumbing / Pipefitting',
    tools: [
      'Pipe Cutters (Powered)',
      'Pipe Threaders',
      'Pipe Benders',
      'Power Augers',
      'Drain Snakes',
      'Press Tools (PEX/Copper)',
      'Sawzall',
      'Inspection Cameras'
    ]
  },
  'hvac': {
    name: 'HVAC / Sheet Metal',
    tools: [
      'Power Shears',
      'Nibblers',
      'Seamers (Powered)',
      'Crimpers',
      'Duct Cutters',
      'Angle Grinders',
      'Core Drills',
      'Vacuum Pumps (Electric)',
      'Flaring Tools (Powered)'
    ]
  },
  'drywall': {
    name: 'Drywall / Painting',
    tools: [
      'Auto-Feed Screw Guns',
      'Drywall Sanders (Pole Sanders)',
      'Texture Sprayers',
      'Airless Paint Sprayers',
      'Power Mixers',
      'Electric Staplers'
    ]
  },
  'flooring': {
    name: 'Flooring',
    tools: [
      'Floor Sanders',
      'Edge Sanders',
      'Tile Saws',
      'Power Scrapers',
      'Heat Guns',
      'Adhesive Spreaders (Powered)',
      'Oscillating Multi-Tools'
    ]
  },
  'landscaping': {
    name: 'Landscaping / Outdoor',
    tools: [
      'Chainsaws',
      'Pole Saws',
      'Hedge Trimmers',
      'Leaf Blowers',
      'Pressure Washers',
      'Earth Augers',
      'Log Splitters',
      'Lawn Edgers'
    ]
  },
  'automotive': {
    name: 'Automotive / Mechanical',
    tools: [
      'Impact Wrenches',
      'Electric Ratchets',
      'Die Grinders',
      'Polishers',
      'Sanders',
      'Tire Changers (Powered)',
      'Brake Lathes',
      'Engine Hoists (Electric)'
    ]
  }
};

/**
 * Map trade names to tool category keys
 * This allows us to show the most relevant category for a worker's primary trade
 */
export const TRADE_TO_CATEGORY_MAP: Record<string, string> = {
  // Direct mappings
  'Electricians': 'electrical',
  'Plumbers & Pipefitters': 'plumbing',
  'HVAC & Sheet Metal Workers': 'hvac',
  'Carpenters (Rough)': 'carpentry',
  'Finish Carpenters': 'finish-carpentry',
  'Concrete Masons & Cement Finishers': 'concrete',
  'Drywall & Lathers': 'drywall',
  'Painters & Wall Coverers': 'drywall',
  'Flooring Installers': 'flooring',
  'Ironworkers': 'metalworking',
  'Millwrights': 'metalworking',

  // Default to general for other trades
  'Operating Engineers': 'general',
  'Demolition Specialists': 'general',
  'Craft Laborers': 'general',
  'Masons': 'concrete',
  'Roofers': 'general',
  'Glaziers': 'general',
  'Insulation Workers': 'general',
  'Elevator Constructors': 'general',
  'Fence Erectors': 'general',
  'Commercial Divers': 'general',
  'Green Energy Technicians': 'electrical',
  'Administration': 'general',
};

/**
 * Get the category key for a given trade
 */
export function getCategoryForTrade(trade?: string): string | null {
  if (!trade) return null;
  return TRADE_TO_CATEGORY_MAP[trade] || null;
}

/**
 * Get all category keys except the ones provided
 */
export function getOtherCategories(excludeKeys: string[]): string[] {
  return Object.keys(TOOL_CATEGORIES).filter(key => !excludeKeys.includes(key));
}
