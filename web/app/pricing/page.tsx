'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, X, Zap, Crown, Rocket, Building, ArrowRight } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  billing: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  limitations: string[];
  cta: string;
  popular?: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const pricingTiers: PricingTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: billingPeriod === 'monthly' ? '$499' : '$399',
      billing: billingPeriod === 'monthly' ? '/month' : '/month (billed annually)',
      icon: <Zap className="w-8 h-8" />,
      color: 'from-gray-500 to-gray-600',
      features: [
        '100 trend reports per month',
        'Basic analytics dashboard',
        'Email alerts for trending topics',
        '1 user seat',
        '7-day data history',
        'CSV export'
      ],
      limitations: [
        'No API access',
        'Limited to 3 categories',
        'No real-time updates'
      ],
      cta: 'Start Free Trial'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: billingPeriod === 'monthly' ? '$1,999' : '$1,599',
      billing: billingPeriod === 'monthly' ? '/month' : '/month (billed annually)',
      icon: <Crown className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      features: [
        'Unlimited trend access',
        'Advanced analytics & insights',
        'API access (10,000 calls/month)',
        '5 user seats',
        'Custom alerts & notifications',
        'All export formats (CSV, JSON, Excel, PDF)',
        'Integration with Slack & Teams',
        '90-day data history',
        'Sentiment analysis',
        'Competitor tracking'
      ],
      limitations: [
        'Standard support',
        'Pre-built ML models only'
      ],
      cta: 'Start Pro Trial',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingPeriod === 'monthly' ? '$4,999' : '$3,999',
      billing: billingPeriod === 'monthly' ? '/month' : '/month (billed annually)',
      icon: <Rocket className="w-8 h-8" />,
      color: 'from-cyan-500 to-blue-500',
      features: [
        'Everything in Professional',
        'Unlimited API calls',
        'Unlimited user seats',
        'Custom ML models',
        'Dedicated account manager',
        'White-label options',
        'Priority trend validation',
        'Custom integrations',
        'Unlimited data history',
        'Advanced predictive analytics',
        '99.9% SLA guarantee',
        'Custom onboarding & training'
      ],
      limitations: [],
      cta: 'Contact Sales'
    },
    {
      id: 'hedge_fund',
      name: 'Hedge Fund',
      price: 'Custom',
      billing: 'Contact for pricing',
      icon: <Building className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      features: [
        'Everything in Enterprise',
        'Microsecond data delivery',
        'Direct market data feeds',
        'Custom trading algorithms',
        'Compliance tools & reporting',
        'Historical trend analysis (5+ years)',
        'Dedicated infrastructure',
        'Co-location options',
        'Regulatory compliance features',
        'Multi-region deployment',
        'Custom risk models',
        '24/7 dedicated support'
      ],
      limitations: [],
      cta: 'Schedule Demo'
    }
  ];

  const handleSubscribe = (tierId: string) => {
    if (tierId === 'enterprise' || tierId === 'hedge_fund') {
      router.push('/contact-sales');
    } else {
      router.push(`/subscribe?plan=${tierId}&billing=${billingPeriod}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Unlock the power of real-time trend intelligence for your business
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={billingPeriod === 'monthly' ? 'text-white' : 'text-gray-500'}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-7 bg-gray-800 rounded-full transition-colors"
            >
              <motion.div
                animate={{ x: billingPeriod === 'monthly' ? 2 : 26 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 bg-cyan-500 rounded-full"
              />
            </button>
            <span className={billingPeriod === 'annual' ? 'text-white' : 'text-gray-500'}>
              Annual
            </span>
            {billingPeriod === 'annual' && (
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                Save 20%
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-2xl p-6 ${
                tier.popular
                  ? 'bg-gradient-to-b from-purple-900/20 to-pink-900/20 border-2 border-purple-500'
                  : 'bg-gray-900/50 border border-gray-800'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${tier.color} mb-4`}>
                {tier.icon}
              </div>

              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-gray-400">{tier.billing}</span>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {tier.features.map((feature, featureIdx) => (
                  <div key={featureIdx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
                {tier.limitations.map((limitation, limitIdx) => (
                  <div key={limitIdx} className="flex items-start gap-2">
                    <X className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(tier.id)}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800"
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Detailed Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Starter</th>
                  <th className="text-center py-4 px-4">Professional</th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                  <th className="text-center py-4 px-4">Hedge Fund</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Trend Reports', '100/month', 'Unlimited', 'Unlimited', 'Unlimited'],
                  ['Real-time Updates', '❌', '✅', '✅', '✅'],
                  ['API Access', '❌', '10K calls/mo', 'Unlimited', 'Unlimited'],
                  ['User Seats', '1', '5', 'Unlimited', 'Unlimited'],
                  ['Data History', '7 days', '90 days', 'Unlimited', '5+ years'],
                  ['Custom ML Models', '❌', '❌', '✅', '✅'],
                  ['White Label', '❌', '❌', '✅', '✅'],
                  ['Support', 'Email', 'Priority', 'Dedicated', '24/7'],
                  ['SLA', '❌', '❌', '99.9%', '99.99%']
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50">
                    <td className="py-3 px-4 font-medium">{row[0]}</td>
                    {row.slice(1).map((cell, cellIdx) => (
                      <td key={cellIdx} className="py-3 px-4 text-center">
                        {cell === '✅' ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : cell === '❌' ? (
                          <X className="w-5 h-5 text-gray-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            {
              q: 'Can I change plans anytime?',
              a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.'
            },
            {
              q: 'Is there a free trial?',
              a: 'Yes, we offer a 14-day free trial for Starter and Professional plans. No credit card required.'
            },
            {
              q: 'What kind of support do you offer?',
              a: 'Support varies by plan: email support for Starter, priority support for Professional, and dedicated account management for Enterprise and Hedge Fund plans.'
            },
            {
              q: 'Can I get a custom plan?',
              a: 'Absolutely! Contact our sales team to discuss custom solutions tailored to your specific needs.'
            }
          ].map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
              className="bg-gray-900/50 rounded-xl p-6 border border-gray-800"
            >
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-gray-400">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}