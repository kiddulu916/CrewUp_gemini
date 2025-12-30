import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { MessageButton } from '@/features/messaging/components/message-button';
import Link from 'next/link';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ApplicationDetailPage({ params }: Props) {
  const { id: applicationId } = await params;
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Fetch current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!currentProfile) {
    redirect('/onboarding');
  }

  // Fetch the application with full details
  const { data: application, error } = await supabase
    .from('job_applications')
    .select(`
      *,
      applicant:profiles!applicant_id(
        id,
        name,
        trade,
        sub_trade,
        location,
        bio,
        phone,
        email,
        is_profile_boosted,
        boost_expires_at
      ),
      job:jobs!job_id(
        id,
        title,
        trade,
        sub_trade,
        job_type,
        location,
        pay_rate,
        subtrade_pay_rates,
        description,
        required_certs,
        custom_questions,
        employer_id,
        employer:profiles!employer_id(
          id,
          name,
          company_name,
          subscription_status
        )
      )
    `)
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    notFound();
  }

  const isEmployer = currentProfile.role === 'employer';
  const isWorker = currentProfile.role === 'worker';

  // Authorization check: Only the applicant or the job owner can view this application
  const isApplicant = application.applicant_id === user.id;
  const isJobOwner = application.job.employer_id === user.id;

  if (!isApplicant && !isJobOwner) {
    redirect('/dashboard/applications');
  }

  // Check if the employer is a Pro subscriber (for custom questions access)
  const employerIsPro = application.job.employer?.subscription_status === 'pro';

  // Parse custom_answers if it exists
  const customAnswers = application.custom_answers || {};
  const customQuestions = application.job.custom_questions || [];

  // Parse form_data if it exists
  const formData = application.form_data || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/dashboard/applications">
        <Button variant="outline">← Back to Applications</Button>
      </Link>

      {/* Application Header */}
      <Card className="shadow-xl border-2 border-krewup-light-blue">
        <CardHeader className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-2xl mb-2">
                Application Details
              </CardTitle>
              <p className="text-white/90 text-lg">
                {isEmployer ? `Application from ${application.applicant.name}` : `Application to ${application.job.title}`}
              </p>
            </div>
            <Badge
              variant={
                application.status === 'pending'
                  ? 'warning'
                  : application.status === 'hired'
                  ? 'success'
                  : application.status === 'rejected'
                  ? 'danger'
                  : application.status === 'viewed'
                  ? 'info'
                  : 'default'
              }
              className="text-lg px-4 py-2 capitalize"
            >
              {application.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Applicant Info (for employers) */}
          {isEmployer && (
            <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl p-6 border-2 border-krewup-light-blue">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Applicant Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-2xl shadow-lg">
                    {application.applicant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-gray-900">{application.applicant.name}</h4>
                      {application.applicant.is_profile_boosted &&
                        application.applicant.boost_expires_at &&
                        new Date(application.applicant.boost_expires_at) > new Date() && (
                          <Badge
                            variant="warning"
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none"
                          >
                            ⭐ Boosted
                          </Badge>
                        )}
                    </div>
                    <p className="text-gray-600">
                      {application.applicant.trade}
                      {application.applicant.sub_trade && ` - ${application.applicant.sub_trade}`}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Location</p>
                    <p className="text-gray-900">{application.applicant.location}</p>
                  </div>
                  {application.applicant.phone && (
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Phone</p>
                      <p className="text-gray-900">{application.applicant.phone}</p>
                    </div>
                  )}
                  {application.applicant.email && (
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Email</p>
                      <p className="text-gray-900">{application.applicant.email}</p>
                    </div>
                  )}
                </div>

                {application.applicant.bio && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">About</p>
                    <p className="text-gray-700">{application.applicant.bio}</p>
                  </div>
                )}

                <div className="pt-3 flex gap-3">
                  <MessageButton
                    recipientId={application.applicant.id}
                    recipientName={application.applicant.name}
                    variant="primary"
                  />
                  <Link href={`/dashboard/profiles/${application.applicant.id}`}>
                    <Button variant="outline">View Full Profile</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Job Info (for workers) */}
          {isWorker && (
            <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl p-6 border-2 border-krewup-light-blue">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">💼</span>
                Job Information
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{application.job.title}</h4>
                  <p className="text-gray-600">
                    {application.job.trade}
                    {application.job.sub_trade && ` - ${application.job.sub_trade}`}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Location</p>
                    <p className="text-gray-900">{application.job.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Pay Rate</p>
                    {application.job.subtrade_pay_rates && Object.keys(application.job.subtrade_pay_rates).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(application.job.subtrade_pay_rates).map(([subtrade, rate]) => (
                          <div key={subtrade} className="text-sm">
                            <span className="font-semibold text-gray-700">{subtrade}:</span>{' '}
                            <span className="text-krewup-orange font-bold">{String(rate)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-krewup-orange font-bold">{application.job.pay_rate}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Job Type</p>
                    <p className="text-gray-900">{application.job.job_type}</p>
                  </div>
                </div>

                <div className="pt-3">
                  <Link href={`/dashboard/jobs/${application.job.id}`}>
                    <Button variant="outline">View Full Job Post</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Cover Letter / Form Data */}
          {(formData.coverLetterText || application.cover_letter || application.cover_message) && (
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Cover Letter
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg p-4 border-l-4 border-krewup-blue">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {formData.coverLetterText || application.cover_letter || application.cover_message}
                </p>
              </div>
            </div>
          )}

          {/* Additional Form Data */}
          {formData && Object.keys(formData).filter(key => key !== 'coverLetterText' && key !== 'consents').length > 0 && (
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Application Details
              </h3>
              <div className="space-y-6">
                {/* Personal Information */}
                {formData.fullName && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Personal Information</h4>
                    <div className="space-y-2 ml-4">
                      <div className="grid grid-cols-3 gap-4">
                        <p className="text-sm font-medium text-gray-500">Full Name:</p>
                        <p className="text-gray-900 col-span-2">{formData.fullName}</p>
                      </div>
                      {formData.address && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Address:</p>
                          <p className="text-gray-900 col-span-2">
                            {formData.address.street && `${formData.address.street}, `}
                            {formData.address.city && `${formData.address.city}, `}
                            {formData.address.state && `${formData.address.state} `}
                            {formData.address.zipCode}
                          </p>
                        </div>
                      )}
                      {formData.phoneNumber && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Phone:</p>
                          <p className="text-gray-900 col-span-2">{formData.phoneNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Work Authorization */}
                {(formData.authorizedToWork !== undefined || formData.hasDriversLicense !== undefined) && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Work Authorization</h4>
                    <div className="space-y-2 ml-4">
                      {formData.authorizedToWork !== undefined && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Authorized to Work:</p>
                          <p className="text-gray-900 col-span-2">{formData.authorizedToWork ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {formData.hasDriversLicense !== undefined && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Driver's License:</p>
                          <p className="text-gray-900 col-span-2">
                            {formData.hasDriversLicense ? 'Yes' : 'No'}
                            {formData.licenseClass && ` (Class ${formData.licenseClass})`}
                          </p>
                        </div>
                      )}
                      {formData.hasReliableTransportation !== undefined && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Reliable Transportation:</p>
                          <p className="text-gray-900 col-span-2">{formData.hasReliableTransportation ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Work History */}
                {formData.workHistory && formData.workHistory.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Work History</h4>
                    <div className="space-y-3 ml-4">
                      {formData.workHistory.map((work: any, index: number) => (
                        <div key={index} className="border-l-4 border-krewup-blue pl-4 py-2">
                          <p className="font-semibold text-gray-900">{work.jobTitle}</p>
                          <p className="text-gray-700">{work.companyName}</p>
                          <p className="text-sm text-gray-600">
                            {work.startDate} - {work.endDate || (work.isCurrent ? 'Present' : 'N/A')}
                          </p>
                          {work.responsibilities && (
                            <p className="text-sm text-gray-600 mt-1">{work.responsibilities}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {formData.education && formData.education.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Education</h4>
                    <div className="space-y-3 ml-4">
                      {formData.education.map((edu: any, index: number) => (
                        <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                          <p className="font-semibold text-gray-900">{edu.degreeType} in {edu.fieldOfStudy}</p>
                          <p className="text-gray-700">{edu.institutionName}</p>
                          <p className="text-sm text-gray-600">
                            {edu.isCurrentlyEnrolled ? 'Currently Enrolled' : `Graduated ${edu.graduationYear}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills & Certifications */}
                {(formData.tradeSkills || formData.certifications || formData.yearsOfExperience) && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Skills & Certifications</h4>
                    <div className="space-y-2 ml-4">
                      {formData.yearsOfExperience && (
                        <div className="grid grid-cols-3 gap-4">
                          <p className="text-sm font-medium text-gray-500">Years of Experience:</p>
                          <p className="text-gray-900 col-span-2">{formData.yearsOfExperience}</p>
                        </div>
                      )}
                      {formData.tradeSkills && formData.tradeSkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Trade Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {formData.tradeSkills.map((skill: string, index: number) => (
                              <Badge key={index} variant="info">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.certifications && formData.certifications.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Certifications:</p>
                          <div className="space-y-2">
                            {formData.certifications.map((cert: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-lg">📜</span>
                                <span className="text-gray-900">{cert.name}</span>
                                {cert.expirationDate && (
                                  <span className="text-sm text-gray-500">(Expires: {cert.expirationDate})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References */}
                {formData.references && formData.references.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Professional References</h4>
                    <div className="space-y-3 ml-4">
                      {formData.references.map((ref: any, index: number) => (
                        <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                          <p className="font-semibold text-gray-900">{ref.name}</p>
                          <p className="text-gray-700">{ref.relationship} at {ref.company}</p>
                          <p className="text-sm text-gray-600">{ref.phone} | {ref.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {formData.emergencyContact && formData.emergencyContact.name && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Emergency Contact</h4>
                    <div className="space-y-2 ml-4">
                      <div className="grid grid-cols-3 gap-4">
                        <p className="text-sm font-medium text-gray-500">Name:</p>
                        <p className="text-gray-900 col-span-2">{formData.emergencyContact.name}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <p className="text-sm font-medium text-gray-500">Relationship:</p>
                        <p className="text-gray-900 col-span-2">{formData.emergencyContact.relationship}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <p className="text-sm font-medium text-gray-500">Phone:</p>
                        <p className="text-gray-900 col-span-2">{formData.emergencyContact.phone}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Fields */}
                {formData.whyInterested && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Why Interested</h4>
                    <p className="text-gray-900 ml-4">{formData.whyInterested}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resume & Cover Letter Files */}
          {(application.resume_url || application.cover_letter_url) && (
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">📎</span>
                Attachments
              </h3>
              <div className="flex gap-3">
                {application.resume_url && (
                  <a
                    href={application.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-krewup-blue text-white hover:bg-krewup-light-blue transition-colors"
                  >
                    📄 View Resume
                  </a>
                )}
                {application.cover_letter_url && (
                  <a
                    href={application.cover_letter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-krewup-blue text-white hover:bg-krewup-light-blue transition-colors"
                  >
                    📄 View Cover Letter
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Custom Screening Questions & Answers (Pro Feature for Employers) */}
          {isEmployer && customQuestions.length > 0 && (
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">❓</span>
                  Screening Questions
                </h3>
                {!employerIsPro && (
                  <Badge variant="warning" className="text-sm">
                    Pro Feature
                  </Badge>
                )}
              </div>

              {employerIsPro ? (
                <div className="space-y-4">
                  {customQuestions.map((question: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Q{index + 1}: {question.question || question.text || 'Question text not available'}
                      </p>
                      <p className="text-gray-900 bg-white rounded p-3 border-l-4 border-krewup-blue">
                        {customAnswers[index.toString()] || 'No answer provided'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Upgrade to Pro</strong> to view custom screening question answers from applicants.
                    This helps you make better hiring decisions by seeing detailed responses to your custom questions.
                  </p>
                  <Link href="/dashboard/subscription">
                    <Button variant="primary" className="mt-3">
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Application Metadata */}
          <div className="border-t-2 border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              Applied on{' '}
              {new Date(application.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
