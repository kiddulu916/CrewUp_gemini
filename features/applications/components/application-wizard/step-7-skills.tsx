'use client';

import { useState } from 'react';
import { UseFormReturn, Controller, useFieldArray } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input } from '@/components/ui';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
};

// SVG Icons
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const BadgeCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);

// Comprehensive trade skills list
const TRADE_SKILLS = [
  // Carpentry
  'Framing',
  'Finish Carpentry',
  'Cabinetry',
  'Drywall Installation',
  'Rough Carpentry',
  'Blueprint Reading',

  // Electrical
  'Residential Wiring',
  'Commercial Wiring',
  'Electrical Troubleshooting',
  'Conduit Installation',
  'Panel Installation',
  'Low Voltage Systems',

  // Plumbing
  'Pipe Installation',
  'Drain Cleaning',
  'Water Heater Installation',
  'Gas Line Installation',
  'PEX/Copper/PVC Piping',
  'Fixture Installation',

  // HVAC
  'AC Installation',
  'Furnace Repair',
  'Ductwork',
  'Refrigeration',
  'Climate Control Systems',
  'HVAC Diagnostics',

  // Welding
  'MIG Welding',
  'TIG Welding',
  'Arc Welding',
  'Fabrication',
  'Metal Cutting',
  'Blueprint Reading',

  // Masonry
  'Bricklaying',
  'Concrete Finishing',
  'Stone Work',
  'Block Laying',
  'Tuckpointing',
  'Foundation Work',

  // Roofing
  'Shingle Installation',
  'Flat Roofing',
  'Metal Roofing',
  'Roof Repair',
  'Waterproofing',
  'Gutter Installation',

  // Painting
  'Interior Painting',
  'Exterior Painting',
  'Spray Painting',
  'Drywall Finishing',
  'Surface Preparation',
  'Texture Application',

  // Heavy Equipment
  'Excavator Operation',
  'Bulldozer Operation',
  'Crane Operation',
  'Forklift Operation',
  'Backhoe Operation',
  'Loader Operation',

  // General Construction
  'Project Management',
  'Safety Compliance',
  'Quality Control',
  'Material Estimation',
  'Site Preparation',
  'Demolition',
  'Scaffolding',
  'Power Tools',
  'Hand Tools',
  'Construction Math',
];

export function Step7Skills({ form }: Props) {
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'certifications',
  });

  const [expandedCertIndex, setExpandedCertIndex] = useState<number>(-1);
  const [skillSearch, setSkillSearch] = useState('');

  const selectedSkills = watch('tradeSkills') || [];

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

  function addCertification() {
    append({
      id: crypto.randomUUID(),
      name: '',
      issuingOrganization: '',
      expirationDate: '',
    });
    setExpandedCertIndex(fields.length);
  }

  const filteredSkills = TRADE_SKILLS.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Skills & Certifications</h2>
        <p className="text-gray-600">
          Select your trade skills and list any relevant certifications. At least 3 skills are
          required.
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
          <span className="ml-2 text-xs font-normal text-gray-500">
            (Select at least 3)
          </span>
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
            {selectedSkills.length < 3 && (
              <span className="text-red-600 ml-2">
                (need {3 - selectedSkills.length} more)
              </span>
            )}
          </span>
        </div>

        {/* Skills Grid */}
        <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredSkills.map((skill) => {
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

          {filteredSkills.length === 0 && (
            <p className="text-center text-gray-500 py-4">No skills found matching "{skillSearch}"</p>
          )}
        </div>

        {errors.tradeSkills && (
          <p className="mt-1 text-sm text-red-600">{errors.tradeSkills.message}</p>
        )}
      </div>

      {/* Certifications Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Professional Certifications</h3>
        <p className="text-sm text-gray-600">
          Add any relevant certifications (OSHA, trade licenses, safety training, etc.)
        </p>

        {fields.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BadgeCheckIcon className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No certifications added</p>
            <p className="text-xs text-gray-500 mt-1">Certifications are optional but recommended</p>
          </div>
        )}

        {fields.map((field, index) => {
          const isExpanded = expandedCertIndex === index;
          const certName = watch(`certifications.${index}.name`);
          const issuingOrg = watch(`certifications.${index}.issuingOrganization`);

          return (
            <div
              key={field.id}
              className="bg-white border border-gray-300 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedCertIndex(isExpanded ? -1 : index)}
              >
                <div className="flex items-center space-x-2">
                  <BadgeCheckIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {certName || `Certification ${index + 1}`}
                    </h4>
                    {issuingOrg && <p className="text-xs text-gray-500">{issuingOrg}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(index);
                  }}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="p-3 space-y-3">
                  {/* Certification Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certification Name <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`certifications.${index}.name`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="OSHA 30, Journeyman License, etc."
                          className={
                            errors.certifications?.[index]?.name ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.certifications?.[index]?.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.certifications[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  {/* Issuing Organization */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Organization <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`certifications.${index}.issuingOrganization`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="OSHA, State Licensing Board, etc."
                          className={
                            errors.certifications?.[index]?.issuingOrganization
                              ? 'border-red-500'
                              : ''
                          }
                        />
                      )}
                    />
                    {errors.certifications?.[index]?.issuingOrganization && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.certifications[index]?.issuingOrganization?.message}
                      </p>
                    )}
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date (Optional)
                    </label>
                    <Controller
                      name={`certifications.${index}.expirationDate`}
                      control={control}
                      render={({ field }) => (
                        <Input {...field} type="date" />
                      )}
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank if no expiration</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Certification Button */}
        <button
          type="button"
          onClick={addCertification}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="font-medium">Add Certification</span>
        </button>
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
              with relevant jobs. Pro tip: Employers filter by certifications, so list all valid
              ones!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
