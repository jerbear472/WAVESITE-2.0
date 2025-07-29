'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Download, FileText, Table, Calendar, Filter, 
  Loader2, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface ExportReportModalProps {
  onClose: () => void;
  trends: any[];
  stats: any;
  timeframe: string;
}

interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeStats: boolean;
  includeTrends: boolean;
  includeMetadata: boolean;
  dateRange: 'current' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  categories: string[];
}

export default function ExportReportModal({ onClose, trends, stats, timeframe }: ExportReportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'xlsx',
    includeStats: true,
    includeTrends: true,
    includeMetadata: true,
    dateRange: 'current',
    categories: ['all']
  });

  const categories = ['all', ...Array.from(new Set(trends.map(t => t.category)))];

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      // Fetch additional data if needed
      let exportData = trends;
      
      if (options.dateRange === 'custom' && options.customStartDate && options.customEndDate) {
        const { data, error } = await supabase
          .from('trend_submissions')
          .select('*')
          .gte('created_at', options.customStartDate)
          .lte('created_at', options.customEndDate)
          .gt('validation_count', 0)
          .gt('validation_ratio', 0.5);
          
        if (error) throw error;
        exportData = data || [];
      }

      // Filter by categories
      if (!options.categories.includes('all')) {
        exportData = exportData.filter(trend => 
          options.categories.includes(trend.category)
        );
      }

      if (options.format === 'xlsx') {
        await exportToExcel(exportData);
      } else {
        await exportToCSV(exportData);
      }
      
      setExportComplete(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async (data: any[]) => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    if (options.includeStats) {
      const summaryData = [
        ['WaveSight Enterprise Report'],
        ['Generated on', format(new Date(), 'PPP')],
        [''],
        ['Summary Statistics'],
        ['Total Validated Trends', stats.total_validated_trends],
        ['Average Validation Score', `${Math.round(stats.avg_validation_score)}%`],
        ['Total Categories', stats.total_categories],
        ['Top Category', stats.top_category],
        ['Trends Today', stats.trends_today],
        ['Trends This Week', stats.trends_this_week],
        ['Active Spotters', stats.total_spotters],
        [''],
        ['Report Parameters'],
        ['Timeframe', timeframe],
        ['Categories', options.categories.join(', ')],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    }
    
    // Trends sheet
    if (options.includeTrends) {
      const trendsData = data.map(trend => ({
        'ID': trend.id,
        'Description': trend.description,
        'Category': trend.category,
        'Validation Score': `${Math.round(trend.validation_ratio * 100)}%`,
        'Positive Votes': trend.positive_validations,
        'Negative Votes': trend.negative_validations,
        'Total Validators': trend.validation_count,
        'Created Date': format(new Date(trend.created_at), 'yyyy-MM-dd'),
        'Created Time': format(new Date(trend.created_at), 'HH:mm:ss'),
        'Status': trend.status,
        'Spotter ID': trend.spotter_id
      }));
      
      const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
      
      // Style the header row
      const range = XLSX.utils.decode_range(trendsSheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!trendsSheet[address]) continue;
        trendsSheet[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "4A90E2" } },
          alignment: { horizontal: "center" }
        };
      }
      
      XLSX.utils.book_append_sheet(wb, trendsSheet, 'Trends');
    }
    
    // Category Analysis sheet
    if (options.includeMetadata) {
      const categoryAnalysis = Array.from(new Set(data.map(t => t.category)))
        .map(category => {
          const categoryTrends = data.filter(t => t.category === category);
          const avgScore = categoryTrends.reduce((sum, t) => sum + t.validation_ratio, 0) / categoryTrends.length;
          
          return {
            'Category': category,
            'Total Trends': categoryTrends.length,
            'Average Score': `${Math.round(avgScore * 100)}%`,
            'Total Positive Votes': categoryTrends.reduce((sum, t) => sum + t.positive_validations, 0),
            'Total Negative Votes': categoryTrends.reduce((sum, t) => sum + t.negative_validations, 0),
            'Top Trend': categoryTrends.sort((a, b) => b.validation_ratio - a.validation_ratio)[0]?.description || 'N/A'
          };
        });
      
      const categorySheet = XLSX.utils.json_to_sheet(categoryAnalysis);
      XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Analysis');
    }
    
    // Generate file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `WaveSight_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = async (data: any[]) => {
    const headers = [
      'ID',
      'Description',
      'Category',
      'Validation Score',
      'Positive Votes',
      'Negative Votes',
      'Total Validators',
      'Created Date',
      'Status'
    ];
    
    const csvData = data.map(trend => [
      trend.id,
      `"${trend.description.replace(/"/g, '""')}"`,
      trend.category,
      `${Math.round(trend.validation_ratio * 100)}%`,
      trend.positive_validations,
      trend.negative_validations,
      trend.validation_count,
      format(new Date(trend.created_at), 'yyyy-MM-dd HH:mm:ss'),
      trend.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `WaveSight_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
        className="glass-morphism border border-gray-800/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Export Report</h2>
                <p className="text-sm text-gray-400">Generate detailed analytics report</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {exportComplete ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Export Complete!</h3>
              <p className="text-gray-400">Your report has been downloaded successfully.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Export Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOptions({...options, format: 'xlsx'})}
                    className={`p-4 rounded-lg border transition-all ${
                      options.format === 'xlsx' 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Table className="w-6 h-6 text-cyan-400 mb-2" />
                    <p className="font-medium text-white">Excel (.xlsx)</p>
                    <p className="text-xs text-gray-400 mt-1">Multiple sheets with formatting</p>
                  </button>
                  
                  <button
                    onClick={() => setOptions({...options, format: 'csv'})}
                    className={`p-4 rounded-lg border transition-all ${
                      options.format === 'csv' 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <FileText className="w-6 h-6 text-purple-400 mb-2" />
                    <p className="font-medium text-white">CSV (.csv)</p>
                    <p className="text-xs text-gray-400 mt-1">Simple, compatible format</p>
                  </button>
                </div>
              </div>

              {/* Include Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Include in Report</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={options.includeStats}
                      onChange={(e) => setOptions({...options, includeStats: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-300">Summary Statistics</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={options.includeTrends}
                      onChange={(e) => setOptions({...options, includeTrends: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-300">Detailed Trends Data</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={options.includeMetadata}
                      onChange={(e) => setOptions({...options, includeMetadata: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-300">Category Analysis</span>
                  </label>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Categories</label>
                <select 
                  multiple
                  value={options.categories}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setOptions({...options, categories: selected});
                  }}
                  className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
                  size={5}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium mb-1">Report will include:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>{trends.length} validated trends</li>
                      <li>{stats.total_categories} categories analyzed</li>
                      <li>Data from {timeframe === 'all' ? 'all time' : `last ${timeframe}`}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!exportComplete && (
          <div className="p-6 border-t border-gray-800/50">
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-gray-300 hover:text-white transition-colors"
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || (!options.includeStats && !options.includeTrends && !options.includeMetadata)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}