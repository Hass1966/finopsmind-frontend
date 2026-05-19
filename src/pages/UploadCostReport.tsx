import { useState, useRef, useCallback } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { uploadCostReport } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import type { UploadResult } from '../types/api';

type Provider = 'aws' | 'azure' | 'gcp';
type FileFormat = 'csv' | 'json';

const providers: { value: Provider; label: string; color: string }[] = [
  { value: 'aws', label: 'AWS', color: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'azure', label: 'Azure', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'gcp', label: 'GCP', color: 'border-red-400 bg-red-50 text-red-700' },
];

export default function UploadCostReport() {
  const [provider, setProvider] = useState<Provider>('aws');
  const [fileFormat, setFileFormat] = useState<FileFormat>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = fileFormat === 'csv' ? '.csv' : '.json';

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);
    setError(null);
    try {
      const res = await uploadCostReport(file, provider, fileFormat, setProgress);
      setResult(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Cost Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          Import an exported CSV or JSON cost report from your cloud provider.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label className="text-sm font-medium text-gray-700">Cloud Provider</label>
        <div className="flex gap-3">
          {providers.map((p) => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              className={cn(
                'flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all',
                provider === p.value
                  ? p.color
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label className="text-sm font-medium text-gray-700">File Format</label>
        <div className="flex gap-3">
          {(['csv', 'json'] as FileFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => { setFileFormat(fmt); setFile(null); }}
              className={cn(
                'px-6 py-2.5 rounded-lg border-2 text-sm font-semibold uppercase transition-all',
                fileFormat === fmt
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
              )}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'bg-white rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-primary-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Drag and drop your <span className="font-semibold">.{fileFormat}</span> file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
          </>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={cn(
          'w-full py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2',
          file && !uploading
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed',
        )}
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Upload & Import'}
      </button>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload Failed</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900">Import Complete</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Rows Imported</p>
              <p className="text-lg font-bold text-gray-900">{result.rows_imported.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Rows Skipped</p>
              <p className="text-lg font-bold text-gray-900">{result.rows_skipped}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(result.total_amount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Date Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {result.date_range
                  ? `${result.date_range.start} to ${result.date_range.end}`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 mb-1">
                {result.errors.length} warning(s)
              </p>
              <ul className="text-xs text-yellow-700 space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
