import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, CheckCircle2, FileText, File as FileIcon, Globe, Image as ImageIcon, Video, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { API_URL } from '../config';
import { useOutletContext } from 'react-router-dom';

const VERDICT_COLORS = {
  "TRUE": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "FALSE": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  "PARTIAL": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const VERDICT_BADGE = {
  'Real': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'Likely Real': 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  'Likely AI': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'AI Generated': 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
};

export default function Workspace() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('text');
  const [inputVal, setInputVal] = useState('');
  const [urlVal, setUrlVal] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [videoBase64, setVideoBase64] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoMime, setVideoMime] = useState('');
  const [videoSize, setVideoSize] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [state, setState] = useState('IDLE');
  const [pipelineStep, setPipelineStep] = useState(0);
  const [resultsData, setResultsData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when component mounts (when navigating back to workspace)
  React.useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      setState('IDLE');
      setResultsData(null);
    };
  }, []);

  const tabs = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'url', label: 'URL', icon: Globe },
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'file', label: 'Document', icon: FileIcon },
    { id: 'video', label: 'Video', icon: Video }
  ];

  const exampleUrls = [
    { label: 'BBC', url: 'https://www.bbc.com' },
    { label: 'CNN', url: 'https://www.cnn.com' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' }
  ];

  const handleImageFile = (file) => {
    if (!file) return;
    
    // Clear any previous errors
    setErrorMsg('');
    
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setErrorMsg('Invalid file type. Please upload JPG, PNG, WEBP, or GIF images.');
      return;
    }
    
    // Check file size (3MB limit to account for base64 encoding overhead)
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > maxSize) {
      setErrorMsg(`Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 3MB.`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImageBase64(result);
      setImagePreview(result);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDocFile = (file) => {
    if (!file) return;
    
    // Check file size (10MB limit for documents)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setErrorMsg(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`);
      return;
    }
    
    setErrorMsg('');
    setFileName(file.name);
    setFileContent('');
    if (file.type === 'text/plain' || file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = () => setFileContent(String(reader.result || ''));
      reader.readAsText(file);
    } else if (
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const reader = new FileReader();
      reader.onload = () => setFileContent(String(reader.result || ''));
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFile = (file) => {
    if (!file) return;
    
    // Check file size (50MB limit for videos)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setErrorMsg(`Video is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`);
      return;
    }
    
    setErrorMsg('');
    setVideoName(file.name);
    setVideoMime(file.type);
    setVideoSize(file.size || 0);
    setVideoLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setVideoBase64(String(reader.result || ''));
      setVideoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event, handler) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    handler(file);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, exp)).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
  };

  const isValidHttpUrl = (value) => {
    try {
      const parsed = new URL(String(value || '').trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;

      const host = parsed.hostname.toLowerCase();
      const isLocalhost = host === 'localhost';
      const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
      const hasPublicLikeDomain = host.includes('.');

      return isLocalhost || isIPv4 || hasPublicLikeDomain;
    } catch {
      return false;
    }
  };

  const handleAnalyze = async () => {
    let payload = null;
    setErrorMsg('');

    if (activeTab === 'text' && inputVal.trim()) {
      const normalizedText = inputVal.trim();
      payload = { type: 'text', content: normalizedText };
    }
    if (activeTab === 'url' && urlVal.trim()) {
      const normalizedUrl = urlVal.trim();
      if (!isValidHttpUrl(normalizedUrl)) {
        setErrorMsg('Please enter a valid URL (example: https://example.com/article).');
        return;
      }
      payload = { type: 'url', content: normalizedUrl };
    }
    if (activeTab === 'image' && imageBase64) payload = { type: 'image', content: imageBase64 };
    if (activeTab === 'file' && fileName) payload = { type: 'file', content: fileContent, filename: fileName };
    if (activeTab === 'video' && videoBase64) payload = { type: 'video', content: videoBase64, filename: videoName, mimeType: videoMime };

    if (!payload) return;

    setState('PROCESSING');
    setPipelineStep(0);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/analyze/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = 'Analysis request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n').map((line) => line.trim()).filter(Boolean);
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch (parseErr) {
              console.error('Failed to parse SSE data:', parseErr);
              continue;
            }

            if (data.stage === 'extracting') {
              setPipelineStep(0);
            } else if (data.stage === 'searching' || data.stage === 'detecting' || data.stage === 'fetching') {
              setPipelineStep(1);
            } else if (data.stage === 'verifying' || data.stage === 'analyzing' || data.stage === 'processing') {
              setPipelineStep(2);
            } else if (data.stage === 'complete' || data.stage === 'saved') {
              if (data.result) {
                setResultsData(data.result);
                setPipelineStep(3);
                setState('RESULTS');
              }
            } else if (data.stage === 'error') {
              throw new Error(data.message || 'Analysis failed');
            }
          }
        }
      }

      // Process any trailing complete event that did not end with a blank line.
      const trailingLine = sseBuffer.trim();
      if (trailingLine.startsWith('data: ')) {
        try {
          const data = JSON.parse(trailingLine.slice(6));
          if ((data.stage === 'complete' || data.stage === 'saved') && data.result) {
            setResultsData(data.result);
            setPipelineStep(3);
            setState('RESULTS');
          } else if (data.stage === 'error') {
            throw new Error(data.message || 'Analysis failed');
          }
        } catch (parseErr) {
          console.error('Failed to parse trailing SSE data:', parseErr);
        }
      }
    } catch (err) {
      console.error('Failed to analyze:', err);
      setState('IDLE');
      setErrorMsg(err.message || 'Analysis failed. Please try again.');
    }
  };

  const handleReset = () => {
    setInputVal('');
    setUrlVal('');
    setImageBase64('');
    setImagePreview('');
    setFileName('');
    setFileContent('');
    setVideoBase64('');
    setVideoName('');
    setVideoMime('');
    setVideoSize(0);
    setVideoLoading(false);
    setResultsData(null);
    setErrorMsg('');
    setState('IDLE');
    setPipelineStep(0);
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        {state === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4"
          >
            <motion.div 
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] mb-8 ${theme === 'dark' ? 'shadow-glow' : 'shadow-xl'}`}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className={`w-full h-full rounded-3xl ${theme === 'dark' ? 'bg-[#0a0a0f]' : 'bg-gray-50'} flex items-center justify-center`}>
                <Sparkles className="w-9 h-9 text-indigo-400" />
              </div>
            </motion.div>
            <h1 className={`text-4xl sm:text-5xl font-bold mb-4 tracking-tight text-center ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
                : 'text-gray-900'
            }`}>
              What do you want to verify?
            </h1>
            <p className={`mb-12 text-lg sm:text-xl text-center px-4 font-light ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>
              Paste an article, URL, image or document to analyze with AI.
            </p>

            <div className="w-full">
              {/* Tab Bar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer relative overflow-hidden',
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Input Card */}
              <div className={`relative rounded-3xl backdrop-blur-2xl border p-8 shadow-2xl ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10'
                  : 'bg-white/80 border-gray-200 shadow-xl'
              }`}>
                <div className="relative z-10">

                  {activeTab === 'text' && (
                    <textarea
                      rows={6}
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder="Paste article, statement or any text..."
                      className={`w-full bg-transparent border-none outline-none text-lg focus:ring-0 resize-none leading-relaxed ${
                        theme === 'dark' 
                          ? 'text-white placeholder:text-slate-500'
                          : 'text-gray-900 placeholder:text-gray-400'
                      }`}
                    />
                  )}

                  {activeTab === 'url' && (
                    <div className="flex flex-col gap-4">
                      <input
                        type="url"
                        value={urlVal}
                        onChange={e => setUrlVal(e.target.value)}
                        placeholder="https://example.com/article"
                        className={`w-full border rounded-xl px-5 py-4 text-lg outline-none transition-all ${
                          theme === 'dark'
                            ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        }`}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Try:</span>
                        {exampleUrls.map((chip) => (
                          <motion.button 
                            key={chip.label} 
                            type="button" 
                            onClick={() => setUrlVal(chip.url)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 py-2 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                              theme === 'dark'
                                ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-slate-300 border-white/10 hover:border-indigo-500/30 hover:from-indigo-500/20 hover:to-purple-500/20'
                                : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-700 border-gray-200 hover:border-indigo-300 hover:from-indigo-100 hover:to-purple-100'
                            }`}
                          >
                            {chip.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'image' && (
                    <div
                      onDrop={(e) => handleDrop(e, handleImageFile)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('image-upload').click()}
                      className="flex flex-col items-center justify-center gap-4 min-h-[240px] rounded-2xl border-2 border-dashed border-white/20 bg-gradient-to-br from-white/[0.03] to-transparent text-slate-400 cursor-pointer hover:border-indigo-500/50 hover:bg-gradient-to-br hover:from-indigo-500/[0.05] hover:to-purple-500/[0.05] transition-all group"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-8 h-8 text-indigo-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-semibold text-white mb-1">Drop image here or click to upload</p>
                        <p className="text-sm text-slate-500">JPG, PNG, WEBP, GIF supported</p>
                        <p className="text-xs text-slate-600 font-mono mt-2">Max size: 3MB</p>
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleImageFile(e.target.files?.[0])} className="hidden" id="image-upload" />
                      {imageBase64 && (
                        <motion.img 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={imageBase64} 
                          alt="Preview" 
                          className="mt-3 max-h-48 rounded-xl border-2 border-white/20 object-contain shadow-2xl" 
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'file' && (
                    <div
                      onDrop={(e) => handleDrop(e, handleDocFile)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('file-upload').click()}
                      className="flex flex-col items-center justify-center gap-3 min-h-[200px] rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] text-zinc-400 cursor-pointer hover:border-blue-500/50 hover:bg-white/[0.04] transition-all"
                    >
                      <FileIcon className="w-10 h-10 text-zinc-500" />
                      <p className="text-sm font-medium">Drop file here or click to upload</p>
                      <p className="text-xs text-zinc-600">TXT, PDF, DOCX, CSV supported</p>
                      <p className="text-xs text-zinc-500 font-mono">Max size: 10MB</p>
                      <input type="file" accept=".txt,.pdf,.docx,.csv"
                        onChange={(e) => handleDocFile(e.target.files?.[0])} className="hidden" id="file-upload" />
                      {fileName && (
                        <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                          <FileIcon className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-zinc-300">{fileName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'video' && (
                    <div
                      onDrop={(e) => handleDrop(e, handleVideoFile)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('video-upload').click()}
                      className="flex flex-col items-center justify-center gap-3 min-h-[200px] rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] text-zinc-400 cursor-pointer hover:border-blue-500/50 hover:bg-white/[0.04] transition-all"
                    >
                      <Video className="w-10 h-10 text-zinc-500" />
                      <p className="text-sm font-medium">Drop video here or click to upload</p>
                      <p className="text-xs text-zinc-600">MP4, MOV, AVI, WEBM supported</p>
                      <p className="text-xs text-zinc-500 font-mono">Max size: 50MB</p>
                      <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                        onChange={(e) => handleVideoFile(e.target.files?.[0])} className="hidden" id="video-upload" />
                      {videoLoading && <p className="text-xs text-blue-400">Loading video...</p>}
                      {videoBase64 && !videoLoading && (
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <video src={videoBase64} controls className="max-h-48 rounded-lg border border-white/10" />
                          <p className="text-xs text-zinc-500">{videoName} | {formatBytes(videoSize)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 border-2 border-rose-500/30 text-rose-400 text-sm font-medium shadow-glow"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠</span>
                        <span>{errorMsg}</span>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-end mt-8">
                    <motion.button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={
                        (activeTab === 'text' && !inputVal.trim()) ||
                        (activeTab === 'url' && !urlVal.trim()) ||
                        (activeTab === 'image' && !imageBase64) ||
                        (activeTab === 'file' && !fileName) ||
                        (activeTab === 'video' && !videoBase64)
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Analyze
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'PROCESSING' && <ProcessingPipeline step={pipelineStep} />}

        {state === 'RESULTS' && resultsData && (
          <ResultsView data={resultsData} imagePreview={imagePreview} videoPreview={videoBase64} videoName={videoName} onReset={handleReset} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProcessingPipeline({ step }) {
  const steps = [
    { title: 'Extracting Claims', desc: 'Parsing entities and statements...', icon: FileText },
    { title: 'Searching Evidence', desc: 'Cross-referencing 10M+ curated sources...', icon: Globe },
    { title: 'Verifying Claims', desc: 'Running validation models against evidence...', icon: CheckCircle2 }
  ];

  return (
    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4">
      <div className="glass-card rounded-3xl p-12 w-full relative overflow-hidden border border-white/10 shadow-2xl">
        {/* Animated gradient overlay */}
        <motion.div
          animate={{ 
            x: [-200, 600],
            opacity: [0, 0.3, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 bottom-0 left-0 w-48 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent skew-x-[20deg]"
        />
        
        <div className="flex items-center gap-4 mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-glow"
          >
            <Loader2 className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Live AI Analysis
            </h2>
            <p className="text-slate-400 text-sm">Processing your request...</p>
          </div>
        </div>
        
        <div className="space-y-8">
          {steps.map((s, i) => {
            const status = i < step ? 'done' : i === step ? 'active' : 'pending';
            const Icon = s.icon;
            return (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center mt-1">
                  <motion.div 
                    className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all duration-500',
                      status === 'done' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-glow' :
                      status === 'active' ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white ring-4 ring-indigo-500/30 shadow-glow' :
                      'bg-white/5 text-slate-500 border border-white/10')}
                    animate={status === 'active' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div className={cn('w-0.5 h-16 mt-3 rounded-full transition-all duration-500',
                      status === 'done' ? 'bg-gradient-to-b from-emerald-500 to-emerald-600/50 shadow-glow' : 'bg-white/10')} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <h3 className={cn('font-bold text-xl transition-colors mb-2',
                    status === 'active' ? 'text-white' : status === 'done' ? 'text-emerald-400' : 'text-slate-500')}>{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{status === 'pending' ? 'Waiting...' : s.desc}</p>
                  {status === 'active' && (
                    <motion.div className="h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.5, ease: "easeInOut" }} 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-glow" 
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ResultsView({ data, onReset, imagePreview, videoPreview, videoName }) {
  const hasClaims = Array.isArray(data.claims) && data.claims.length > 0;
  const isImageResult = !!data.aiDetection && !hasClaims && imagePreview;
  const isVideoResult = !!data.aiDetection && !hasClaims && videoPreview;
  
  if (isImageResult) {
  return (
    <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col w-full max-w-4xl mx-auto space-y-6 px-4">
      <div className="glass-card rounded-3xl p-8 flex items-center justify-between border border-white/10 shadow-2xl">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
            AI Detection Complete
          </h2>
          <p className="text-slate-400 text-lg">Image analyzed for authenticity</p>
        </div>
        <motion.button 
          onClick={onReset} 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-white cursor-pointer transition-all"
        >
          Analyze Another
        </motion.button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {imagePreview && (
          <div className="flex-1 glass-card rounded-3xl p-8 flex flex-col items-center gap-6 border border-white/10">
            <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">Analyzed Image</div>
            <img src={imagePreview} alt="Analyzed" className="max-h-80 rounded-2xl border border-white/10 object-contain w-full shadow-2xl"/>
          </div>
        )}
        <div className="flex-1 glass-card rounded-3xl p-8 flex flex-col gap-8 border border-white/10">
          <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">Detection Result</div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn("text-4xl font-bold px-8 py-6 rounded-2xl text-center shadow-glow",
              data.aiDetection.verdict === 'Real' || data.aiDetection.verdict === 'Likely Real' ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-2 border-emerald-500/30" :
              "bg-gradient-to-br from-rose-500/20 to-rose-600/20 text-rose-400 border-2 border-rose-500/30")}>
            {data.aiDetection.verdict}
          </motion.div>
          {(() => {
            const raw = data.aiDetection.ai_probability;
            const aiProb = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
            const isReal = data.aiDetection.verdict === 'Real' || data.aiDetection.verdict === 'Likely Real';
            const displayProb = isReal ? 100 - aiProb : aiProb;
            const label = isReal ? 'Real Confidence' : 'AI Probability';
            const barColor = isReal ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-rose-600';
            return (
              <div>
                <div className="flex justify-between text-sm text-slate-400 mb-3">
                  <span className="font-semibold">{label}</span>
                  <span className="font-bold text-white text-2xl">{displayProb}%</span>
                </div>
                <div className="h-5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    className={cn("h-full rounded-full bg-gradient-to-r shadow-glow", barColor)} 
                    initial={{ width: 0 }}
                    animate={{ width: displayProb + '%' }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
              </div>
            );
          })()}
          <div>
            <div className="text-xs text-slate-500 font-bold tracking-widest mb-4 uppercase">Indicators</div>
            <div className="flex flex-col gap-3">
              {data.aiDetection.indicators.map((ind, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3 text-sm text-slate-300 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-glow"/>
                  <span>{ind}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

  const getAiProb = () => {
    if (!data.aiDetection) return 0;
    const raw = data.aiDetection.ai_probability;
    return raw > 1 ? Math.round(raw) : Math.round(raw * 100);
  };

  const aiProb = getAiProb();
  const isReal = data.aiDetection?.verdict === 'Real' || data.aiDetection?.verdict === 'Likely Real';
  const displayProb = isReal ? 100 - aiProb : aiProb;
  const probLabel = isReal ? 'Real Confidence' : 'AI Probability';
  const barColor = isReal ? 'bg-emerald-400' : 'bg-rose-400';

  // VIDEO RESULT VIEW
  if (isVideoResult) {
    return (
      <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col w-full max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Deepfake Detection Complete</h2>
            <p className="text-zinc-400 mt-1">Video analyzed for manipulation</p>
          </div>
          <button onClick={onReset}
            className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all text-white cursor-pointer">
            Analyze Another
          </button>
        </div>

        {/* Video + Result Side by Side */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left - Video */}
          {videoPreview && (
            <div className="flex-1 glass-card rounded-2xl p-6 flex flex-col items-center gap-4">
              <div className="text-xs text-zinc-400 font-semibold tracking-wider">ANALYZED VIDEO</div>
              <video src={videoPreview} controls className="max-h-80 rounded-xl border border-white/10 w-full" />
              {videoName && <p className="text-xs text-zinc-500">{videoName}</p>}
            </div>
          )}

          {/* Right - Detection Result */}
          <div className="flex-1 glass-card rounded-2xl p-6 flex flex-col gap-6">
            <div className="text-xs text-zinc-400 font-semibold tracking-wider">DETECTION RESULT</div>

            {/* Verdict Badge */}
            <div className={cn('text-3xl font-bold px-6 py-4 rounded-xl text-center',
              VERDICT_BADGE[data.aiDetection.verdict] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20')}>
              {data.aiDetection.verdict}
            </div>

            {/* Probability Bar */}
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>{probLabel}</span>
                <span className="font-bold text-white text-lg">{displayProb}%</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', barColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProb}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Indicators */}
            {Array.isArray(data.aiDetection.indicators) && data.aiDetection.indicators.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 font-semibold tracking-wider mb-3">INDICATORS</div>
                <div className="flex flex-col gap-2">
                  {data.aiDetection.indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className={cn('mt-1 w-2 h-2 rounded-full flex-shrink-0',
                        isReal ? 'bg-emerald-400' : 'bg-rose-400')} />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // IMAGE ONLY VIEW
  if (isImageResult) {
    return (
      <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col w-full max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">AI Detection Complete</h2>
            <p className="text-zinc-400 mt-1">Image analyzed for authenticity</p>
          </div>
          <button onClick={onReset}
            className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all text-white cursor-pointer">
            Analyze Another
          </button>
        </div>

        {/* Image + Result Side by Side */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left - Image */}
          {imagePreview && (
            <div className="flex-1 glass-card rounded-2xl p-6 flex flex-col items-center gap-4">
              <div className="text-xs text-zinc-400 font-semibold tracking-wider">ANALYZED IMAGE</div>
              <img src={imagePreview} alt="Analyzed"
                className="max-h-80 rounded-xl border border-white/10 object-contain w-full" />
            </div>
          )}

          {/* Right - Detection Result */}
          <div className="flex-1 glass-card rounded-2xl p-6 flex flex-col gap-6">
            <div className="text-xs text-zinc-400 font-semibold tracking-wider">DETECTION RESULT</div>

            {/* Verdict Badge */}
            <div className={cn('text-3xl font-bold px-6 py-4 rounded-xl text-center',
              VERDICT_BADGE[data.aiDetection.verdict] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20')}>
              {data.aiDetection.verdict}
            </div>

            {/* Probability Bar */}
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>{probLabel}</span>
                <span className="font-bold text-white text-lg">{displayProb}%</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', barColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProb}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Indicators */}
            {Array.isArray(data.aiDetection.indicators) && data.aiDetection.indicators.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 font-semibold tracking-wider mb-3">INDICATORS</div>
                <div className="flex flex-col gap-2">
                  {data.aiDetection.indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className={cn('mt-1 w-2 h-2 rounded-full flex-shrink-0',
                        isReal ? 'bg-emerald-400' : 'bg-rose-400')} />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // NORMAL TEXT/URL/FILE VIEW
  return (
    <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full w-full max-w-[1400px] mx-auto space-y-6">

      {/* Header Summary */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-zinc-800 stroke-[8] fill-none" />
              <motion.circle cx="56" cy="56" r="48"
                className="stroke-teal-400 stroke-[8] fill-none stroke-linecap-round"
                strokeDasharray="301"
                initial={{ strokeDashoffset: 301 }}
                animate={{ strokeDashoffset: 301 - (301 * data.score) / 100 }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">{data.score}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Analysis Complete</h2>
            <p className="text-zinc-400 font-medium text-lg">Found {data.totalClaims} verifiable claims.</p>
          </div>
        </div>

        <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-sm shadow-inner">
          <StatBox label="True" count={data.stats.true} color="text-emerald-400" />
          <div className="w-px bg-white/10" />
          <StatBox label="False" count={data.stats.false} color="text-rose-400" />
          <div className="w-px bg-white/10" />
          <StatBox label="Partial" count={data.stats.partial} color="text-amber-400" />
        </div>

        <button onClick={onReset}
          className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all text-white cursor-pointer z-50 relative">
          Analyze Another
        </button>
      </div>

      {/* AI Text Detection Badge */}
      {data.aiTextDetection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 border border-white/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">AI Content Detection</h3>
                <p className="text-sm text-zinc-400">Analyzing writing patterns and style</p>
              </div>
            </div>
            {data.aiTextDetection.isInsufficient ? (
              <div className="text-right">
                <div className="text-2xl font-bold mb-1 text-amber-400">Insufficient Content</div>
                <div className="text-xs text-zinc-500">Add more meaningful text for AI detection</div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-bold mb-1",
                    data.aiTextDetection.isAIGenerated ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {data.aiTextDetection.verdict}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {data.aiTextDetection.isAIGenerated 
                      ? `${data.aiTextDetection.confidence}% AI probability`
                      : `${100 - data.aiTextDetection.confidence}% human probability`
                    }
                  </div>
                </div>
                <div className="w-24 h-24 relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" className="stroke-zinc-800 stroke-[6] fill-none" />
                    <motion.circle
                      cx="48"
                      cy="48"
                      r="40"
                      className={cn(
                        "stroke-[6] fill-none stroke-linecap-round",
                        data.aiTextDetection.isAIGenerated ? "stroke-rose-400" : "stroke-emerald-400"
                      )}
                      strokeDasharray="251"
                      initial={{ strokeDashoffset: 251 }}
                      animate={{ 
                        strokeDashoffset: 251 - (251 * (data.aiTextDetection.isAIGenerated 
                          ? data.aiTextDetection.confidence 
                          : (100 - data.aiTextDetection.confidence)
                        )) / 100 
                      }}
                      transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {data.aiTextDetection.isAIGenerated 
                        ? data.aiTextDetection.confidence 
                        : (100 - data.aiTextDetection.confidence)
                      }%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {data.aiTextDetection.indicators && data.aiTextDetection.indicators.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs font-semibold text-zinc-500 tracking-wider mb-2">DETECTION INDICATORS</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.aiTextDetection.indicators.slice(0, 4).map((indicator, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className={cn(
                      "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                      data.aiTextDetection.isAIGenerated ? "bg-rose-400" : "bg-emerald-400"
                    )} />
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Split Content View */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Source Text */}
        <div className="flex-[0.4] glass-card rounded-2xl p-6 lg:p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-zinc-400 font-medium text-sm">
            <FileText className="w-4 h-4" />
            SOURCE TEXT
          </div>
          <div className="prose prose-invert max-w-none text-lg leading-relaxed text-zinc-300 overflow-y-auto">
            {data.text}
          </div>
        </div>

        {/* Right: Claim Cards */}
        <div className="flex-[0.6] flex flex-col gap-4 overflow-y-auto pb-10 pr-2">
          {(!data.claims || data.claims.length === 0) ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center border border-white/5 bg-white/[0.02] h-full">
               <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                 <CheckCircle2 className="w-8 h-8 text-zinc-500" />
               </div>
               <h3 className="text-xl font-medium text-white mb-2">No Verifiable Claims Found</h3>
               <p className="text-zinc-400 text-sm max-w-sm">The text provided did not contain any factual claims that could be independently verified. Try submitting a news article or factual statement.</p>
            </motion.div>
          ) : (
            data.claims.map((claim, idx) => (
              <motion.div key={claim.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="glass-card rounded-2xl p-5 lg:p-6 border border-white/5 hover:border-white/10 transition-all overflow-hidden flex flex-col">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <span className={cn('px-3 py-1 text-xs font-bold tracking-wider rounded-lg uppercase flex-shrink-0', VERDICT_COLORS[claim.verdict])}>
                    {claim.verdict}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    CONFIDENCE
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={cn('h-full', claim.confidence > 80 ? 'bg-teal-400' : claim.confidence > 50 ? 'bg-amber-400' : 'bg-zinc-500')}
                        style={{ width: `${claim.confidence}%` }} />
                    </div>
                    {claim.confidence}%
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-4 pr-8 text-white break-words">"{claim.text}"</h3>
                <div className="bg-black/30 rounded-xl p-4 border border-white/[0.02] mb-4 text-sm leading-relaxed text-zinc-300 break-words whitespace-pre-wrap">
                  <div className="flex items-center gap-2 mb-2 text-zinc-500 font-semibold text-xs tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> AI REASONING
                  </div>
                  {claim.reasoning}
                </div>
                {claim.evidence && claim.evidence.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-xs font-semibold text-zinc-500 tracking-wider mb-3">SUPPORTING EVIDENCE</div>
                    <div className="grid gap-2">
                      {claim.evidence.map((ev, i) => (
                        <a href={ev.url} key={i} target="_blank" rel="noreferrer"
                          className="flex gap-3 items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 group/link overflow-hidden w-full">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <LinkIcon className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate group-hover/link:text-blue-400 transition-colors">{ev.title}</p>
                            <p className="text-xs text-zinc-500 truncate">{ev.snippet}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-600 group-hover/link:text-blue-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

const StatBox = ({ label, count, color }) => (
  <div className="flex flex-col items-center justify-center px-4">
    <span className={cn('text-2xl font-bold font-mono tracking-tight', color)}>{count}</span>
    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
  </div>
);