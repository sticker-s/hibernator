'use client';

import React, { useState, useEffect } from "react";
import {
  CandidateService, CampaignService,
  Candidate, Campaign, OutreachLog, SearchResult, GeneratedOutreach
} from "@/lib/api";
import {
  Search, UserPlus, Cpu, Code, Mail,
  Briefcase, ExternalLink, ChevronRight, Loader2,
  Zap, Users, Target, MessageSquare
} from "lucide-react";

type Tab = 'candidates' | 'search' | 'campaigns' | 'outreach';

export default function Dashboard() {

  const [activeTab, setActiveTab] = useState<Tab>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  const [githubUsername, setGithubUsername] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLimit, setSearchLimit] = useState(5);

  const [campTitle, setCampTitle] = useState('');
  const [campRole, setCampRole] = useState('');
  const [campTone, setCampTone] = useState('engineer-to-engineer');

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLog[]>([]);
  const [generatedOutreach, setGeneratedOutreach] = useState<GeneratedOutreach | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const setMsg = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setStatusMsg(msg);
    setStatusType(type);
    if (type !== 'info') setTimeout(() => setStatusMsg(''), 5000);
  };

  const loadCandidates = async () => {
    try {
      const data = await CandidateService.getAll();
      setCandidates(data);
    } catch {
      console.error('Failed to fetch candidates');
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await CampaignService.getAll();
      setCampaigns(data);
    } catch {
      console.error('Failed to fetch campaigns');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cands = await CandidateService.getAll();
        if (mounted) setCandidates(cands);
      } catch { }
      try {
        const camps = await CampaignService.getAll();
        if (mounted) setCampaigns(camps);
      } catch { }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) return;
    setLoading(true);
    setMsg(`Analyzing GitHub profile @${githubUsername}...`);
    try {
      const res = await CandidateService.importGitHub(githubUsername.trim());
      setMsg(`✓ Imported @${githubUsername} — Craftsmanship: ${res.candidate?.craftsmanship_score?.toFixed(1)}`, 'success');
      setGithubUsername('');
      await loadCandidates();
    } catch {
      setMsg('Import failed. Check the username or API status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await CandidateService.semanticSearch(searchQuery.trim(), searchLimit);
      setSearchResults(Array.isArray(res) ? res : []);
      setActiveTab('search');
    } catch {
      setMsg('Semantic search failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim() || !campRole.trim()) return;
    setLoading(true);
    try {
      await CampaignService.create(campTitle.trim(), campRole.trim(), campTone);
      setMsg('✓ Campaign created!', 'success');
      setCampTitle('');
      setCampRole('');
      await loadCampaigns();
    } catch {
      setMsg('Failed to create campaign.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setGeneratedOutreach(null);
    setSelectedCandidate(null);
    try {
      const logs = await CampaignService.getOutreachLogs(campaign.id);
      setOutreachLogs(logs);
    } catch {
      setOutreachLogs([]);
    }
  };

  const handleGenerateOutreach = async (candidate: Candidate) => {
    if (!selectedCampaign) return;
    setGeneratingFor(candidate.id);
    setSelectedCandidate(candidate);
    setGeneratedOutreach(null);
    try {
      const result = await CampaignService.generateOutreach(selectedCampaign.id, candidate.id);
      setGeneratedOutreach(result);
      // Refresh logs
      const logs = await CampaignService.getOutreachLogs(selectedCampaign.id);
      setOutreachLogs(logs);
    } catch {
      setMsg('Failed to generate outreach. Check campaign/candidate IDs.', 'error');
    } finally {
      setGeneratingFor(null);
    }
  };

  const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'candidates', label: 'Candidates', icon: <Users className="w-4 h-4" />, badge: candidates.length },
    { id: 'search', label: 'Semantic Search', icon: <Search className="w-4 h-4" />, badge: searchResults.length || undefined },
    { id: 'campaigns', label: 'Campaigns', icon: <Target className="w-4 h-4" />, badge: campaigns.length },
    { id: 'outreach', label: 'Outreach', icon: <Mail className="w-4 h-4" /> },
  ];

  const ScoreBadge = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className={`text-center px-3 py-1 rounded-lg border ${color}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide block opacity-70">{label}</span>
      <span className="text-sm font-bold">{(value ?? 0).toFixed(1)}</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="text-indigo-500 w-6 h-6" />
            Hibernator Intelligence Engine
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-400">
              <span className="text-indigo-400 font-bold">{candidates.length}</span> candidates &nbsp;·&nbsp;
              <span className="text-emerald-400 font-bold">{campaigns.length}</span> campaigns
            </span>
            {statusMsg && (
              <span className={`text-xs px-3 py-1 rounded-full border ${statusType === 'error' ? 'bg-red-950/50 border-red-800 text-red-300' :
                statusType === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' :
                  'bg-indigo-950/50 border-indigo-800 text-indigo-300'
                }`}>{statusMsg}</span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-200">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Ingest GitHub Profile
            </h2>
            <form onSubmit={handleImport} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. torvalds"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {loading ? 'Running AI Pipeline…' : 'Import & Evaluate'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-200">
              <Search className="w-4 h-4 text-emerald-400" />
              Vector Semantic Search
            </h2>
            <form onSubmit={handleSearch} className="space-y-3">
              <textarea
                rows={2}
                placeholder="e.g. high-throughput distributed systems Rust"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 whitespace-nowrap">Top</label>
                <select
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none w-16"
                >
                  {[3, 5, 10, 15].map(n => <option key={n}>{n}</option>)}
                </select>
                <label className="text-xs text-slate-400">results</label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                Search (pgvector)
              </button>
            </form>
          </div>

          <nav className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
            {TAB_CONFIG.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === t.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
              >
                <span className="flex items-center gap-2">{t.icon}{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{t.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-6">

          {activeTab === 'candidates' && (
            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-slate-200">
                <Code className="w-5 h-5 text-indigo-400" />
                Evaluated Candidate Pipeline
                <span className="text-xs text-slate-500 font-normal ml-1">({candidates.length} profiles)</span>
              </h2>
              {candidates.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-400 text-sm">No candidates imported yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Use the sidebar to ingest GitHub profiles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white truncate">{cand.full_name || 'Anonymous Developer'}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cand.current_org || 'Independent'} · {cand.location || 'Remote'}
                          </p>
                          {cand.primary_email && (
                            <p className="text-xs text-slate-500 mt-0.5">{cand.primary_email}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <ScoreBadge
                            label="Craft"
                            value={cand.craftsmanship_score}
                            color="bg-indigo-950/50 border-indigo-800/50 text-indigo-300"
                          />
                          <ScoreBadge
                            label="Hibernate"
                            value={cand.hibernation_index}
                            color="bg-amber-950/50 border-amber-800/50 text-amber-300"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => { setActiveTab('outreach'); }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        >
                          <Mail className="w-3 h-3" /> Generate Outreach
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'search' && (
            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-slate-200">
                <Search className="w-5 h-5 text-emerald-400" />
                Semantic Search Results
                {searchResults.length > 0 && (
                  <span className="text-xs text-slate-500 font-normal ml-1">({searchResults.length} matches for &quot;{searchQuery}&quot;)</span>
                )}
              </h2>
              {searchResults.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-400 text-sm">No results yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Use the search box in the sidebar to query across all candidates.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((res, i) => (
                    <div key={res.artifact_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] bg-emerald-900/50 border border-emerald-800/50 text-emerald-400 px-1.5 py-0.5 rounded font-mono">#{i + 1}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wide">{res.artifact_type || 'repository'}</span>
                          </div>
                          <h3 className="font-bold text-emerald-300">{res.title}</h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{res.summary}</p>
                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 mt-2 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {res.url}
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <ScoreBadge
                            label="Craft"
                            value={res.craftsmanship_score}
                            color="bg-indigo-950/50 border-indigo-800/50 text-indigo-300"
                          />
                          <ScoreBadge
                            label="Hibernate"
                            value={res.hibernation_index}
                            color="bg-amber-950/50 border-amber-800/50 text-amber-300"
                          />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-700/50 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                            {res.candidate_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-200">{res.candidate_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {res.candidate_org || 'Independent'} · {res.candidate_location || 'Remote'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'campaigns' && (
            <section className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-200">
                  <Briefcase className="w-4 h-4 text-violet-400" />
                  Create Outreach Campaign
                </h2>
                <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Campaign Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Backend Q4"
                      value={campTitle}
                      onChange={(e) => setCampTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Target Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Staff Engineer"
                      value={campRole}
                      onChange={(e) => setCampRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Tone Profile</label>
                    <select
                      value={campTone}
                      onChange={(e) => setCampTone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="engineer-to-engineer">Engineer-to-Engineer</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="visionary">Visionary</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={loading || !campTitle.trim() || !campRole.trim()}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                      Create Campaign
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Active Campaigns ({campaigns.length})</h3>
                {campaigns.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400 text-sm">No campaigns yet. Create one above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-violet-500/40 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-semibold text-white">{camp.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {camp.target_role} · <span className="text-violet-400">{camp.tone_profile}</span>
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1">ID: {camp.id}</p>
                        </div>
                        <button
                          onClick={() => { handleSelectCampaign(camp); setActiveTab('outreach'); }}
                          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors shrink-0"
                        >
                          <MessageSquare className="w-3 h-3" /> Generate Outreach
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'outreach' && (
            <section className="space-y-6">
              <h2 className="text-base font-semibold flex items-center gap-2 text-slate-200">
                <Mail className="w-5 h-5 text-rose-400" />
                Outreach Generator
              </h2>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">Step 1 — Select Campaign</p>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No campaigns yet.{' '}
                    <button onClick={() => setActiveTab('campaigns')} className="text-violet-400 hover:underline">Create one</button>.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {campaigns.map(camp => (
                      <button
                        key={camp.id}
                        onClick={() => handleSelectCampaign(camp)}
                        className={`px-3 py-2 rounded-lg text-xs border transition-colors ${selectedCampaign?.id === camp.id
                          ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                          : 'border-slate-700 text-slate-400 hover:border-violet-600/50 hover:text-slate-200'
                          }`}
                      >
                        {camp.title}
                        <span className="ml-1.5 text-slate-500">({camp.target_role})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCampaign && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">
                    Step 2 — Generate Outreach for Candidate
                    <span className="ml-2 text-violet-300 normal-case font-normal">Campaign: {selectedCampaign.title}</span>
                  </p>
                  {candidates.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No candidates yet.{' '}
                      <button onClick={() => setActiveTab('candidates')} className="text-indigo-400 hover:underline">Import one</button>.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {candidates.map(cand => (
                        <div key={cand.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-white">{cand.full_name || 'Anonymous'}</p>
                            <p className="text-[10px] text-slate-500">{cand.current_org || 'Independent'} · {cand.location || 'Remote'}</p>
                          </div>
                          <button
                            onClick={() => handleGenerateOutreach(cand)}
                            disabled={generatingFor === cand.id}
                            className="text-xs bg-rose-600/20 border border-rose-700/50 text-rose-300 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {generatingFor === cand.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            {generatingFor === cand.id ? 'Writing…' : 'Generate AI Outreach'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {generatedOutreach && (
                <div className="bg-slate-900 border border-emerald-800/50 rounded-xl p-5 shadow-xl">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-3">
                    ✓ Outreach Draft — {selectedCandidate?.full_name}
                  </p>
                  <p className="text-xs text-slate-400 mb-1">Subject</p>
                  <p className="text-sm font-semibold text-white mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
                    {generatedOutreach.outreach.subject}
                  </p>
                  <p className="text-xs text-slate-400 mb-1">Email Body</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed p-4 bg-slate-950 rounded-lg border border-slate-800 font-sans">
                    {generatedOutreach.outreach.body}
                  </pre>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${generatedOutreach.outreach.status === 'drafted'
                      ? 'bg-amber-950/30 border-amber-700 text-amber-400'
                      : 'bg-emerald-950/30 border-emerald-700 text-emerald-400'
                      }`}>
                      {generatedOutreach.outreach.status}
                    </span>
                    <span className="text-[10px] text-slate-600">ID: {generatedOutreach.outreach.id}</span>
                  </div>
                </div>
              )}

              {selectedCampaign && outreachLogs.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                    Outreach Logs — {selectedCampaign.title} ({outreachLogs.length})
                  </p>
                  <div className="space-y-3">
                    {outreachLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-200">{log.email_subject || '(No subject)'}</p>
                            <p className="text-slate-500 mt-0.5">Candidate: {log.candidate_id}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] ${log.status === 'sent'
                            ? 'bg-emerald-950/30 border-emerald-700 text-emerald-400'
                            : 'bg-amber-950/30 border-amber-700 text-amber-400'
                            }`}>
                            {log.status}
                          </span>
                        </div>
                        {log.email_body && (
                          <p className="text-slate-500 line-clamp-2 leading-relaxed">{log.email_body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
