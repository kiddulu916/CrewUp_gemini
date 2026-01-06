'use client';

import { Badge } from '@/components/ui/badge';
import { usePublicProfile } from '../../hooks/use-public-profile';
import { Loader2, MapPin, Briefcase, Calendar } from 'lucide-react';
import Image from 'next/image';
import { getFullName, getInitials } from '@/lib/utils';

type AboutTabProps = {
  userId: string;
};

export function AboutTab({ userId }: AboutTabProps) {
  const { data: profile, isLoading, error } = usePublicProfile(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load profile information</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {profile.profile_image_url ? (
            <Image
              src={profile.profile_image_url}
              alt={getFullName(profile)}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border-2 border-krewup-blue object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-krewup-blue bg-gradient-to-br from-krewup-blue to-krewup-light-blue text-2xl font-bold text-white">
              {getInitials(profile)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{getFullName(profile)}</h2>
            {profile.subscription_status === 'pro' && (
              <Badge variant="pro">Pro</Badge>
            )}
          </div>
          {profile.trade && (
            <p className="mt-1 text-lg text-gray-700">
              {profile.trade}
              {profile.sub_trade && ` - ${profile.sub_trade}`}
            </p>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profile.location && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <MapPin className="h-5 w-5 text-krewup-blue" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{profile.location}</p>
            </div>
          </div>
        )}

        {profile.years_of_experience !== null && profile.years_of_experience !== undefined && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <Briefcase className="h-5 w-5 text-krewup-blue" />
            <div>
              <p className="text-sm text-gray-500">Experience</p>
              <p className="font-medium text-gray-900">
                {profile.years_of_experience} {profile.years_of_experience === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
          <Calendar className="h-5 w-5 text-krewup-blue" />
          <div>
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="font-medium text-gray-900">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">About</h3>
          <p className="whitespace-pre-wrap text-gray-700">{profile.bio}</p>
        </div>
      )}

      {/* Skills Section */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <Badge key={index} variant="info">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tools Section */}
      {profile.has_tools && profile.tools_owned && profile.tools_owned.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Tools Owned</h3>
          <div className="flex flex-wrap gap-2">
            {profile.tools_owned.map((tool, index) => (
              <Badge key={index} variant="default">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
