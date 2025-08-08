import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">
              © {new Date().getFullYear()} WaveSight. All rights reserved.
            </p>
          </div>
          
          <nav className="flex gap-6">
            <Link 
              href="/terms" 
              className="text-sm hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <a 
              href="mailto:support@wavesight.com" 
              className="text-sm hover:text-white transition-colors"
            >
              Support
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}