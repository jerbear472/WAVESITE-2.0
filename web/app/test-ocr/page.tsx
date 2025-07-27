'use client';

import { useState, useRef, useEffect } from 'react';
import { OCRApiService as OCRService } from '@/lib/ocrApiService';
import { OCRDiagnostic } from '@/lib/ocrDiagnostic';
import { Upload, Loader2, FileImage, Copy, Check, AlertCircle } from 'lucide-react';

export default function TestOCRPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [useApiOCR, setUseApiOCR] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      const diag = await OCRDiagnostic.runDiagnostics();
      setDiagnostics(diag);
      console.log('OCR Diagnostics:', diag);
      
      if (diag.tesseractAvailable && diag.browserSupport) {
        // Try a direct test
        try {
          const testResult = await OCRDiagnostic.testTesseractDirectly();
          console.log('Direct test successful:', testResult);
        } catch (e) {
          console.error('Direct test failed:', e);
        }
      }
    } catch (err) {
      console.error('Diagnostics failed:', err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process with OCR
    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const startTime = Date.now();
      const ocrResult = await OCRService.extractTextFromImage(file, true); // Enable debug mode
      const endTime = Date.now();

      setResults({
        ...ocrResult,
        processingTime: endTime - startTime,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(2) + ' KB'
      });
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-wave-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">OCR Test Page</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-wave-400">OCR Method:</span>
            <button
              onClick={() => setUseApiOCR(!useApiOCR)}
              className={`px-4 py-2 rounded-lg transition-all ${
                useApiOCR 
                  ? 'bg-wave-600 text-white' 
                  : 'bg-wave-800 text-wave-400 hover:bg-wave-700'
              }`}
            >
              {useApiOCR ? 'Server API' : 'Client-side'} OCR
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="wave-card p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Screenshot</h2>
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-wave-600 rounded-xl p-8 text-center cursor-pointer hover:border-wave-500 transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-96 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-wave-400" />
                    <p className="text-wave-300">Click to upload a screenshot</p>
                    <p className="text-sm text-wave-500 mt-2">Supports PNG, JPG, JPEG</p>
                  </>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isProcessing && (
                <div className="mt-4 flex items-center gap-2 text-wave-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing image with OCR...</span>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                  {error}
                </div>
              )}
            </div>
            
            {/* Instructions */}
            <div className="wave-card p-6">
              <h3 className="text-lg font-semibold mb-3">Testing Instructions</h3>
              <ol className="space-y-2 text-sm text-wave-300">
                <li>1. Take a screenshot of a TikTok or Instagram post</li>
                <li>2. Upload it using the box above</li>
                <li>3. Check the extracted data on the right</li>
                <li>4. Verify that the OCR correctly extracted:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Creator handle (@username)</li>
                    <li>• Likes, comments, shares, views</li>
                    <li>• Caption text</li>
                    <li>• Hashtags</li>
                    <li>• Platform detection</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            {/* Diagnostics */}
            {diagnostics && (
              <div className="wave-card p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  OCR System Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${diagnostics.tesseractAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Tesseract.js: {diagnostics.tesseractAvailable ? 'Available' : 'Not Available'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${diagnostics.browserSupport ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Browser Support: {diagnostics.browserSupport ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${diagnostics.webWorkersAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Web Workers: {diagnostics.webWorkersAvailable ? 'Available' : 'Not Available'}</span>
                  </div>
                  {diagnostics.errors && diagnostics.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 font-medium mb-1">Errors:</p>
                      {diagnostics.errors.map((err: string, idx: number) => (
                        <p key={idx} className="text-red-300 text-xs">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Results Section */}
          <div className="space-y-6">
            {results && (
              <>
                <div className="wave-card p-6">
                  <h2 className="text-xl font-semibold mb-4">Extracted Data</h2>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-wave-400">Platform:</span>
                        <p className="text-wave-200 font-medium capitalize">
                          {results.platform || 'Not detected'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-wave-400">Processing Time:</span>
                        <p className="text-wave-200 font-medium">
                          {results.processingTime}ms
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-wave-400">Handle:</span>
                        <p className="text-wave-200 font-medium">
                          {results.handle || 'Not found'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-wave-400">File Size:</span>
                        <p className="text-wave-200 font-medium">
                          {results.fileSize}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-wave-700">
                      {results.likes !== undefined && (
                        <div>
                          <span className="text-wave-400">Likes:</span>
                          <p className="text-wave-200 font-medium">
                            {results.likes.toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {results.comments !== undefined && (
                        <div>
                          <span className="text-wave-400">Comments:</span>
                          <p className="text-wave-200 font-medium">
                            {results.comments.toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {results.shares !== undefined && (
                        <div>
                          <span className="text-wave-400">Shares:</span>
                          <p className="text-wave-200 font-medium">
                            {results.shares.toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {results.views !== undefined && (
                        <div>
                          <span className="text-wave-400">Views:</span>
                          <p className="text-wave-200 font-medium">
                            {results.views.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {results.caption && (
                      <div className="pt-3 border-t border-wave-700">
                        <span className="text-wave-400 text-sm">Caption:</span>
                        <p className="text-wave-200 mt-1">
                          {results.caption}
                        </p>
                      </div>
                    )}
                    
                    {results.hashtags && results.hashtags.length > 0 && (
                      <div className="pt-3 border-t border-wave-700">
                        <span className="text-wave-400 text-sm">Hashtags:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {results.hashtags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-wave-700/50 rounded-md text-wave-300 text-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {results.error && (
                      <div className="pt-3 border-t border-wave-700">
                        <span className="text-red-400 text-sm">Error:</span>
                        <p className="text-red-300 mt-1 text-sm">
                          {results.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Raw Text */}
                {results.rawText && (
                  <div className="wave-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Raw OCR Text</h3>
                      <button
                        onClick={() => copyToClipboard(results.rawText)}
                        className="flex items-center gap-2 px-3 py-1 bg-wave-700/50 hover:bg-wave-700 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-sm">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-sm">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="bg-wave-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-wave-300 whitespace-pre-wrap">
                        {results.rawText}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}