'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, Link, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProofLink {
  url: string;
  platform: string;
  views: string;
  description: string;
}

interface ProofSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionId: string;
  trendTitle: string;
  originalLink: string;
  onSuccess: () => void;
}

export default function ProofSubmissionModal({
  isOpen,
  onClose,
  predictionId,
  trendTitle,
  originalLink,
  onSuccess
}: ProofSubmissionModalProps) {
  const [proofLinks, setProofLinks] = useState<ProofLink[]>([
    { url: '', platform: 'tiktok', views: '', description: '' }
  ]);
  const [totalViews, setTotalViews] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addProofLink = () => {
    setProofLinks([...proofLinks, { url: '', platform: 'tiktok', views: '', description: '' }]);
  };

  const removeProofLink = (index: number) => {
    setProofLinks(proofLinks.filter((_, i) => i !== index));
  };

  const updateProofLink = (index: number, field: keyof ProofLink, value: string) => {
    const updated = [...proofLinks];
    updated[index] = { ...updated[index], [field]: value };
    setProofLinks(updated);
  };

  const handleSubmit = async () => {
    // Validate at least one proof link
    const validLinks = proofLinks.filter(link => link.url && link.views);
    if (validLinks.length === 0) {
      alert('Please provide at least one proof link with view count');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('submit_spike_proof', {
        p_prediction_id: predictionId,
        p_user_id: user.id,
        p_proof_links: validLinks,
        p_total_views: parseInt(totalViews) || null
      });

      if (error) throw error;

      alert(`Proof submitted! You earned ${50 + (validLinks.length - 1) * 20} XP!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting proof:', error);
      alert('Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Submit Spike Proof</h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-400 mt-2">
                  Prove that "{trendTitle}" has spiked!
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Original Link Reference */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Original prediction:</p>
                  <a
                    href={originalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center space-x-2"
                  >
                    <Link className="h-4 w-4" />
                    <span className="truncate">{originalLink}</span>
                  </a>
                </div>

                {/* Proof Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Proof Links (showing the trend has spiked)
                  </label>
                  
                  {proofLinks.map((link, index) => (
                    <div key={index} className="mb-4 p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-purple-400">
                          Evidence #{index + 1} {index > 0 && `(+20 XP)`}
                        </span>
                        {proofLinks.length > 1 && (
                          <button
                            onClick={() => removeProofLink(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="url"
                          placeholder="Link to viral video/post"
                          value={link.url}
                          onChange={(e) => updateProofLink(index, 'url', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                        
                        <select
                          value={link.platform}
                          onChange={(e) => updateProofLink(index, 'platform', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                          <option value="twitter">Twitter/X</option>
                          <option value="reddit">Reddit</option>
                          <option value="other">Other</option>
                        </select>
                        
                        <input
                          type="text"
                          placeholder="View count (e.g., 2.5M)"
                          value={link.views}
                          onChange={(e) => updateProofLink(index, 'views', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                        
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={link.description}
                          onChange={(e) => updateProofLink(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addProofLink}
                    className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add more evidence (+20 XP each)</span>
                  </button>
                </div>

                {/* Total Views */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Combined Views (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 10000000"
                    value={totalViews}
                    onChange={(e) => setTotalViews(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Tips */}
                <div className="bg-purple-900/30 rounded-lg p-4">
                  <h4 className="font-bold text-purple-400 mb-2">💡 Tips for Strong Proof:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Link multiple videos showing the same trend</li>
                    <li>• Include videos from different creators</li>
                    <li>• Show spread across different platforms</li>
                    <li>• Higher view counts = stronger proof</li>
                    <li>• More evidence links = more XP!</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Base: 50 XP + {Math.max(0, (proofLinks.filter(l => l.url).length - 1) * 20)} XP for extra links
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Proof'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}