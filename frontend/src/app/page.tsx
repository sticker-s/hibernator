'use client';

import React, { useState, useEffect } from "react";
import { CandidateService, Candidate } from "@/lib/api";
import { Search, UserPlus, Cpu, Zap, Code, Mail } from "lucide-react";

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [githubUsername, setGithubUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const data = await CandidateService.getAll();
      setCandidates(data);
    } catch (error) {
      console.error('Failed to fetch candidates: ', error);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername) return;
    setLoading(true);
    setStatusMsg(`Analyzing GitHub profile @${githubUsername}...`);
    try {
      await CandidateService.importGitHub(githubUsername);
      setStatusMsg(`Successfully imported @${githubUsername}!`);
      setGithubUsername('');
      await loadCandidates();
    } catch (error) {
      setStatusMsg('Import failed. Please check the username or API status.');
    }
    finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof searchQuery !== 'string' || !searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await CandidateService.semanticSearch(searchQuery);
      setSearchResults(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Search failed: ', error);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Cpu className="text-indigo-500 w-8 h-8" />
            Hibernator Intelligence Engine
          </h1>
          <p className="text-slate-400 mt-1">Autonomous Technical Talent Sourcing Craftsmanship Evaluation</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-center">
            <span className="text-xs text-slate-400 block"> Total Candidates</span>
            <span className="text-xl font-bold text-indigo-400">{candidates.length}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Ingest Candidate Profile
            </h2>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Github Username</label>
                <input
                  type="text"
                  placeholder="e.g. torvalds"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing AI Pipeline...' : 'Import & Run Craftsmanship AI'}
              </button>
            </form>
            {statusMsg && <p className="text-xs text-indigo-300 mt-3">{statusMsg}</p>}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-emerald-400" />
              Vector Semantic Search
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Search Techincal Capabilities</label>
                <input
                  type="text"
                  placeholder="e.g. high throughput distributed backend"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Search Artifacts (pgvector)
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400">Top Match Artifacts: </h3>
                {searchResults.map((res, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                    <p className="font-bold text-emerald-400">{res.title}</p>
                    <p className="text-slate-300 mt-1">{res.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <Code className="w-5 h-5 text-indigo-400" />
            Evaluated Candidate Pipeline
          </h2>
          {candidates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
              <p className="text-slate-400 text-sm">No candidates imported yet.</p>
              <p className="text-xs text-slate-500 mt-1">Use the panel on the left to ingest GitHub profiles.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">{cand.full_name || 'Anonymous Developer'}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {cand.current_org || 'Independent Contributor'} • {cand.location || 'Remote'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-center px-3 py-1 bg-indigo-950/50 border border-indigo-800/50 rounded-lg">
                        <span className="text-[10px] text-indigo-300 block font-semibold uppercase">Craftsmanship</span>
                        <span className="text-base font-bold text-indigo-400">{cand.craftsmanship_score.toFixed(1)}</span>
                      </div>
                      <div className="text-center px-3 py-1 bg-amber-950/50 border border-amber-800/50 rounded-lg">
                        <span className="text-[10px] text-amber-300 block font-semibold uppercase">Hibernation</span>
                        <span className="text-base font-bold text-amber-400">{cand.hibernation_index.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}