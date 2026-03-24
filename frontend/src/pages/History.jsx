import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, FileText, Globe, AlertCircle, Trash2, X, Video, Image as ImageIcon, File } from 'lucide-react';
import { cn } from '../lib/utils';
import { API_URL } from '../config';
import { useOutletContext } from 'react-router-dom';

export default function History() {
  const { theme } = useOutletContext();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, preview }

  const fetchAndShowReport = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/history/${id}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const report = await res.json();
      setSelectedReport(report || null);
    } catch (err) {
      console.error('Error loading report:', err);
    }
  };

  const handleDelete = async (id, event) => {
    event.stopPropagation(); // Prevent opening the report
    
    // Find the item to show preview in confirmation
    const item = historyData.find(h => h.id === id);
    setDeleteConfirm({ id, preview: item?.preview || 'this analysis' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`${API_URL}/api/history/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (res.ok) {
        // Remove from local state
        setHistoryData(prev => prev.filter(item => item.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      } else {
        setError('Failed to delete analysis');
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Failed to delete analysis');
      setDeleteConfirm(null);
    }
  };

  useEffect(() => {
    async function fetchHistory() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('User not authenticated.');
          setLoading(false);
          return;
        }

const res = await fetch(`${API_URL}/api/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch history data');
        }

        const data = await res.json();
        
        // The backend returns the array directly
        const formattedData = data.map(item => {
          // For images/videos, use AI probability directly (backend already corrected it)
          let displayScore = item.score || 0;
          if ((item.type === 'image' || item.type === 'video') && item.aiDetection?.ai_probability) {
            const aiProb = item.aiDetection.ai_probability;
            displayScore = aiProb > 1 ? Math.round(aiProb) : Math.round(aiProb * 100);
          }
          
          return {
            id: item._id,
            date: new Date(item.createdAt).toLocaleString(undefined, { 
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
            }),
            type: item.type || (item.preview && item.preview.startsWith('http') ? 'url' : 'text'),
            preview: item.preview || 'No content provided',
            score: displayScore,
            claims: item.claims ? item.claims.length : 0,
            status: 'completed'
          };
        });
        
        setHistoryData(formattedData);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to load history.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const isImageReport = selectedReport?.type === 'image' && selectedReport?.aiDetection;
  const isVideoReport = selectedReport?.type === 'video' && selectedReport?.aiDetection;
  const detection = (isImageReport || isVideoReport) ? selectedReport.aiDetection : null;
  const verdict = detection?.verdict || 'Uncertain';
  const verdictClass = verdict === 'Real' || verdict === 'Likely Real'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : verdict === 'Uncertain'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  const rawAiProb = detection?.ai_probability || 0;
  const aiProb = rawAiProb > 1 ? Math.round(rawAiProb) : Math.round(rawAiProb * 100);
  const isReal = verdict === 'Real' || verdict === 'Likely Real';
  const displayProb = aiProb; // Show AI probability directly, no inversion
  const boundedProb = Math.min(100, Math.max(0, displayProb || 0));
  const probLabel = 'AI Probability';
  const indicators = Array.isArray(detection?.indicators)
    ? detection.indicators
    : detection?.indicators
      ? [detection.indicators]
      : [];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative z-10 pt-4 pb-12 overflow-x-hidden px-4">
      <div className="flex items-center justify-between mb-10 sm:mb-14 overflow-x-hidden">
        <div className="overflow-x-hidden max-w-full">
          <h1 className={`text-4xl sm:text-5xl font-bold tracking-tight mb-3 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
              : 'text-gray-900'
          }`}>
            Analysis History
          </h1>
          <p className={`text-lg sm:text-xl font-light ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Review your past fact-checks and verifications.
          </p>
        </div>
      </div>

      <div className="relative overflow-x-hidden">
        <div className="absolute left-[39px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.3)]" />

        <div className="space-y-8">
          {loading ? (
             <div className="text-zinc-400 pl-24 animate-pulse">Loading history...</div>
          ) : error ? (
             <div className="text-rose-400 pl-24 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> {error}</div>
          ) : historyData.length === 0 ? (
             <div className="text-zinc-500 pl-24">No analysis history found. Start analyzing to see results here!</div>
          ) : historyData.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative flex items-start gap-8 group cursor-pointer"
              onClick={() => fetchAndShowReport(item.id)}
            >
              <div className="relative z-10 mt-5 w-20 flex justify-center">
                <motion.div 
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-white/20 group-hover:border-white/40 group-hover:shadow-glow transition-all duration-300"
                  whileHover={{ scale: 1.2 }}
                />
              </div>

              <div className="flex-1 glass-card rounded-2xl p-6 border border-white/10 transition-all duration-300 hover:border-indigo-500/30 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 relative overflow-hidden group-hover:bg-gradient-to-br group-hover:from-white/[0.08] group-hover:to-white/[0.03]">
                <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${
                  theme === 'dark' ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-br from-indigo-200/20 to-purple-200/20'
                }`} />

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
                      {item.type === 'video' ? (
                        <Video className="w-4 h-4 text-purple-400" />
                      ) : item.type === 'image' ? (
                        <ImageIcon className="w-4 h-4 text-pink-400" />
                      ) : item.type === 'file' ? (
                        <File className="w-4 h-4 text-blue-400" />
                      ) : item.type === 'text' ? (
                        <div className="w-4 h-4 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          T
                        </div>
                      ) : (
                        <Globe className="w-4 h-4 text-teal-400" />
                      )}
                    </div>
                    <span className={`text-sm font-semibold tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      {item.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-500 font-semibold tracking-wider">
                        {item.type === 'image' ? 'AI PROBABILITY' : item.type === 'video' ? 'AI PROBABILITY' : 'ACCURACY'}
                      </span>
                      <span className={cn(
                        "text-2xl font-bold font-mono",
                        item.score > 80 ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : 
                        item.score > 40 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : 
                        "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]"
                      )}>
                        {item.score}%
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className={`text-xl font-medium mb-4 pr-12 break-words overflow-wrap-anywhere max-w-full ${
                  theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                }`}>
                  {item.preview}
                </h3>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <span className={`text-sm font-medium flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-600'}`}>
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                    {item.claims} claims analyzed
                  </span>

                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={(e) => handleDelete(item.id, e)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete analysis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                      View Report <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {selectedReport && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 overflow-y-auto overflow-x-hidden"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="max-w-4xl mx-auto my-8 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`rounded-3xl p-8 lg:p-10 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden mb-6 border ${
              theme === 'dark'
                ? 'glass-card border-white/10'
                : 'bg-white border-gray-200 shadow-xl'
            }`}>
              <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] ${
                theme === 'dark' ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-br from-indigo-200/30 to-purple-200/30'
              }`} />

              <div className="flex items-center gap-8">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" className="stroke-white/10 stroke-[8] fill-none" />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      className="stroke-indigo-500 stroke-[8] fill-none stroke-linecap-round shadow-glow"
                      strokeDasharray="352"
                      initial={{ strokeDashoffset: 352 }}
                      animate={{ 
                        strokeDashoffset: 352 - (352 * (selectedReport.score || 0)) / 100 
                      }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${
                      theme === 'dark'
                        ? 'bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
                        : 'text-gray-900'
                    }`}>
                      {Math.round(selectedReport.score || 0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className={`text-4xl font-bold mb-3 tracking-tight ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'
                      : 'text-gray-900'
                  }`}>
                    {(isImageReport || isVideoReport) ? 'AI Detection Report' : 'Analysis Report'}
                  </h2>
                  <p className={`font-medium text-xl ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    {(isImageReport || isVideoReport) ? 'AI generation detection details' : 'Full claim verification details'}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={() => setSelectedReport(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all text-white cursor-pointer z-50 relative"
              >
                Close
              </motion.button>
            </div>

            {selectedReport.originalText && !isImageReport && !isVideoReport && selectedReport.type !== 'file' && (
              <div className={`rounded-2xl p-8 lg:p-10 mb-6 border ${
                theme === 'dark'
                  ? 'glass-card border-white/10'
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className={`flex items-center gap-3 mb-6 font-semibold text-sm tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  SOURCE TEXT
                </div>
                <div className={`prose max-w-none text-lg leading-relaxed break-words overflow-wrap-anywhere ${
                  theme === 'dark' ? 'prose-invert text-slate-300' : 'text-gray-700'
                }`}>
                  {selectedReport.originalText}
                </div>
              </div>
            )}

            {selectedReport.type === 'file' && selectedReport.fileName && (
              <div className={`rounded-2xl p-8 lg:p-10 mb-6 border ${
                theme === 'dark'
                  ? 'glass-card border-white/10'
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className={`flex items-center gap-3 mb-6 font-semibold text-sm tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <File className="w-4 h-4 text-indigo-400" />
                  </div>
                  UPLOADED DOCUMENT
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                  <File className={`w-8 h-8 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedReport.fileName}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Document analyzed for factual claims
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isImageReport && (
              <div className={`rounded-2xl p-6 flex flex-col gap-6 border ${
                theme === 'dark' ? 'glass-card border-white/10' : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className={`text-xs tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} font-bold uppercase`}>
                  DETECTION RESULT
                </div>

                <div className={cn(
                  "px-5 py-3 rounded-2xl text-2xl font-bold tracking-wide border w-fit",
                  verdictClass
                )}>
                  {verdict}
                </div>

                <div className={`flex items-center justify-between text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  <span className="font-semibold tracking-wide">{probLabel}</span>
                  <span className={`font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{boundedProb}%</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}`}>
                  <div
                    className={cn(
                      "h-full",
                      aiProb < 50 ? "bg-emerald-400" : "bg-rose-400"
                    )}
                    style={{ width: `${boundedProb}%` }}
                  />
                </div>

                {/* Display image from Cloudinary if available */}
                {selectedReport.mediaUrl && (
                  <div className="mt-4">
                    <div className={`text-xs tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} font-bold uppercase`}>
                      ANALYZED IMAGE
                    </div>
                    <img 
                      src={selectedReport.mediaUrl} 
                      alt="Analyzed" 
                      className="w-full rounded-xl border border-white/10 object-contain max-h-80 shadow-lg" 
                    />
                  </div>
                )}

                <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-black/30 border-white/[0.02]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-xs font-semibold tracking-wider mb-3 uppercase ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'}`}>INDICATORS</div>
                  <ul className={`list-disc list-inside text-sm space-y-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {indicators.length > 0 ? indicators.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    )) : (
                      <li>No indicators provided.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {isVideoReport && (
              <div className={`rounded-2xl p-6 flex flex-col gap-6 border ${
                theme === 'dark' ? 'glass-card border-white/10' : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className={`text-xs tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} font-bold uppercase`}>
                  DEEPFAKE DETECTION RESULT
                </div>

                <div className={cn(
                  "px-5 py-3 rounded-2xl text-2xl font-bold tracking-wide border w-fit",
                  verdictClass
                )}>
                  {verdict}
                </div>

                <div className={`flex items-center justify-between text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  <span className="font-semibold tracking-wide">{probLabel}</span>
                  <span className={`font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{boundedProb}%</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}`}>
                  <div
                    className={cn(
                      "h-full",
                      aiProb < 50 ? "bg-emerald-400" : "bg-rose-400"
                    )}
                    style={{ width: `${boundedProb}%` }}
                  />
                </div>

                {/* Display video from Cloudinary if available */}
                {selectedReport.mediaUrl && (
                  <div className="mt-4">
                    <div className={`text-xs tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} font-bold uppercase`}>
                      ANALYZED VIDEO
                    </div>
                    <video 
                      src={selectedReport.mediaUrl} 
                      controls 
                      className="w-full rounded-xl border border-white/10 max-h-80 shadow-lg" 
                    />
                    {selectedReport.fileName && (
                      <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
                        {selectedReport.fileName}
                      </p>
                    )}
                  </div>
                )}

                <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-black/30 border-white/[0.02]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-xs font-semibold tracking-wider mb-3 uppercase ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'}`}>INDICATORS</div>
                  <ul className={`list-disc list-inside text-sm space-y-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {indicators.length > 0 ? indicators.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    )) : (
                      <li>No indicators provided.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {!isImageReport && (
              <div className="flex flex-col gap-5">
                {(selectedReport.claims || []).map((claim, idx) => (
                <motion.div
                  key={claim.id || idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className={`rounded-2xl p-6 lg:p-8 border transition-all group ${
                    theme === 'dark'
                      ? 'glass-card border-white/10 hover:border-indigo-500/30 hover:shadow-glow'
                      : 'bg-white border-gray-200 hover:border-indigo-300 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold tracking-wider rounded-lg uppercase",
                      claim.verdict === 'TRUE' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      claim.verdict === 'FALSE' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      claim.verdict === 'PARTIAL' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    )}>
                      {claim.verdict}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                      CONFIDENCE
                      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            claim.confidence > 80 ? "bg-teal-400" : claim.confidence > 50 ? "bg-amber-400" : "bg-zinc-500"
                          )}
                          style={{ width: `${claim.confidence || 0}%` }}
                        />
                      </div>
                      {claim.confidence || 0}%
                    </div>
                  </div>

                  <h3 className={`text-xl font-medium mb-4 pr-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <span className="break-words">"{claim.text}"</span>
                  </h3>

                  <div className={`rounded-xl p-4 border mb-4 text-sm leading-relaxed break-words ${
                    theme === 'dark'
                      ? 'bg-black/30 border-white/[0.02] text-zinc-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold text-xs tracking-wider ${
                      theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'
                    }`}>
                      <FileText className="w-3.5 h-3.5" /> AI REASONING
                    </div>
                    <span className="break-words">{claim.reasoning}</span>
                  </div>

                  {claim.evidence && claim.evidence.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className={`text-xs font-semibold tracking-wider mb-3 ${
                        theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'
                      }`}>
                        SUPPORTING EVIDENCE
                      </div>
                      <div className="grid gap-2">
                        {claim.evidence.map((ev, i) => (
                          <a
                            href={ev.url}
                            key={i}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex gap-3 items-center p-3 rounded-xl transition-colors border group/link ${
                              theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/5'
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              theme === 'dark' ? 'bg-zinc-800' : 'bg-white border border-gray-200'
                            }`}>
                              <Globe className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium transition-colors break-words ${
                                theme === 'dark'
                                  ? 'text-slate-200 group-hover/link:text-blue-400'
                                  : 'text-gray-800 group-hover/link:text-indigo-600'
                              }`}>
                                {ev.title}
                              </p>
                              <p className={`text-xs break-words line-clamp-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
                                {ev.snippet}
                              </p>
                              <p className={`text-xs mt-1 break-all ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-400'}`}>
                                {ev.url}
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-colors ${
                              theme === 'dark'
                                ? 'text-zinc-600 group-hover/link:text-blue-400'
                                : 'text-gray-400 group-hover/link:text-indigo-600'
                            }`} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-3xl p-8 max-w-md w-full border border-rose-500/30 bg-[#0a0a0f]/95 shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 shadow-glow">
                  <Trash2 className="w-7 h-7 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Delete Analysis?</h3>
                  <p className="text-sm text-zinc-400">
                    Are you sure you want to delete this analysis? This action cannot be undone.
                  </p>
                  <p className="text-sm text-zinc-500 mt-3 line-clamp-2 italic">
                    "{deleteConfirm.preview}"
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setDeleteConfirm(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={confirmDelete}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold transition-all shadow-glow"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
