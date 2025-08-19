'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Clock, Users, DollarSign, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface BountyFormData {
  title: string;
  description: string;
  requirements: string[];
  totalSpots: number;
  urgencyLevel: 'lightning' | 'rapid' | 'standard';
  pricePerSpot: number;
  targetDemographics: {
    ageRange?: [number, number];
    location?: string[];
    interests?: string[];
  };
  targetPlatforms: string[];
  targetExpertise: string[];
  webhookUrl?: string;
  notificationEmail?: string;
}

const URGENCY_OPTIONS = [
  { 
    value: 'lightning', 
    label: '⚡ Lightning', 
    duration: 5, 
    price: 3.00,
    description: '5 minutes - Instant results'
  },
  { 
    value: 'rapid', 
    label: '🔥 Rapid', 
    duration: 30, 
    price: 2.00,
    description: '30 minutes - Quick turnaround'
  },
  { 
    value: 'standard', 
    label: '⏰ Standard', 
    duration: 120, 
    price: 1.50,
    description: '2 hours - Cost effective'
  },
];

const SPOT_OPTIONS = [25, 50, 100, 250, 500];

const PLATFORM_OPTIONS = [
  'TikTok', 'Instagram', 'Twitter/X', 'Reddit', 'YouTube', 
  'LinkedIn', 'Facebook', 'Snapchat', 'Pinterest', 'Discord'
];

const EXPERTISE_OPTIONS = [
  'Healthcare', 'Technology', 'Finance', 'Education', 'Retail',
  'Fashion', 'Food & Beverage', 'Gaming', 'Sports', 'Entertainment'
];

export function BountyCreator({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<BountyFormData>({
    title: '',
    description: '',
    requirements: [''],
    totalSpots: 50,
    urgencyLevel: 'rapid',
    pricePerSpot: 2.00,
    targetDemographics: {},
    targetPlatforms: [],
    targetExpertise: [],
    webhookUrl: '',
    notificationEmail: '',
  });

  const selectedUrgency = URGENCY_OPTIONS.find(u => u.value === formData.urgencyLevel);
  const totalCost = formData.totalSpots * formData.pricePerSpot;

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter(p => p !== platform)
        : [...prev.targetPlatforms, platform]
    }));
  };

  const toggleExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      targetExpertise: prev.targetExpertise.includes(expertise)
        ? prev.targetExpertise.filter(e => e !== expertise)
        : [...prev.targetExpertise, expertise]
    }));
  };

  const createBounty = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (selectedUrgency?.duration || 30));

      const { error } = await supabase.from('bounties').insert({
        enterprise_id: userData.user.id,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements.filter(r => r.trim()),
        price_per_spot: formData.pricePerSpot,
        total_spots: formData.totalSpots,
        urgency_level: formData.urgencyLevel,
        duration_minutes: selectedUrgency?.duration,
        expires_at: expiresAt.toISOString(),
        target_demographics: formData.targetDemographics,
        target_platforms: formData.targetPlatforms,
        target_expertise: formData.targetExpertise,
        webhook_url: formData.webhookUrl,
        notification_email: formData.notificationEmail,
      });

      if (error) throw error;

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating bounty:', error);
      alert('Failed to create bounty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Create Bounty</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                step <= currentStep ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">What do you need?</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Find reactions to our Super Bowl ad"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Detailed Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide context and specific details..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Requirements (what to look for)</label>
                {formData.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      placeholder={`Requirement ${index + 1}`}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        onClick={() => removeRequirement(index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRequirement}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  + Add requirement
                </button>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                disabled={!formData.title || !formData.description}
                className="w-full py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Pricing & Urgency
              </button>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">How many examples do you need?</label>
                <div className="grid grid-cols-5 gap-2">
                  {SPOT_OPTIONS.map((spots) => (
                    <button
                      key={spots}
                      onClick={() => setFormData(prev => ({ ...prev, totalSpots: spots }))}
                      className={`py-3 rounded-lg font-medium transition-colors ${
                        formData.totalSpots === spots
                          ? 'bg-cyan-500 text-black'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {spots}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="number"
                    value={formData.totalSpots}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSpots: parseInt(e.target.value) || 0 }))}
                    placeholder="Custom amount"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Urgency Level</label>
                <div className="space-y-2">
                  {URGENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        urgencyLevel: option.value as any, 
                        pricePerSpot: option.price 
                      }))}
                      className={`w-full p-4 rounded-lg border transition-all ${
                        formData.urgencyLevel === option.value
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-gray-800 border-gray-700 text-white hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{option.label}</span>
                          <span className="text-sm text-gray-400">{option.description}</span>
                        </div>
                        <span className="text-xl font-bold">${option.price}/spot</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total Cost:</span>
                  <span className="text-cyan-400">${totalCost.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {formData.totalSpots} spots × ${formData.pricePerSpot.toFixed(2)} each
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  Next: Targeting
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Target Platforms (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                        formData.targetPlatforms.includes(platform)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Expertise (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPERTISE_OPTIONS.map((expertise) => (
                    <button
                      key={expertise}
                      onClick={() => toggleExpertise(expertise)}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                        formData.targetExpertise.includes(expertise)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {expertise}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL (optional)</label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://your-api.com/webhook"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notification Email (optional)</label>
                <input
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  placeholder="alerts@company.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold mb-3">Bounty Summary</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Title:</span>
                    <span>{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spots:</span>
                    <span>{formData.totalSpots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span>{selectedUrgency?.description}</span>
                  </div>
                  <div className="flex justify-between font-bold text-cyan-400">
                    <span>Total Cost:</span>
                    <span>${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={createBounty}
                  disabled={loading}
                  className="flex-1 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'POST BOUNTY'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}