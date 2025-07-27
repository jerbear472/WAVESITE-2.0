'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { 
  Download, FileJson, FileSpreadsheet, FileText, Code, 
  Calendar, Clock, Check, Copy, Link, Loader, Database,
  Zap, Shield, Key
} from 'lucide-react';
import { format } from 'date-fns';

interface ExportJob {
  id: string;
  name: string;
  type: 'csv' | 'json' | 'excel' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  fileSize?: string;
  downloadUrl?: string;
  filters: any;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  requests: number;
  rateLimit: number;
  permissions: string[];
}

interface Integration {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'webhook' | 'zapier' | 'trading';
  status: 'connected' | 'disconnected';
  config: any;
  lastSync?: string;
}

export function DataExportPanel() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'export' | 'api' | 'integrations'>('export');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: '1',
      name: 'Weekly Trend Report',
      type: 'pdf',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86000000).toISOString(),
      fileSize: '2.4 MB',
      downloadUrl: '#',
      filters: { dateRange: '7d', categories: ['tech', 'finance'] }
    },
    {
      id: '2',
      name: 'Full Database Export',
      type: 'json',
      status: 'processing',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      filters: { all: true }
    }
  ]);
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'ws_live_xxxxxxxxxxxxxxxxxxx',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      lastUsed: new Date(Date.now() - 300000).toISOString(),
      requests: 145823,
      rateLimit: 1000,
      permissions: ['read:trends', 'read:analytics', 'write:alerts']
    }
  ]);

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Slack Workspace',
      type: 'slack',
      status: 'connected',
      config: { workspace: 'company.slack.com', channel: '#trends' },
      lastSync: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '2',
      name: 'Trading Algorithm',
      type: 'trading',
      status: 'connected',
      config: { endpoint: 'https://api.trading.com', strategy: 'momentum' },
      lastSync: new Date().toISOString()
    }
  ]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<string>('csv');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const createExport = async () => {
    const newJob: ExportJob = {
      id: Date.now().toString(),
      name: `Export ${format(new Date(), 'MMM d, yyyy')}`,
      type: selectedExportType as any,
      status: 'processing',
      createdAt: new Date().toISOString(),
      filters: {}
    };
    
    setExportJobs(prev => [newJob, ...prev]);
    setShowExportModal(false);
    
    // Simulate processing
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { 
              ...job, 
              status: 'completed', 
              completedAt: new Date().toISOString(),
              fileSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
              downloadUrl: '#'
            }
          : job
      ));
    }, 5000);
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv': return <FileSpreadsheet className="w-5 h-5" />;
      case 'json': return <FileJson className="w-5 h-5" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      default: return <Download className="w-5 h-5" />;
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack': return '🔷';
      case 'teams': return '🟦';
      case 'webhook': return '🔗';
      case 'zapier': return '⚡';
      case 'trading': return '📈';
      default: return '🔌';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Data Export & Integration</h2>
        <div className="flex gap-3">
          {activeTab === 'export' && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>New Export</span>
            </button>
          )}
          {activeTab === 'api' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors">
              <Key className="w-4 h-4" />
              <span>Generate API Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'export'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Data Export
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'api'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          API Access
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'integrations'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Integrations
        </button>
      </div>

      {/* Content */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          {/* Export Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-500">This Month</span>
              </div>
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm text-gray-400">Exports Created</div>
            </div>
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <Download className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-500">Total Size</span>
              </div>
              <div className="text-2xl font-bold">156 MB</div>
              <div className="text-sm text-gray-400">Data Exported</div>
            </div>
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-500">Avg Time</span>
              </div>
              <div className="text-2xl font-bold">2.3s</div>
              <div className="text-sm text-gray-400">Processing Time</div>
            </div>
          </div>

          {/* Export Jobs */}
          <div className="space-y-3">
            {exportJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {job.status === 'processing' ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        getFileIcon(job.type)
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{job.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{job.type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{format(new Date(job.createdAt), 'MMM d, h:mm a')}</span>
                        {job.fileSize && (
                          <>
                            <span>•</span>
                            <span>{job.fileSize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'completed' && job.downloadUrl && (
                      <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* API Usage Stats */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-semibold mb-4">API Usage Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-cyan-400">145.8K</div>
                <div className="text-sm text-gray-400">Total Requests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">23ms</div>
                <div className="text-sm text-gray-400">Avg Response Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">850/1000</div>
                <div className="text-sm text-gray-400">Rate Limit Used</div>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">{apiKey.name}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="bg-gray-800 px-3 py-1 rounded text-sm font-mono">
                        {apiKey.key.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyApiKey(apiKey.key)}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                      >
                        {copiedKey === apiKey.key ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Created {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}</span>
                      {apiKey.lastUsed && (
                        <span>Last used {format(new Date(apiKey.lastUsed), 'h:mm a')}</span>
                      )}
                      <span>{apiKey.requests.toLocaleString()} requests</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* API Documentation Link */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-6 border border-cyan-500/50">
            <h3 className="text-xl font-semibold mb-2">API Documentation</h3>
            <p className="text-gray-400 mb-4">
              Learn how to integrate WaveSight data into your applications with our comprehensive API documentation.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors">
              <Code className="w-4 h-4" />
              <span>View Documentation</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-4">
          {/* Available Integrations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{getIntegrationIcon(integration.type)}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    integration.status === 'connected'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}>
                    {integration.status}
                  </span>
                </div>
                <h4 className="font-semibold mb-2">{integration.name}</h4>
                {integration.config && (
                  <div className="text-sm text-gray-500 mb-3">
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key}>
                        {key}: <span className="text-gray-400">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {integration.lastSync && (
                  <div className="text-xs text-gray-500">
                    Last sync: {format(new Date(integration.lastSync), 'h:mm a')}
                  </div>
                )}
                <div className="mt-4">
                  <button className={`w-full py-2 rounded-lg transition-colors ${
                    integration.status === 'connected'
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  }`}>
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Integration */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800 border-dashed flex flex-col items-center justify-center text-gray-500 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer transition-all">
              <Zap className="w-8 h-8 mb-2" />
              <span>Add Integration</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowExportModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Create Data Export</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {['csv', 'json', 'excel', 'pdf'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedExportType(type)}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedExportType === type
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(type)}
                        <span>{type.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Date Range</label>
                <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="1d">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Include Data</label>
                <div className="space-y-2">
                  {['Trends', 'Analytics', 'User Engagement', 'Geographic Data'].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createExport}
                className="flex-1 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Create Export
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}