'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Filter, Plus, Trash2, Edit, Check, X, Zap, TrendingUp, Globe, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Alert {
  id: string;
  name: string;
  type: 'threshold' | 'keyword' | 'sentiment' | 'velocity' | 'geographic';
  conditions: {
    field: string;
    operator: string;
    value: string | number;
    additionalParams?: any;
  };
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
  channels: string[];
}

interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  isRead: boolean;
}

export function AlertsPanel() {
  const supabase = createClientComponentClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications'>('alerts');

  useEffect(() => {
    fetchAlerts();
    fetchNotifications();
    
    // Simulate real-time notifications
    const interval = setInterval(() => {
      generateMockNotification();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    // Mock data
    const mockAlerts: Alert[] = [
      {
        id: '1',
        name: 'High Velocity Tech Trends',
        type: 'velocity',
        conditions: { field: 'velocity', operator: '>', value: 80 },
        isActive: true,
        lastTriggered: new Date(Date.now() - 3600000).toISOString(),
        triggerCount: 24,
        channels: ['email', 'slack']
      },
      {
        id: '2',
        name: 'Crypto Keywords Monitor',
        type: 'keyword',
        conditions: { field: 'keywords', operator: 'contains', value: 'bitcoin,ethereum,web3,defi' },
        isActive: true,
        lastTriggered: new Date(Date.now() - 7200000).toISOString(),
        triggerCount: 156,
        channels: ['webhook', 'email']
      },
      {
        id: '3',
        name: 'Negative Sentiment Alert',
        type: 'sentiment',
        conditions: { field: 'sentiment', operator: '<', value: -0.5 },
        isActive: false,
        triggerCount: 8,
        channels: ['email']
      },
      {
        id: '4',
        name: 'Asia Pacific Trend Surge',
        type: 'geographic',
        conditions: { field: 'region', operator: '=', value: 'Asia Pacific', additionalParams: { velocityThreshold: 60 } },
        isActive: true,
        lastTriggered: new Date(Date.now() - 1800000).toISOString(),
        triggerCount: 45,
        channels: ['slack', 'teams']
      }
    ];
    
    setAlerts(mockAlerts);
  };

  const fetchNotifications = async () => {
    // Mock notifications
    const mockNotifications: AlertNotification[] = [
      {
        id: '1',
        alertId: '1',
        alertName: 'High Velocity Tech Trends',
        message: 'AI Productivity Tools trend reached velocity of 92.5',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        severity: 'high',
        data: { trend: 'AI Productivity Tools', velocity: 92.5, category: 'Technology' },
        isRead: false
      },
      {
        id: '2',
        alertId: '2',
        alertName: 'Crypto Keywords Monitor',
        message: 'New trend detected: "Bitcoin ETF approval speculation"',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        severity: 'medium',
        data: { trend: 'Bitcoin ETF', keywords: ['bitcoin', 'etf', 'sec'] },
        isRead: false
      },
      {
        id: '3',
        alertId: '4',
        alertName: 'Asia Pacific Trend Surge',
        message: 'K-Beauty skincare routine trending with 85% velocity in Seoul',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        severity: 'medium',
        data: { trend: 'K-Beauty', region: 'Seoul', velocity: 85 },
        isRead: true
      }
    ];
    
    setNotifications(mockNotifications);
  };

  const generateMockNotification = () => {
    const newNotification: AlertNotification = {
      id: Date.now().toString(),
      alertId: '1',
      alertName: 'High Velocity Tech Trends',
      message: `New trend alert: ${['Quantum Computing', 'Green Tech', 'Space Tourism'][Math.floor(Math.random() * 3)]}`,
      timestamp: new Date().toISOString(),
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      data: { velocity: Math.floor(Math.random() * 30) + 70 },
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const toggleAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
    ));
  };

  const deleteAlert = async (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'velocity': return <Zap className="w-4 h-4" />;
      case 'keyword': return <AlertTriangle className="w-4 h-4" />;
      case 'sentiment': return <TrendingUp className="w-4 h-4" />;
      case 'geographic': return <Globe className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Smart Alert System</h2>
        <button
          onClick={() => setShowCreateAlert(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Alert</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'alerts'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Alert Rules ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 px-4 rounded-md transition-all relative ${
            activeTab === 'notifications'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Notifications ({notifications.filter(n => !n.isRead).length})
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'alerts' ? (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${alert.isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <h3 className="text-xl font-semibold">{alert.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${alert.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-3">
                      <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                        {alert.conditions.field} {alert.conditions.operator} {alert.conditions.value}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div>
                        <span>Triggered: </span>
                        <span className="text-white font-semibold">{alert.triggerCount}</span>
                        <span> times</span>
                      </div>
                      {alert.lastTriggered && (
                        <div>
                          <span>Last: </span>
                          <span className="text-white">{format(new Date(alert.lastTriggered), 'MMM d, h:mm a')}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {alert.channels.map((channel) => (
                          <span key={channel} className="bg-gray-800 px-2 py-1 rounded text-xs">
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        alert.isActive
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                      }`}
                    >
                      {alert.isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingAlert(alert)}
                      className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800 cursor-pointer transition-all ${
                    !notification.isRead ? 'border-cyan-500/50' : ''
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(notification.severity)}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{notification.alertName}</h4>
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.timestamp), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-400">{notification.message}</p>
                      {notification.data && (
                        <div className="mt-2 text-sm">
                          {Object.entries(notification.data).map(([key, value]) => (
                            <span key={key} className="inline-block bg-gray-800 px-2 py-1 rounded mr-2 mb-1">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Alert Modal */}
      <AnimatePresence>
        {(showCreateAlert || editingAlert) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateAlert(false);
              setEditingAlert(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                {editingAlert ? 'Edit Alert' : 'Create New Alert'}
              </h3>
              
              {/* Alert form would go here */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Alert name"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  defaultValue={editingAlert?.name}
                />
                <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="velocity">Velocity Threshold</option>
                  <option value="keyword">Keyword Monitor</option>
                  <option value="sentiment">Sentiment Analysis</option>
                  <option value="geographic">Geographic Alert</option>
                </select>
                <div className="flex gap-2">
                  <select className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    <option value="velocity">Velocity</option>
                    <option value="sentiment">Sentiment</option>
                    <option value="engagement">Engagement</option>
                  </select>
                  <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                    <option value="=">Equals</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateAlert(false);
                    setEditingAlert(null);
                  }}
                  className="flex-1 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors">
                  {editingAlert ? 'Save Changes' : 'Create Alert'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}