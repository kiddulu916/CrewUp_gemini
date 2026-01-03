'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Profile } from '@/lib/types/profile.types';
import { PortfolioManager } from '@/features/portfolio/components/portfolio-manager';
import { ToolsSelector } from '@/features/profile/components/tools-selector';
import { updateToolsOwned } from '@/features/profile/actions/profile-actions';
import { useToast } from '@/components/providers/toast-provider';
import { Briefcase, Image as ImageIcon, Award, User } from 'lucide-react';

export interface ProfileEditTabsProps {
  profile: Profile;
}

type TabId = 'basic' | 'portfolio' | 'experience' | 'certifications';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'certifications', label: 'Certifications', icon: Award },
];

export function ProfileEditTabs({ profile }: ProfileEditTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSavingTools, setIsSavingTools] = useState(false);

  // Sync activeTab with URL on mount and URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToolsChange = async (hasTools: boolean, toolsOwned: string[]) => {
    setIsSavingTools(true);
    try {
      const result = await updateToolsOwned(hasTools, toolsOwned);
      if (result.success) {
        toast.success('Tools updated successfully');
      } else {
        toast.error(result.error || 'Failed to update tools');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSavingTools(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Profile editing tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'border-krewup-blue text-krewup-blue'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${tab.label} tab`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              <p className="mt-1 text-sm text-gray-600">
                Update your profile information and select the tools you own.
              </p>
            </div>

            {/* Tools Selector */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Tools Owned</h3>
              <ToolsSelector
                hasTools={profile.has_tools || false}
                toolsOwned={profile.tools_owned || []}
                primaryTrade={profile.trade || undefined}
                onChange={handleToolsChange}
              />
              {isSavingTools && (
                <p className="mt-4 text-sm text-gray-500">Saving tools...</p>
              )}
            </div>

            {/* Other basic info fields can be added here in future iterations */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm text-gray-600">
                Additional profile fields (name, phone, bio, etc.) will be added here in a future update.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload and manage your work photos. Free users can upload up to 5 photos, Pro users have unlimited uploads.
              </p>
            </div>

            <PortfolioManager profile={profile} />
          </div>
        )}

        {activeTab === 'experience' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
              <p className="mt-1 text-sm text-gray-600">
                Add and manage your work history.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
              <Briefcase className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">Experience editing coming soon</p>
              <p className="mt-1 text-sm text-gray-500">
                You'll be able to add and edit your work history here
              </p>
            </div>
          </div>
        )}

        {activeTab === 'certifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload your licenses and certifications for verification.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
              <Award className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">Certification upload coming soon</p>
              <p className="mt-1 text-sm text-gray-500">
                You'll be able to upload and manage your certifications here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
