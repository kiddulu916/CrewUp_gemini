import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import {
  Briefcase,
  Shield,
  Users,
  Zap,
  MapPin,
  Award,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  Star,
  ArrowRight,
} from 'lucide-react';

// * SEO Metadata
export const metadata: Metadata = {
  title: 'KrewUp - Connect Skilled Trade Workers with Employers',
  description:
    'The premier platform for skilled trade professionals. Find jobs, connect with employers, and grow your career in construction, electrical, plumbing, HVAC, and more.',
  keywords: [
    'trade jobs',
    'skilled workers',
    'construction jobs',
    'electrical jobs',
    'plumbing jobs',
    'HVAC jobs',
    'contractor jobs',
    'blue collar jobs',
    'trade professionals',
  ],
  openGraph: {
    title: 'KrewUp - Connect Skilled Trade Workers with Employers',
    description:
      'The premier platform for skilled trade professionals. Find jobs, connect with employers, and grow your career.',
    type: 'website',
    url: 'https://krewup.net',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'KrewUp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KrewUp - Trade Jobs Platform',
    description: 'Connect skilled trade workers with employers.',
  },
};

const FEATURES = [
  {
    icon: MapPin,
    title: 'Location-Based Matching',
    description: 'Find jobs and workers near you with our smart proximity search.',
  },
  {
    icon: Shield,
    title: 'Verified Credentials',
    description: 'Showcase your certifications and licenses with verified badges.',
  },
  {
    icon: MessageCircle,
    title: 'Direct Messaging',
    description: 'Connect directly with employers or workers without intermediaries.',
  },
  {
    icon: Award,
    title: 'Portfolio Showcase',
    description: 'Display your best work and build your professional reputation.',
  },
  {
    icon: TrendingUp,
    title: 'Career Growth',
    description: 'Track your experience and level up your trade career.',
  },
  {
    icon: Zap,
    title: 'Instant Alerts',
    description: 'Get notified immediately when matching opportunities appear.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      "KrewUp helped me find my first commercial electrical job. The process was smooth and I love being able to showcase my certifications.",
    name: 'Mike Rodriguez',
    role: 'Licensed Electrician',
    location: 'Chicago, IL',
    rating: 5,
  },
  {
    quote:
      "As a contractor, finding qualified skilled workers used to take weeks. Now I can fill positions in days with verified professionals.",
    name: 'Sarah Chen',
    role: 'General Contractor',
    location: 'Austin, TX',
    rating: 5,
  },
  {
    quote:
      "The portfolio feature is amazing. I uploaded photos of my work and started getting job offers within a week.",
    name: 'James Wilson',
    role: 'Master Plumber',
    location: 'Denver, CO',
    rating: 5,
  },
];

const TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'Welding',
  'Masonry',
  'Roofing',
  'Painting',
  'Landscaping',
  'General Labor',
];

export default async function Home() {
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
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="KrewUp" width={40} height={40} />
              <span className="text-xl font-bold text-slate-900">KrewUp</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </Link>
              {user ? (
                <Link href="/dashboard/feed">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button>Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 opacity-10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-tight mb-6">
              Where{' '}
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Skilled Workers
              </span>{' '}
              Meet{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Great Jobs
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto">
              The premier platform connecting trade professionals with employers. Find your next
              opportunity or hire verified skilled workers today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link href="/dashboard/feed">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                      Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-lg px-8 py-6"
                    >
                      View Pricing
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Active Workers' },
              { value: '5K+', label: 'Jobs Posted' },
              { value: '1K+', label: 'Employers' },
              { value: '95%', label: 'Match Rate' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-slate-600 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trades Ticker */}
      <section className="py-8 bg-slate-900 overflow-hidden">
        <div className="flex animate-scroll">
          {[...TRADES, ...TRADES].map((trade, i) => (
            <div
              key={`${trade}-${i}`}
              className="flex items-center gap-4 px-8 text-white/80 whitespace-nowrap"
            >
              <Briefcase className="h-5 w-5" />
              <span className="text-lg font-medium">{trade}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for the skilled trades industry
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Get started in minutes with our simple process
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* For Workers */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-8 w-8 text-blue-400" />
                <h3 className="text-2xl font-bold text-white">For Workers</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Create Profile', desc: 'Sign up and build your professional profile' },
                  { step: '2', title: 'Add Credentials', desc: 'Upload certifications and showcase your work' },
                  { step: '3', title: 'Get Matched', desc: 'Receive job matches based on your skills and location' },
                  { step: '4', title: 'Start Working', desc: 'Connect directly with employers and land your job' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      <p className="text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Employers */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="h-8 w-8 text-orange-400" />
                <h3 className="text-2xl font-bold text-white">For Employers</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Post Jobs', desc: 'Create detailed job listings with your requirements' },
                  { step: '2', title: 'Review Applicants', desc: 'Browse verified profiles and credentials' },
                  { step: '3', title: 'Message Directly', desc: 'Connect with candidates through our platform' },
                  { step: '4', title: 'Hire Confidently', desc: 'Make offers to verified skilled professionals' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      <p className="text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Trusted by Trade Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              See what our community is saying about KrewUp
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">
                      {testimonial.role} • {testimonial.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Build Your Future?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of trade professionals and employers already using KrewUp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-blue-50"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-white text-white hover:bg-white/10"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="KrewUp" width={32} height={32} />
                <span className="text-lg font-bold text-white">KrewUp</span>
              </div>
              <p className="text-sm">
                Connecting skilled trade workers with employers since 2024.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/legal/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>support@krewup.net</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} KrewUp. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
