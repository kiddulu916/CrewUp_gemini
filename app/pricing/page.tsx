import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PricingCard } from '@/features/subscriptions/components/pricing-card';
import { Button } from '@/components/ui';
import { Check, X, HelpCircle, ArrowRight } from 'lucide-react';

// * SEO Metadata
export const metadata: Metadata = {
  title: 'Pricing - KrewUp Pro | Trade Jobs Platform',
  description:
    'Choose the plan that fits your needs. KrewUp Free lets you get started, Pro unlocks advanced features for serious trade professionals and employers.',
  openGraph: {
    title: 'KrewUp Pricing - Plans for Trade Professionals',
    description: 'Free and Pro plans for workers and employers. Start free, upgrade when ready.',
    type: 'website',
    url: 'https://krewup.net/pricing',
  },
};

// * Feature comparison data
const WORKER_FEATURES = [
  { name: 'Create professional profile', free: true, pro: true },
  { name: 'Browse and apply to jobs', free: true, pro: true },
  { name: 'Direct messaging', free: true, pro: true },
  { name: 'Upload certifications', free: true, pro: true },
  { name: 'Portfolio photos', free: '5 photos', pro: 'Unlimited' },
  { name: 'Profile boost (appear first to employers)', free: false, pro: true },
  { name: 'Proximity alerts for new jobs', free: false, pro: true },
  { name: 'See who viewed your profile', free: false, pro: true },
  { name: 'Priority support', free: false, pro: true },
];

const EMPLOYER_FEATURES = [
  { name: 'Post unlimited jobs', free: true, pro: true },
  { name: 'Browse worker profiles', free: true, pro: true },
  { name: 'Direct messaging', free: true, pro: true },
  { name: 'Receive applications', free: true, pro: true },
  { name: 'Custom screening questions', free: false, pro: 'Up to 5 per job' },
  { name: 'Filter by verified certifications', free: false, pro: true },
  { name: 'Job analytics dashboard', free: false, pro: true },
  { name: 'Application insights', free: false, pro: true },
  { name: 'Priority support', free: false, pro: true },
];

const FAQS = [
  {
    question: 'Can I switch plans anytime?',
    answer:
      'Yes! You can upgrade to Pro at any time to unlock advanced features. If you cancel Pro, you will retain access until the end of your billing period.',
  },
  {
    question: 'Is there a free trial for Pro?',
    answer:
      'We do not offer a free trial, but you can start with our Free plan to experience the platform. Upgrade when you are ready for more features.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment partner Stripe.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Absolutely. You can cancel anytime from your account settings. No questions asked, and you will keep Pro access until your billing period ends.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a 7-day money-back guarantee for new Pro subscribers. Contact support@krewup.net if you are not satisfied.',
  },
  {
    question: 'Is my payment information secure?',
    answer:
      'Yes, all payments are processed through Stripe, a PCI Level 1 certified payment processor. We never store your card details.',
  },
];

function FeatureRow({
  name,
  free,
  pro,
}: {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-4 pr-4 text-slate-700">{name}</td>
      <td className="py-4 text-center">
        {free === true ? (
          <Check className="h-5 w-5 text-green-500 mx-auto" />
        ) : free === false ? (
          <X className="h-5 w-5 text-slate-300 mx-auto" />
        ) : (
          <span className="text-sm text-slate-600">{free}</span>
        )}
      </td>
      <td className="py-4 text-center">
        {pro === true ? (
          <Check className="h-5 w-5 text-green-500 mx-auto" />
        ) : pro === false ? (
          <X className="h-5 w-5 text-slate-300 mx-auto" />
        ) : (
          <span className="text-sm font-medium text-blue-600">{pro}</span>
        )}
      </td>
    </tr>
  );
}

export default async function PricingPage() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="KrewUp" width={40} height={40} />
              <span className="text-xl font-bold text-slate-900">KrewUp</span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/dashboard/feed">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Start free and upgrade when you&apos;re ready. Pro unlocks powerful features to help you
            succeed.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 -mt-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Free</h3>
                <p className="text-slate-600 mt-2">
                  Everything you need to get started
                </p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-600 ml-2">forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Create your profile',
                  'Browse and apply to jobs',
                  'Direct messaging',
                  'Upload certifications',
                  '5 portfolio photos',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-700">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={user ? '/dashboard/feed' : '/signup'} className="block">
                <Button variant="outline" className="w-full" size="lg">
                  {user ? 'Go to Dashboard' : 'Get Started Free'}
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold">Pro</h3>
                <p className="text-blue-100 mt-2">
                  For serious professionals
                </p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">$15</span>
                  <span className="text-blue-100">/month</span>
                </div>
                <p className="text-sm text-blue-200 mt-1">or $150/year (save 17%)</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'Unlimited portfolio photos',
                  'Profile boost visibility',
                  'Proximity alerts for jobs',
                  'Custom screening questions',
                  'Analytics dashboard',
                  'Priority support',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-blue-200 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={user ? '/dashboard/subscription' : '/signup'} className="block">
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50" size="lg">
                  {user ? 'Upgrade to Pro' : 'Start with Pro'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Compare Plans
            </h2>
            <p className="text-xl text-slate-600">
              See exactly what you get with each plan
            </p>
          </div>

          {/* Worker Features */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                W
              </span>
              For Workers
            </h3>
            <div className="bg-slate-50 rounded-xl p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 pr-4 text-slate-600 font-medium">Feature</th>
                    <th className="py-3 text-center text-slate-600 font-medium w-24">Free</th>
                    <th className="py-3 text-center text-blue-600 font-bold w-24">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {WORKER_FEATURES.map((feature) => (
                    <FeatureRow key={feature.name} {...feature} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employer Features */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                E
              </span>
              For Employers
            </h3>
            <div className="bg-slate-50 rounded-xl p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 pr-4 text-slate-600 font-medium">Feature</th>
                    <th className="py-3 text-center text-slate-600 font-medium w-24">Free</th>
                    <th className="py-3 text-center text-blue-600 font-bold w-24">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {EMPLOYER_FEATURES.map((feature) => (
                    <FeatureRow key={feature.name} {...feature} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Got questions? We&apos;ve got answers.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100"
              >
                <h3 className="text-lg font-semibold text-slate-900 flex items-start gap-3">
                  <HelpCircle className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
                  {faq.question}
                </h3>
                <p className="text-slate-600 mt-3 ml-9">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of trade professionals already using KrewUp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-blue-50"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="KrewUp" width={24} height={24} />
            <span className="text-sm">© {new Date().getFullYear()} KrewUp. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
