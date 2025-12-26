'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ApplicationFormData } from '../types/application.types';

export type SaveToProfileResult = {
  success: boolean;
  error?: string;
};

/**
 * Save application data back to worker profile
 * Updates profile fields and related tables (work_experience, education, references)
 * This keeps profile as master copy for future applications
 */
export async function saveApplicationDataToProfile(
  formData: ApplicationFormData
): Promise<SaveToProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // 1. Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: formData.fullName,
        phone: formData.phoneNumber,
        address_street: formData.address.street,
        address_city: formData.address.city,
        address_state: formData.address.state,
        address_zip_code: formData.address.zipCode,
        authorized_to_work: formData.authorizedToWork,
        has_drivers_license: formData.hasDriversLicense,
        license_class: formData.licenseClass || null,
        has_reliable_transportation: formData.hasReliableTransportation,
        years_of_experience: formData.yearsOfExperience,
        trade_skills: formData.tradeSkills,
        emergency_contact_name: formData.emergencyContact.name,
        emergency_contact_relationship: formData.emergencyContact.relationship,
        emergency_contact_phone: formData.emergencyContact.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return { success: false, error: 'Failed to update profile' };
    }

    // 2. Upsert work experience
    if (formData.workHistory && formData.workHistory.length > 0) {
      const workExpData = formData.workHistory.map((exp) => ({
        id: exp.id.startsWith('temp-') ? undefined : exp.id, // Skip temp IDs
        user_id: user.id,
        job_title: exp.jobTitle,
        company_name: exp.companyName,
        start_date: exp.startDate,
        end_date: exp.endDate || null,
        is_current: exp.isCurrent,
        responsibilities: exp.responsibilities,
        reason_for_leaving: exp.reasonForLeaving || null,
      }));

      // Delete existing work experience not in the list
      const existingIds = workExpData
        .filter((exp) => exp.id)
        .map((exp) => exp.id);

      if (existingIds.length > 0) {
        await supabase
          .from('work_experience')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        // If no existing IDs, delete all (they're all new)
        await supabase.from('work_experience').delete().eq('user_id', user.id);
      }

      // Upsert all work experience
      const { error: workExpError } = await supabase
        .from('work_experience')
        .upsert(workExpData, { onConflict: 'id', ignoreDuplicates: false });

      if (workExpError) {
        console.error('Work experience update error:', workExpError);
      }
    }

    // 3. Upsert education
    if (formData.education && formData.education.length > 0) {
      const educationData = formData.education.map((edu) => ({
        id: edu.id.startsWith('temp-') ? undefined : edu.id,
        user_id: user.id,
        institution_name: edu.institutionName,
        degree_type: edu.degreeType,
        field_of_study: edu.fieldOfStudy,
        graduation_year: edu.graduationYear,
        is_currently_enrolled: edu.isCurrentlyEnrolled,
      }));

      // Delete existing education not in the list
      const existingIds = educationData.filter((edu) => edu.id).map((edu) => edu.id);

      if (existingIds.length > 0) {
        await supabase
          .from('education')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        await supabase.from('education').delete().eq('user_id', user.id);
      }

      // Upsert all education
      const { error: educationError } = await supabase
        .from('education')
        .upsert(educationData, { onConflict: 'id', ignoreDuplicates: false });

      if (educationError) {
        console.error('Education update error:', educationError);
      }
    }

    // 4. Upsert professional references
    if (formData.references && formData.references.length > 0) {
      const referencesData = formData.references.map((ref) => ({
        id: ref.id.startsWith('temp-') ? undefined : ref.id,
        user_id: user.id,
        name: ref.name,
        company: ref.company,
        phone: ref.phone,
        email: ref.email,
        relationship: ref.relationship,
      }));

      // Delete existing professional references not in the list
      const existingIds = referencesData.filter((ref) => ref.id).map((ref) => ref.id);

      if (existingIds.length > 0) {
        await supabase
          .from('professional_references')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        await supabase.from('professional_references').delete().eq('user_id', user.id);
      }

      // Upsert all professional references
      const { error: referencesError } = await supabase
        .from('professional_references')
        .upsert(referencesData, { onConflict: 'id', ignoreDuplicates: false });

      if (referencesError) {
        console.error('Professional references update error:', referencesError);
      }
    }

    // Note: Certifications are kept separate (image-based verification)
    // They're managed through the certifications table with image uploads

    return { success: true };
  } catch (error) {
    console.error('Error saving to profile:', error);
    return { success: false, error: 'Failed to save application data to profile' };
  }
}
