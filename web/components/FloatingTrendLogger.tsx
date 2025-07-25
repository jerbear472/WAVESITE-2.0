'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Hash, Heart, Zap, ShoppingBag, Music, Palette, Code, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingTrendLoggerProps {
  isVisible: boolean;
  onTrendLogged?: () => void;
}

const categories = [
  { id: 'fashion', name: 'Fashion', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  { id: 'wellness', name: 'Wellness', icon: Heart, color: 'from-green-500 to-emerald-500' },
  { id: 'meme', name: 'Meme', icon: Hash, color: 'from-purple-500 to-indigo-500' },
  { id: 'audio', name: 'Audio', icon: Music, color: 'from-blue-500 to-cyan-500' },
  { id: 'tech', name: 'Tech', icon: Code, color: 'from-orange-500 to-red-500' },
  { id: 'food', name: 'Food', icon: Utensils, color: 'from-yellow-500 to-amber-500' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Zap, color: 'from-teal-500 to-green-500' },
  { id: 'other', name: 'Other', icon: Palette, color: 'from-gray-500 to-gray-600' }
];

const emojis = ['🔥', '💯', '✨', '🚀', '💎', '🌊', '⚡', '🎯'];

export const FloatingTrendLogger: React.FC<FloatingTrendLoggerProps> = ({ 
  isVisible, 
  onTrendLogged 
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('logged_trends')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          notes: notes.trim(),
          emoji: selectedEmoji,
          logged_at: new Date().toISOString()
        });

      if (error) throw error;

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setShowSuccess(false);
        resetForm();
        onTrendLogged?.();
      }, 1000);
    } catch (error) {
      console.error('Error logging trend:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setNotes('');
    setSelectedEmoji('');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-wave-600 to-wave-700 rounded-full shadow-lg flex items-center justify-center text-white hover:from-wave-500 hover:to-wave-600 transition-all"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-wave-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="py-12 text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-4xl">✓</span>
                  </motion.div>
                  <p className="text-xl font-semibold text-white">Trend Logged!</p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Quick Log Trend</h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-wave-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-wave-400" />
                    </button>
                  </div>

                  {/* Category Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-wave-300 mb-3">
                      Select Category
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <motion.button
                            key={category.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`
                              p-4 rounded-xl border-2 transition-all
                              ${selectedCategory === category.id
                                ? 'border-wave-500 bg-wave-800/50'
                                : 'border-wave-700/30 hover:border-wave-600/50'
                              }
                            `}
                          >
                            <div className={`
                              w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} 
                              flex items-center justify-center mx-auto mb-2
                            `}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-xs text-wave-300">{category.name}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-wave-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What's trending about this?"
                      className="w-full px-4 py-3 bg-wave-800/50 border border-wave-700/30 rounded-xl text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/30 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Emoji Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-wave-300 mb-2">
                      Add Emoji (Optional)
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {emojis.map((emoji) => (
                        <motion.button
                          key={emoji}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedEmoji(emoji)}
                          className={`
                            w-12 h-12 rounded-lg flex items-center justify-center text-2xl
                            ${selectedEmoji === emoji
                              ? 'bg-wave-700 ring-2 ring-wave-500'
                              : 'bg-wave-800/50 hover:bg-wave-700/50'
                            }
                          `}
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!selectedCategory || isSubmitting}
                    className={`
                      w-full py-4 rounded-xl font-semibold transition-all
                      ${selectedCategory && !isSubmitting
                        ? 'bg-gradient-to-r from-wave-600 to-wave-700 hover:from-wave-500 hover:to-wave-600 text-white'
                        : 'bg-wave-800/50 text-wave-500 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSubmitting ? 'Logging...' : 'Log Trend'}
                  </motion.button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};