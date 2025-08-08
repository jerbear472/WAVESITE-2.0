import Link from 'next/link'
import WaveSightLogo from '@/components/WaveSightLogo'
import Header from '@/components/Header'
import { Mail, MessageCircle, Users, HelpCircle } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Main Content */}
      <div className="flex-1 px-4 py-20 pt-32">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
              Get in <span className="text-blue-600 font-normal">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions about WaveSight? We're here to help you make the most of trend spotting and analytics.
            </p>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Email Contact */}
            <div className="card card-hover">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Email Support</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get direct support from our team
                </p>
                <a 
                  href="mailto:jeremyuys@gmail.com"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  jeremyuys@gmail.com
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Community */}
            <div className="card card-hover">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Community</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Connect with other trend spotters
                </p>
                <span className="text-gray-500 dark:text-gray-500">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Contact Form Alternative */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 mb-16 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Quick Questions?</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                For the fastest response, email us directly at <strong>jeremyuys@gmail.com</strong>. 
                We typically respond within 24 hours.
              </p>
              <a 
                href="mailto:jeremyuys@gmail.com?subject=WaveSight%20Inquiry"
                className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
              >
                Send Email
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">Common Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <h4 className="font-medium mb-2">How do earnings work?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Earn money by submitting trending content and validating others' submissions. 
                      Base payment is 50¢ per trend with bonuses available.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Enterprise access?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enterprise users get access to advanced analytics, data exports, 
                      and API access. Email us for pricing and setup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-neutral-800">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <WaveSightLogo size="sm" showIcon={true} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 All rights reserved.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Terms
              </Link>
              <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}