'use client';

import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input } from '@/components/ui';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
  jobTrades: string[];
};

// Comprehensive trade skills organized by category (Key Skills from each trade)
const TRADE_SKILLS_BY_CATEGORY: Record<string, string[]> = {
  'Operating Engineers': [
    'Precision Control of Hydraulic Equipment',
    'Reading the Ground (Soil Stability Analysis)',
    'Calculating Load Charts',
    'Calculating Lifting Capacities',
    'Equipment Maintenance',
    'Grade Checking',
    'Excavator Operation',
    'Bulldozer Operation',
    'Motor Grader Operation',
    'Crane Operation',
    'Paving Equipment Operation',
  ],
  'Demolition Specialists': [
    'Structural Load Path Analysis',
    'Hazardous Material Identification',
    'Operation of Hydraulic Shear Crushers',
    'Explosives Handling',
    'Debris Management',
    'Structural Demolition',
    'Interior/Soft Strip',
    'Explosive Demolition',
    'Safety Protocols',
  ],
  'Craft Laborers': [
    'Mortar Mixing Ratios',
    'Trench Safety and Shoring',
    'Laser Level Operation',
    'Traffic Signaling',
    'Public Safety Management',
    'Concrete Consolidation',
    'Mason Tending',
    'Pipe Laying',
    'Grade Checking',
    'Flagging/Traffic Control',
  ],
  'Ironworkers': [
    'Working at Heights',
    'Welding (SMAW/FCAW)',
    'Reading Structural Blueprints',
    'Complex Rigging',
    'Knot Tying',
    'Rebar Tying/Spacing',
    'Structural Erection',
    'Reinforcing Steel Installation',
    'Ornamental Iron Work',
    'Machinery Rigging',
  ],
  'Concrete Masons & Cement Finishers': [
    'Timing the Set of Concrete',
    'Screeding',
    'Floating for Flatness',
    'Operating Power Trowels',
    'Constructing Leak-Proof Formwork',
    'Blueprint Interpretation',
    'Flatwork Finishing',
    'Architectural/Decorative Finishing',
    'Form Setting',
  ],
  'Carpenters (Rough)': [
    'Structural Layout and Geometry',
    'Advanced Math (Trigonometry for Roof Pitches)',
    'Pneumatic Tool Operation',
    'Welding (Pile Drivers)',
    'Wood Framing',
    'Metal Stud Framing',
    'Pile Driving',
    'Bridge Construction',
    'Blueprint Reading',
  ],
  'Masons': [
    'Mortar Spreading Techniques',
    'Precise Alignment (Plumb and Level)',
    'Stone Cutting/Shaping',
    'Understanding Thermal Properties of Materials',
    'Bricklaying',
    'Stone Masonry',
    'Refractory Masonry',
    'Restoration Masonry',
  ],
  'Roofers': [
    'Heat Welding (TPO/PVC)',
    'Handling Hot Asphalt (Built-Up Roofing)',
    'Lashing Installation (Chimneys/Vents)',
    'Fall Protection Safety',
    'Low-Slope Roofing',
    'Steep-Slope Roofing',
    'Waterproofing',
  ],
  'Glaziers': [
    'Handling Heavy/Fragile Glass',
    'Laser Alignment',
    'Sealant Application',
    'Fabrication of Aluminum Frames',
    'Curtain Wall Installation',
    'Storefront Glazing',
    'Residential Glazing',
  ],
  'Insulation Workers': [
    'Chemical Safety (Handling Spray Foam)',
    'Cutting and Fitting Around Obstructions',
    'Understanding Fire Codes',
    'Smoke Sealants (Firestopping)',
    'Batt/Roll Installation',
    'Spray Foam Application',
    'Firestop Containment',
  ],
  'Electricians': [
    'Circuitry and Load Calculation',
    'Conduit Bending (Geometry)',
    'Wire Splicing',
    'Reading Electrical Schematics',
    'Troubleshooting Faults',
    'Inside Wireman Work',
    'Residential Wiring',
    'High Voltage Work',
    'Low Voltage/Limited Energy Tech',
  ],
  'Plumbers & Pipefitters': [
    'Pipe Joining (Soldering, Brazing, Welding, Threading)',
    'Understanding Hydrodynamics and Pressure',
    'Reading Isometric Drawings',
    'Cross-Connection Control',
    'Sanitary/Potable Plumbing',
    'Industrial/Process Pipefitting',
    'Steamfitting',
    'Fire Suppression Systems',
  ],
  'HVAC & Sheet Metal Workers': [
    'Thermodynamics',
    'Refrigeration Cycle Diagnostics',
    'Electrical Control Wiring',
    'Complex Geometry (Pattern Layout for Ducts)',
    'Metal Fabrication',
    'HVAC Installation',
    'HVAC Service',
    'Architectural Sheet Metal',
    'Duct Fabrication',
  ],
  'Drywall & Lathers': [
    'Mudding and Taping (Creating Seamless Joints)',
    'Sanding to Specific Levels of Finish',
    'Installing Wire Mesh/Lath Foundations',
    'Mixing Plaster',
    'Drywall Hanging',
    'Taping/Finishing',
    'Lath Installation',
    'Plastering',
  ],
  'Painters & Wall Coverers': [
    'Surface Preparation (Sanding/Patching)',
    'Color Matching',
    'Spray Gun Operation',
    'Chemical Handling (Industrial Epoxies)',
    'Commercial/Residential Painting',
    'Industrial Coating',
    'Wall Covering Installation',
  ],
  'Flooring Installers': [
    'Layout Planning (Pattern Matching)',
    'Heat Welding (Vinyl Seams)',
    'Grinding and Polishing (Terrazzo)',
    'Substrate Preparation',
    'Moisture Testing',
    'Carpet Laying',
    'Resilient/Vinyl Installation',
    'Hardwood Finishing',
    'Terrazzo Work',
    'Tile Setting',
  ],
  'Finish Carpenters': [
    'Precision Cutting (Miters/Joints)',
    'Joinery',
    'Reading Shop Drawings',
    'Fine Detail Sanding/Finishing',
    'Trim Carpentry',
    'Cabinetmaking',
    'Millwork',
  ],
  'Millwrights': [
    'Precision Leveling and Alignment (Laser/Optical)',
    'Rigging Heavy Machinery',
    'Blueprint Reading',
    'Fluid Power Systems',
    'Industrial Mechanics',
    'Turbine Installation',
    'Conveyor Systems',
  ],
  'Elevator Constructors': [
    'Integration of Mechanical, Electrical, and Hydraulic Systems',
    'Troubleshooting Complex Control Logic',
    'Strict Adherence to Safety Codes',
    'New Installation',
    'Service/Repair',
    'Modernization',
  ],
  'Fence Erectors': [
    'Post-Hole Digging and Setting',
    'Site Layout and Alignment',
    'Welding (Gates/Metal Fences)',
    'Tensioning Wire',
    'Chain Link Installation',
    'Wood/Vinyl Fence Installation',
    'Security/Access Gate Installation',
  ],
  'Commercial Divers': [
    'Wet Welding',
    'Diving Physiology/Safety',
    'Underwater Inspection (NDT)',
    'Hydraulic Tool Operation Underwater',
    'Underwater Welding',
    'Marine Construction',
    'Salvage Operations',
  ],
  'Green Energy Technicians': [
    'Working at Heights',
    'DC Electrical Wiring',
    'Structural Mounting',
    'Energy Auditing (Blower Door Testing)',
    'Solar PV Installation',
    'Wind Turbine Maintenance',
    'Weatherization',
  ],
  'Administration': [
    'Project Management',
    'Quality Control',
    'Material Estimation',
    'Safety Compliance',
    'Blueprint Reading',
  ],
};

export function Step7Skills({ form, jobTrades }: Props) {
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const [skillSearch, setSkillSearch] = useState('');

  const selectedSkills = watch('tradeSkills') || [];

  // Get skills for all job trades, organized by trade
  const jobTradeSkillsByCategory: Array<{ trade: string; skills: string[] }> = jobTrades
    .map((trade) => ({
      trade,
      skills: TRADE_SKILLS_BY_CATEGORY[trade] || [],
    }))
    .filter((category) => category.skills.length > 0);

  // Flatten all skills for search functionality
  const allJobSkills = jobTradeSkillsByCategory.flatMap((category) => category.skills);

  // Filter by search across all trades
  const filteredSkillsByCategory = skillSearch
    ? jobTradeSkillsByCategory.map((category) => ({
        trade: category.trade,
        skills: category.skills.filter((skill) =>
          skill.toLowerCase().includes(skillSearch.toLowerCase())
        ),
      })).filter((category) => category.skills.length > 0)
    : jobTradeSkillsByCategory;

  function toggleSkill(skill: string) {
    const currentSkills = selectedSkills;
    if (currentSkills.includes(skill)) {
      setValue(
        'tradeSkills',
        currentSkills.filter((s) => s !== skill),
        { shouldValidate: true }
      );
    } else {
      setValue('tradeSkills', [...currentSkills, skill], { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Skills & Experience</h2>
        <p className="text-gray-600">
          Tell us about your experience and select your relevant trade skills.
        </p>
      </div>

      {/* Years of Experience */}
      <div>
        <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-1">
          Years of Experience in the Trade <span className="text-red-500">*</span>
        </label>
        <Controller
          name="yearsOfExperience"
          control={control}
          render={({ field }) => (
            <div className="flex items-center space-x-4">
              <Input
                {...field}
                id="yearsOfExperience"
                type="number"
                min={0}
                max={50}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                className={`max-w-xs ${errors.yearsOfExperience ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600">years</span>
            </div>
          )}
        />
        {errors.yearsOfExperience && (
          <p className="mt-1 text-sm text-red-600">{errors.yearsOfExperience.message}</p>
        )}
      </div>

      {/* Trade Skills Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trade Skills <span className="text-red-500">*</span>
        </label>

        {/* Search */}
        <div className="mb-3">
          <Input
            type="text"
            placeholder="Search skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Selected Skills Count */}
        <div className="mb-2">
          <span className="text-sm text-gray-600">
            {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Skills organized by trade category */}
        {filteredSkillsByCategory.length > 0 ? (
          <div className="space-y-6">
            {filteredSkillsByCategory.map((category) => (
              <div key={category.trade} className="border border-gray-300 rounded-lg p-4 bg-white">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">🔨</span>
                  {category.trade}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {category.skills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <label
                        key={skill}
                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-300'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkill(skill)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">{skill}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-300">
            <p className="text-sm text-gray-600">
              {skillSearch ? 'No skills found matching your search' : 'No skills available for the selected trades'}
            </p>
          </div>
        )}

        {errors.tradeSkills && (
          <p className="mt-1 text-sm text-red-600">{errors.tradeSkills.message}</p>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Showcase your expertise</h3>
            <p className="mt-1 text-sm text-blue-700">
              Select all skills you're proficient in. More skills increase your chances of matching
              with relevant jobs. Employers can view your certifications on your profile to verify
              your qualifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
