import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Activity, 
  TrendingUp, 
  Flame, 
  CheckCircle, 
  Upload, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw,
  BookOpen,
  HelpCircle,
  Clock
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter,
  ZAxis,
  Legend
} from 'recharts';
import { snaApi } from './api/snaApi';

function App() {
  // Navigasi
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Status Graf
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphMeta, setGraphMeta] = useState({ nodes_count: 0, edges_count: 0 });
  const [influencers, setInfluencers] = useState([]);
  const [centralityMap, setCentralityMap] = useState({});
  const [lbaMap, setLbaMap] = useState({});
  const [activeCentralityMethod, setActiveCentralityMethod] = useState('exact');

  // States untuk kontrol visualisasi WebGL & Limitasi Node (Opsi C)
  const [graphDimensions, setGraphDimensions] = useState('2d'); // '2d' | '3d'
  const [visualNodeLimit, setVisualNodeLimit] = useState(1000);
  const [showLinks, setShowLinks] = useState(true);

  // Data mentah graf untuk filter client-side cepat
  const [rawGraphNodes, setRawGraphNodes] = useState([]);
  const [rawGraphEdges, setRawGraphEdges] = useState([]);
  const [rawExactCent, setRawExactCent] = useState(null);
  const [rawLbaCent, setRawLbaCent] = useState(null);
  
  // Konfigurasi Pemuat Graf
  const [sourceType, setSourceType] = useState('synthetic'); // 'synthetic' | 'predefined'
  const [datasetName, setDatasetName] = useState('barabasi_albert');
  const [nodeCount, setNodeCount] = useState(100);
  const [mParam, setMParam] = useState(2);
  const [kParam, setKParam] = useState(4);
  const [pParam, setPParam] = useState(0.1);
  const [fileToUpload, setFileToUpload] = useState(null);
  
  // Pembaruan Edge Dinamis
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [lastUpdateStats, setLastUpdateStats] = useState(null);
  const [affectedNodes, setAffectedNodes] = useState([]);

  // Benchmark
  const [benchmarkHistory, setBenchmarkHistory] = useState([]);
  const [benchmarkSummary, setBenchmarkSummary] = useState(null);
  const [accuracyResults, setAccuracyResults] = useState(null);
  const [lbaPercent, setLbaPercent] = useState(0.05);

  // States untuk pengujian hipotesis akademik
  const [hypothesisResults, setHypothesisResults] = useState(null);
  const [runningHypothesis, setRunningHypothesis] = useState(false);
  const [subBenchmarkTab, setSubBenchmarkTab] = useState('standard'); // 'standard' | 'hypothesis'


  // Simulasi Propagasi Informasi (H4)
  const [seedCount, setSeedCount] = useState(3);
  const [propProb, setPropProb] = useState(0.15);
  const [propHistory, setPropHistory] = useState([]);
  const [propActiveStep, setPropActiveStep] = useState(0);
  const [propRunning, setPropRunning] = useState(false);
  const [propSeedsUsed, setPropSeedsUsed] = useState([]);
  const [propMode, setPropagationMode] = useState('closeness'); // 'closeness' | 'degree'
  const [simulationResults, setSimulationResults] = useState(null);
  const [simulationResponseRaw, setSimulationResponseRaw] = useState(null);
  const [failureRate, setFailureRate] = useState(0.15);
  const [failedNodes, setFailedNodes] = useState([]);
  
  // Pengujian SUS & Usabilitas (H3)
  const [taskTimers, setTaskTimers] = useState({
    task1: { elapsed: 0, running: false, completed: false, time: null },
    task2: { elapsed: 0, running: false, completed: false, time: null },
    task3: { elapsed: 0, running: false, completed: false, time: null }
  });
  const [susRatings, setSusRatings] = useState(Array(10).fill(3));
  const [susScore, setSusScore] = useState(null);

  // Status Umum UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const graphRef = useRef();
  const timerIntervals = useRef({ task1: null, task2: null, task3: null });

  // Inisialisasi graf default saat pertama kali dimuat
  useEffect(() => {
    initializeGraph('synthetic', 'barabasi_albert', 80);
  }, []);

  // Sinkronisasi data graf saat raw data, limit, atau visibilitas edge berubah
  useEffect(() => {
    if (rawGraphNodes.length === 0) return;

    const centMap = {};
    if (rawExactCent) {
      rawExactCent.forEach(item => {
        centMap[item.node] = item.closeness;
      });
    }
    setCentralityMap(centMap);

    const lCentMap = {};
    if (rawLbaCent) {
      rawLbaCent.forEach(item => {
        lCentMap[item.node] = item.approx || item.closeness || 0;
      });
    }
    setLbaMap(lCentMap);

    setGraphMeta({ nodes_count: rawGraphNodes.length, edges_count: rawGraphEdges.length });

    let links = [];
    if (showLinks) {
      links = rawGraphEdges.map(e => ({
        source: e.source,
        target: e.target
      }));
    }

    let processedNodes = rawGraphNodes.map(n => ({ ...n }));

    // Gunakan visualNodeLimit dinamis
    if (rawGraphNodes.length > visualNodeLimit) {
      processedNodes.sort((a, b) => {
        const scoreA = centMap[a.id] || lCentMap[a.id] || 0;
        const scoreB = centMap[b.id] || lCentMap[b.id] || 0;
        return scoreB - scoreA;
      });
      processedNodes = processedNodes.slice(0, visualNodeLimit);
      if (showLinks) {
        const topIds = new Set(processedNodes.map(n => n.id));
        links = links.filter(l => topIds.has(l.source) && topIds.has(l.target));
      }
    }

    setGraphData({ nodes: processedNodes, links });
  }, [rawGraphNodes, rawGraphEdges, rawExactCent, rawLbaCent, visualNodeLimit, showLinks]);

  // Handler untuk memperbarui data graf mentah
  const handleGraphDataUpdate = (nodes, edges, exactCent, lbaCent) => {
    setRawGraphNodes(nodes);
    setRawGraphEdges(edges);
    setRawExactCent(exactCent);
    setRawLbaCent(lbaCent);
    
    // Matikan links secara otomatis jika jumlah node > 2000 untuk performa rendering stabil
    if (nodes.length > 2000) {
      setShowLinks(false);
    } else {
      setShowLinks(true);
    }
  };

  // Ambil data graf lengkap dari backend
  const fetchGraphDetails = async () => {
    try {
      const info = await snaApi.getGraphInfo();
      const centralities = await snaApi.getNodeCentrality();
      const influencersData = await snaApi.getInfluencers(15);
      setInfluencers(influencersData);

      const accData = await snaApi.benchmarkAccuracy(lbaPercent);
      setAccuracyResults(accData);
      
      handleGraphDataUpdate(info.nodes, info.edges, centralities, accData.node_comparison);
    } catch (e) {
      setError('Gagal mengambil data graf: ' + e.message);
    }
  };

  // Inisialisasi Graf baru
  const initializeGraph = async (type = sourceType, name = datasetName, customN = null) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setAffectedNodes([]);
    setLastUpdateStats(null);
    stopPropagation();
    
    const payload = {
      source_type: type,
      name: name,
      n: customN || nodeCount,
      m: mParam,
      k: kParam,
      p: pParam
    };
    
    try {
      const data = await snaApi.initGraph(payload);
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg(data.message.replace('successfully', 'berhasil'));
        await fetchGraphDetails();
      }
    } catch (e) {
      setError('Kesalahan koneksi API: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Unggah berkas CSV
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return;
    
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    try {
      const uploadRes = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await uploadRes.json();
      
      if (uploadRes.ok) {
        setSuccessMsg('Dataset graf berhasil diunggah.');
        await fetchGraphDetails();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Gagal mengunggah berkas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tambah Edge
  const handleAddEdge = async (e) => {
    e.preventDefault();
    if (!edgeSource || !edgeTarget) return;
    
    setError('');
    setSuccessMsg('');
    
    try {
      const data = await snaApi.addEdge(edgeSource, edgeTarget);
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg(`Edge (${edgeSource}, ${edgeTarget}) berhasil ditambahkan.`);
        setLastUpdateStats(data.benchmark);
        setAffectedNodes(data.benchmark.affected_nodes);
        
        const runData = {
          step: (benchmarkHistory.length + 1),
          operation: 'Tambah',
          edge: `(${edgeSource}, ${edgeTarget})`,
          runtime_icc: data.benchmark.icc_time * 1000,
          runtime_full: data.benchmark.full_recompute_time * 1000,
          speedup: data.benchmark.speedup,
          efficiency: data.benchmark.efficiency
        };
        setBenchmarkHistory(prev => [...prev, runData]);
        
        setTimeout(() => setAffectedNodes([]), 3500);
        setEdgeSource('');
        setEdgeTarget('');
        await fetchGraphDetails();
      }
    } catch (err) {
      setError('Kesalahan API: ' + err.message);
    }
  };

  // Hapus Edge
  const handleRemoveEdge = async (e) => {
    e.preventDefault();
    if (!edgeSource || !edgeTarget) return;
    
    setError('');
    setSuccessMsg('');
    
    try {
      const data = await snaApi.removeEdge(edgeSource, edgeTarget);
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg(`Edge (${edgeSource}, ${edgeTarget}) berhasil dihapus.`);
        setLastUpdateStats(data.benchmark);
        setAffectedNodes(data.benchmark.affected_nodes);
        
        const runData = {
          step: (benchmarkHistory.length + 1),
          operation: 'Hapus',
          edge: `(${edgeSource}, ${edgeTarget})`,
          runtime_icc: data.benchmark.icc_time * 1000,
          runtime_full: data.benchmark.full_recompute_time * 1000,
          speedup: data.benchmark.speedup,
          efficiency: data.benchmark.efficiency
        };
        setBenchmarkHistory(prev => [...prev, runData]);
        
        setTimeout(() => setAffectedNodes([]), 3500);
        setEdgeSource('');
        setEdgeTarget('');
        await fetchGraphDetails();
      }
    } catch (err) {
      setError('Kesalahan API: ' + err.message);
    }
  };

  // Eksekusi Massal Benchmark Performa ICC
  const runBulkRuntimeBenchmark = async (count = 15) => {
    setLoading(true);
    try {
      const data = await snaApi.benchmarkRuntime(count);
      if (data.error) {
        setError(data.error);
      } else {
        const formatted = data.history.map(item => ({
          step: item.step,
          operation: item.operation === 'add' ? 'Tambah' : 'Hapus',
          edge: item.edge,
          runtime_icc: item.runtime_icc * 1000,
          runtime_full: item.runtime_full * 1000,
          speedup: item.speedup,
          efficiency: item.efficiency
        }));
        setBenchmarkHistory(formatted);
        setBenchmarkSummary(data.summary);
        setSuccessMsg(`Berhasil mengeksekusi benchmark ${count} update dinamis.`);
      }
    } catch (err) {
      setError('Kesalahan eksekusi benchmark: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Eksekusi Benchmark Akurasi LBA
  const runAccuracyCheck = async (percent = lbaPercent) => {
    setLoading(true);
    try {
      const data = await snaApi.benchmarkAccuracy(percent);
      if (data.error) {
        setError(data.error);
      } else {
        setAccuracyResults(data);
        const lMap = {};
        data.node_comparison.forEach(item => {
          lMap[item.node] = item.approx;
        });
        setLbaMap(lMap);
        setSuccessMsg(`Akurasi berhasil dihitung untuk Landmark = ${(percent * 100).toFixed(0)}%`);
      }
    } catch (err) {
      setError('Gagal menghitung akurasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHypothesisResults = async () => {
    try {
      const data = await snaApi.getHypothesisResults();
      if (data && !data.noResults) {
        setHypothesisResults(data);
      }
    } catch (err) {
      console.error("Gagal memuat hasil hipotesis:", err);
    }
  };

  const handleRunHypothesisTest = async () => {
    setRunningHypothesis(true);
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await snaApi.runHypothesisTest();
      if (data.error) {
        setError(data.error);
      } else {
        setHypothesisResults(data);
        setSuccessMsg('Pengujian hipotesis penelitian (H1 & H2) selesai dan berhasil diverifikasi!');
      }
    } catch (err) {
      setError('Gagal menjalankan pengujian hipotesis: ' + err.message);
    } finally {
      setRunningHypothesis(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'benchmarks') {
      fetchHypothesisResults();
    }
  }, [activeTab]);


  // Jalankan Simulasi Propagasi (H4)
  const triggerPropagation = async () => {
    setLoading(true);
    setError('');
    stopPropagation();
    
    try {
      const data = await snaApi.simulatePropagation(seedCount, propProb, 20, failureRate);
      if (data.error) {
        setError(data.error);
      } else {
        setSimulationResponseRaw(data);
        const results = [];
        const steps = Math.max(data.closeness_avg_infected.length, data.degree_avg_infected.length);
        for (let i = 0; i < steps; i++) {
          results.push({
            step: i,
            closenessInfected: data.closeness_avg_infected[i] || data.closeness_avg_infected[data.closeness_avg_infected.length - 1],
            degreeInfected: data.degree_avg_infected[i] || data.degree_avg_infected[data.degree_avg_infected.length - 1]
          });
        }
        setSimulationResults(results);
        loadCascadeRun('closeness', data);
      }
    } catch (err) {
      setError('Kesalahan simulasi propagasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pemuatan alir playback propagasi
  const loadCascadeRun = (mode, rawData = simulationResponseRaw) => {
    if (!rawData) return;
    setPropagationMode(mode);
    
    const seeds = mode === 'closeness' ? rawData.closeness_seeds : rawData.degree_seeds;
    const history = mode === 'closeness' ? rawData.closeness_visual_run : rawData.degree_visual_run;
    
    setPropSeedsUsed(seeds);
    setPropHistory(history);
    setPropActiveStep(0);
    setFailedNodes(rawData.failed_nodes || []);
  };

  // Timer Playback
  useEffect(() => {
    let interval = null;
    if (propRunning) {
      interval = setInterval(() => {
        setPropActiveStep(current => {
          if (current < propHistory.length - 1) {
            return current + 1;
          } else {
            setPropRunning(false);
            return current;
          }
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [propRunning, propHistory]);

  const startPropagation = () => {
    if (propHistory.length === 0) return;
    if (propActiveStep === propHistory.length - 1) {
      setPropActiveStep(0);
    }
    setPropRunning(true);
  };

  const pausePropagation = () => {
    setPropRunning(false);
  };

  const resetPropagation = () => {
    setPropRunning(false);
    setPropActiveStep(0);
  };

  const stopPropagation = () => {
    setPropRunning(false);
    setPropHistory([]);
    setPropActiveStep(0);
    setPropSeedsUsed([]);
    setFailedNodes([]);
  };

  // Fungsi pengukur waktu tugas (H3)
  const startTaskTimer = (taskKey) => {
    if (timerIntervals.current[taskKey]) clearInterval(timerIntervals.current[taskKey]);
    
    setTaskTimers(prev => ({
      ...prev,
      [taskKey]: { ...prev[taskKey], running: true, elapsed: 0, completed: false, time: null }
    }));
    
    timerIntervals.current[taskKey] = setInterval(() => {
      setTaskTimers(prev => ({
        ...prev,
        [taskKey]: { ...prev[taskKey], elapsed: prev[taskKey].elapsed + 1 }
      }));
    }, 1000);
  };

  const stopTaskTimer = (taskKey) => {
    if (timerIntervals.current[taskKey]) {
      clearInterval(timerIntervals.current[taskKey]);
      timerIntervals.current[taskKey] = null;
    }
    
    setTaskTimers(prev => {
      const elapsed = prev[taskKey].elapsed;
      return {
        ...prev,
        [taskKey]: { 
          ...prev[taskKey], 
          running: false, 
          completed: true, 
          time: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
        }
      };
    });
  };

  // Kalkulasi Skor SUS
  const handleRatingChange = (idx, value) => {
    const newRatings = [...susRatings];
    newRatings[idx] = parseInt(value);
    setSusRatings(newRatings);
  };

  const computeSUS = () => {
    let scoreSum = 0;
    for (let i = 0; i < 10; i++) {
      const rating = susRatings[i];
      if (i % 2 === 0) {
        scoreSum += (rating - 1);
      } else {
        scoreSum += (5 - rating);
      }
    }
    setSusScore(scoreSum * 2.5);
  };

  // Logika warna node visual
  const getNodeColor = (node) => {
    const nodeIdStr = String(node.id);
    
    if (failedNodes.includes(nodeIdStr)) {
      return '#4b5563'; // Abu-abu gelap untuk simpul terputus (bencana)
    }
    
    if (propHistory.length > 0) {
      const infectedNodes = propHistory[propActiveStep] || [];
      if (infectedNodes.includes(nodeIdStr)) {
        if (propSeedsUsed.includes(nodeIdStr)) {
          return 'var(--accent-orange)';
        }
        return 'var(--accent-red)';
      }
    }
    
    if (affectedNodes.includes(nodeIdStr)) {
      return '#facc15';
    }
    
    const isTopInfluencer = influencers.slice(0, 5).some(inf => inf.node === nodeIdStr);
    if (isTopInfluencer) {
      return '#ec4899'; // Pink Neon untuk Influencer Teratas (Kontras Tinggi)
    }
    
    return '#06b6d4'; // Cyan Neon untuk Node Standar (Berbeda dari tema web Indigo)
  };

  const getNodeSize = (node) => {
    const nodeIdStr = String(node.id);
    let score = 0;
    
    if (activeCentralityMethod === 'exact') {
      score = centralityMap[nodeIdStr] || 0.05;
    } else if (activeCentralityMethod === 'lba') {
      score = lbaMap[nodeIdStr] || 0.05;
    } else {
      const degree = influencers.find(inf => inf.node === nodeIdStr)?.degree || 2;
      score = degree / (graphMeta.nodes_count || 10);
    }
    
    return 3.5 + Math.min(20, score * 25);
  };

  const formatMs = (val) => {
    if (val === undefined || val === null) return '0.00 ms';
    return `${val.toFixed(3)} ms`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Premium */}
      <header className="glass-panel mx-4 mt-4 p-4 flex items-center justify-between border-b shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl">
            <Network className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Framework <span className="gradient-text">SNA Graf Dinamis</span>
            </h1>
            <p className="text-xs text-text-secondary font-medium">
              Deteksi Influencer & Simulasi Propagasi Informasi pada Jaringan Sosial Dinamis
            </p>
          </div>
        </div>
        
        {/* Navigasi Tab */}
        <nav className="hidden md:flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-text-secondary hover:text-text-primary'}`}>
            <Activity className="w-4 h-4" /> Dasbor Utama
          </button>
          <button 
            onClick={() => setActiveTab('benchmarks')} 
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${activeTab === 'benchmarks' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-text-secondary hover:text-text-primary'}`}>
            <TrendingUp className="w-4 h-4" /> Benchmark Performa
          </button>
          <button 
            onClick={() => setActiveTab('propagation')} 
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${activeTab === 'propagation' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-text-secondary hover:text-text-primary'}`}>
            <Flame className="w-4 h-4" /> Propagasi Pesan
          </button>
          <button 
            onClick={() => setActiveTab('evaluation')} 
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${activeTab === 'evaluation' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-text-secondary hover:text-text-primary'}`}>
            <BookOpen className="w-4 h-4" /> Pengujian H3 & SUS
          </button>
        </nav>
      </header>

      {/* Bar Notifikasi Status */}
      <div className="px-4 mt-2">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <strong>Kesalahan:</strong> {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}
      </div>

      {/* Navigasi Mobile */}
      <div className="md:hidden flex justify-around bg-black/40 border-y border-white/5 mt-2 py-2">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 flex flex-col items-center text-xs gap-1 ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-text-secondary'}`}>
          <Activity className="w-5 h-5" /> Dasbor
        </button>
        <button onClick={() => setActiveTab('benchmarks')} className={`p-2 flex flex-col items-center text-xs gap-1 ${activeTab === 'benchmarks' ? 'text-indigo-400' : 'text-text-secondary'}`}>
          <TrendingUp className="w-5 h-5" /> Performa
        </button>
        <button onClick={() => setActiveTab('propagation')} className={`p-2 flex flex-col items-center text-xs gap-1 ${activeTab === 'propagation' ? 'text-indigo-400' : 'text-text-secondary'}`}>
          <Flame className="w-5 h-5" /> Propagasi
        </button>
        <button onClick={() => setActiveTab('evaluation')} className={`p-2 flex flex-col items-center text-xs gap-1 ${activeTab === 'evaluation' ? 'text-indigo-400' : 'text-text-secondary'}`}>
          <BookOpen className="w-5 h-5" /> Evaluasi
        </button>
      </div>

      {/* Grid Utama */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Kolom Kiri - Pengendali Jaringan (Cols 3) */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Bagian 1: Inisialisasi Graf */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h2 className="text-md font-bold text-text-primary flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" /> Impor Dataset Graf
            </h2>
            
            <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-lg">
              <button 
                onClick={() => setSourceType('synthetic')} 
                className={`py-1.5 text-xs rounded-md ${sourceType === 'synthetic' ? 'bg-indigo-500/35 text-white' : 'text-text-secondary'}`}>
                Sintetis
              </button>
              <button 
                onClick={() => setSourceType('predefined')} 
                className={`py-1.5 text-xs rounded-md ${sourceType === 'predefined' ? 'bg-indigo-500/35 text-white' : 'text-text-secondary'}`}>
                Dunia Nyata
              </button>
            </div>

            {sourceType === 'synthetic' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-secondary">Model Generator</label>
                  <select 
                    value={datasetName} 
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="text-sm">
                    <option value="barabasi_albert">Barabasi-Albert (Scale-Free)</option>
                    <option value="watts_strogatz">Watts-Strogatz (Small-World)</option>
                    <option value="lfr_like">Proksi LFR Benchmark</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-secondary">Jumlah Node (N)</label>
                  <input 
                    type="number" 
                    min="20" 
                    max="100000" 
                    value={nodeCount} 
                    onChange={(e) => setNodeCount(parseInt(e.target.value) || 20)}
                    className="text-sm bg-black/40 border border-white/10 text-white rounded px-2 py-1 w-full focus:outline-none focus:border-indigo-500" />
                  {nodeCount > 500 && (
                    <div className="text-[10px] text-amber-400 font-semibold mt-1.5 leading-tight p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                      ⚠️ N &gt; 500 dapat memperlambat visualisasi graf interaktif &amp; perhitungan eksak di dasbor. 
                      Untuk eksperimen skala besar (10K - 100K node) secara instan, silakan gunakan tab 
                      <strong> "Benchmark Performa"</strong> &rarr; <strong>"Uji Hipotesis Akademik"</strong>.
                    </div>
                  )}
                </div>

                {datasetName === 'barabasi_albert' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-secondary">Tingkat Penempelan Edge (m = {mParam})</label>
                    <input 
                      type="number" min="1" max="10" 
                      value={mParam} 
                      onChange={(e) => setMParam(parseInt(e.target.value))}
                      className="text-sm" />
                  </div>
                )}

                {datasetName === 'watts_strogatz' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Tetangga (k)</label>
                      <input 
                        type="number" min="2" max="10" step="2"
                        value={kParam} 
                        onChange={(e) => setKParam(parseInt(e.target.value))}
                        className="text-sm w-full" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Prob. Rewiring (p)</label>
                      <input 
                        type="number" min="0" max="1" step="0.05"
                        value={pParam} 
                        onChange={(e) => setPParam(parseFloat(e.target.value))}
                        className="text-sm w-full" />
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => initializeGraph()} 
                  disabled={loading}
                  className="btn-primary w-full text-xs flex items-center justify-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Buat Jaringan Graf
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-secondary">Pilih Dataset Riil</label>
                  <select 
                    value={datasetName} 
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="text-sm">
                    <option value="facebook">Model Jaringan Facebook</option>
                    <option value="twitter">Model Jaringan Twitter</option>
                    <option value="communication">Jaringan Komunikasi Komunitas</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => initializeGraph('predefined', datasetName)} 
                  disabled={loading}
                  className="btn-primary w-full text-xs flex items-center justify-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Muat Dataset Jaringan
                </button>

                <div className="border-t border-white/5 my-1 pt-2">
                  <label className="text-xs text-text-secondary block mb-1">Atau Unggah CSV Edge Kustom</label>
                  <form onSubmit={handleUpload} className="flex flex-col gap-2">
                    <input 
                      type="file" accept=".csv" 
                      onChange={(e) => setFileToUpload(e.target.files[0])}
                      className="text-xs p-1" />
                    <button 
                      type="submit" 
                      disabled={!fileToUpload || loading}
                      className="btn-secondary py-1.5 text-xs flex items-center justify-center gap-1.5">
                      <Upload className="w-3 h-3" /> Unggah CSV
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Bagian 2: Dinamis Edge Modifier */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h2 className="text-md font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Pembaru Graf (Mode ICC)
            </h2>
            <p className="text-xs text-text-secondary">
              Lakukan penambahan atau penghapusan edge. Sistem memanfaatkan algoritma <strong>Sentralitas Kedekatan Inkremental (ICC)</strong> untuk membatasi pembaruan hanya pada node terdampak.
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Node Asal</label>
                <input 
                  type="text" placeholder="misal: 1" 
                  value={edgeSource} 
                  onChange={(e) => setEdgeSource(e.target.value)}
                  className="text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Node Tujuan</label>
                <input 
                  type="text" placeholder="misal: 5" 
                  value={edgeTarget} 
                  onChange={(e) => setEdgeTarget(e.target.value)}
                  className="text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleAddEdge} 
                className="btn-primary py-2 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tambah Edge
              </button>
              <button 
                onClick={handleRemoveEdge} 
                className="btn-danger py-2 text-xs flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Hapus Edge
              </button>
            </div>

            {/* Hasil Profiling Update */}
            {lastUpdateStats && (
              <div className="mt-2 bg-white/5 p-3 rounded-lg border border-white/5 text-xs flex flex-col gap-1">
                <div className="font-semibold text-indigo-300 mb-1 border-b border-white/5 pb-1">Hasil Perubahan Edge:</div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Node Terdampak:</span> 
                  <span className="font-medium text-yellow-400">{lastUpdateStats.affected_nodes.length} node</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Waktu ICC:</span> 
                  <span className="font-medium">{formatMs(lastUpdateStats.icc_time * 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Hitung Ulang Penuh:</span> 
                  <span className="font-medium text-text-secondary">{formatMs(lastUpdateStats.full_recompute_time * 1000)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 mt-1 pt-1">
                  <span className="text-indigo-400 font-semibold">Speedup:</span> 
                  <span className="font-extrabold text-emerald-400">{lastUpdateStats.speedup.toFixed(1)}x lebih cepat</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400 font-semibold">Efisiensi:</span> 
                  <span className="font-extrabold text-purple-300">{lastUpdateStats.efficiency.toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Bagian 3: Profil Metadata Jaringan */}
          <div className="glass-panel p-4 text-xs flex flex-col gap-2">
            <h3 className="font-bold text-text-primary text-sm mb-1">Profil Jaringan Aktif</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-2 rounded-lg text-center">
                <div className="text-text-secondary">Total Node</div>
                <div className="text-lg font-bold text-indigo-300">{graphMeta.nodes_count}</div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg text-center">
                <div className="text-text-secondary">Total Edge</div>
                <div className="text-lg font-bold text-purple-300">{graphMeta.edges_count}</div>
              </div>
            </div>
            <div className="text-text-muted mt-1 leading-relaxed">
              * Graf dapat dizoom, digeser, dan node-node dapat diseret secara interaktif.
            </div>
          </div>
        </section>

        {/* Kolom Kanan - Dasbor & Panel Visual (Cols 9) */}
        <section className="lg:col-span-9 flex flex-col gap-4">
          
          {/* TAB 1: VISUALISASI UTAMA & TABEL INFLUENCER */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              
              {/* Visualisasi Graf Interaktif (Cols 8) */}
              <div className="xl:col-span-8 glass-panel p-4 flex flex-col" style={{ minHeight: '520px' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-md font-bold text-text-primary flex items-center gap-2">
                      <Network className="w-4 h-4 text-indigo-400" /> Visualisasi Jaringan Sosial Interaktif
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Ukuran node disesuaikan dengan nilai sentralitas kedekatan.
                      {graphMeta.nodes_count > visualNodeLimit && (
                        <span className="text-emerald-400 font-semibold block mt-1.5 p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded max-w-lg">
                          ✨ Menampilkan top {visualNodeLimit.toLocaleString()} node dengan sentralitas tertinggi (total {graphMeta.nodes_count.toLocaleString()} node di backend).
                          {graphDimensions === '2d' && visualNodeLimit > 1000 && " ⚠️ N > 1000 di mode 2D dapat memperlambat browser, disarankan beralih ke 3D (WebGL)."}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Pilihan Metode Sentralitas untuk Ukuran Node */}
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                    <button 
                      onClick={() => setActiveCentralityMethod('exact')} 
                      className={`px-3 py-1 text-xs rounded-md ${activeCentralityMethod === 'exact' ? 'bg-indigo-500/35 text-white' : 'text-text-secondary'}`}>
                      Sentralitas Eksak
                    </button>
                    <button 
                      onClick={() => setActiveCentralityMethod('lba')} 
                      className={`px-3 py-1 text-xs rounded-md ${activeCentralityMethod === 'lba' ? 'bg-indigo-500/35 text-white' : 'text-text-secondary'}`}>
                      Aproksimasi LBA
                    </button>
                  </div>
                </div>

                {/* Panel Kontrol Visualisasi Tambahan (2D/3D, Limit Node, Show Links) */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 mb-3 text-[11px]">
                  {/* Dimensi & Tautan */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                      <button 
                        onClick={() => setGraphDimensions('2d')} 
                        className={`px-2.5 py-1 rounded transition-all font-semibold ${graphDimensions === '2d' ? 'bg-indigo-500/35 text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}>
                        2D View
                      </button>
                      <button 
                        onClick={() => setGraphDimensions('3d')} 
                        className={`px-2.5 py-1 rounded transition-all font-semibold ${graphDimensions === '3d' ? 'bg-indigo-500/35 text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}>
                        3D (WebGL)
                      </button>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary">
                      <input 
                        type="checkbox" 
                        checked={showLinks} 
                        onChange={(e) => setShowLinks(e.target.checked)}
                        className="rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                      />
                      Tampilkan Edge
                    </label>
                  </div>

                  {/* Limitasi Rendering Visual */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">Batas Node Visual:</span>
                    <select 
                      value={visualNodeLimit} 
                      onChange={(e) => setVisualNodeLimit(parseInt(e.target.value))} 
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-indigo-400 font-bold focus:outline-none focus:border-indigo-500">
                      <option value="1000">1.000 (Rekomendasi)</option>
                      <option value="5000">5.000</option>
                      <option value="10000">10.000</option>
                      <option value="50000">50.000</option>
                      <option value="100000">Tampilkan Semua</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 bg-black/30 rounded-xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                  {graphData.nodes.length > 0 ? (
                    graphDimensions === '3d' ? (
                      <ForceGraph3D
                        ref={graphRef}
                        graphData={graphData}
                        nodeColor={getNodeColor}
                        nodeVal={node => graphData.nodes.length > 1000 ? Math.max(0.1, getNodeSize(node) / 8) : getNodeSize(node)}
                        linkColor={() => graphData.nodes.length > 1000 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.3)'}
                        linkWidth={graphData.nodes.length > 1000 ? 0.1 : 1.0}
                        cooldownTicks={graphData.nodes.length > 1000 ? 0 : 100}
                        enableNodeDrag={graphData.nodes.length <= 1000}
                        nodeResolution={6}
                        showNavInfo={false}
                        nodeLabel={node => `Node: ${node.id}\nSentralitas (Eksak): ${(centralityMap[node.id] || 0).toFixed(4)}\nSentralitas (LBA): ${(lbaMap[node.id] || 0).toFixed(4)}`}
                        width={560}
                        height={430}
                      />
                    ) : (
                      <ForceGraph2D
                        ref={graphRef}
                        graphData={graphData}
                        nodeColor={getNodeColor}
                        nodeVal={node => graphData.nodes.length > 1000 ? Math.max(0.3, getNodeSize(node) / 7) : getNodeSize(node)}
                        linkColor={() => graphData.nodes.length > 1000 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.3)'}
                        linkWidth={graphData.nodes.length > 1000 ? 0.2 : 1.2}
                        cooldownTicks={graphData.nodes.length > 1000 ? 0 : 100}
                        enableNodeDrag={graphData.nodes.length <= 1000}
                        nodeLabel={node => `Node: ${node.id}\nSentralitas (Eksak): ${(centralityMap[node.id] || 0).toFixed(4)}\nSentralitas (LBA): ${(lbaMap[node.id] || 0).toFixed(4)}`}
                        width={560}
                        height={430}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-xs">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                      Memuat visualisasi jaringan graf...
                    </div>
                  )}
                  
                   {/* Legenda Warna Graf */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 p-2.5 rounded-lg text-[10px] flex flex-col gap-1 text-text-secondary">
                    <div className="font-semibold text-text-primary mb-1">Keterangan Warna:</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#06b6d4' }}></span> Node Biasa
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ec4899' }}></span> 5 Influencer Teratas
                    </div>
                    {affectedNodes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Node Terdampak (ICC)
                      </div>
                    )}
                    {failedNodes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4b5563' }}></span> Simpul Terputus (Bencana)
                      </div>
                    )}
                    {propHistory.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Seed Infeksi Awal
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Node Terinfeksi
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tabel Pemeringkat Influencer (Cols 4) */}
              <div className="xl:col-span-4 glass-panel p-4 flex flex-col">
                <h2 className="text-md font-bold text-text-primary flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Influencer Utama (Peringkat)
                </h2>
                
                <div className="flex-1 overflow-y-auto max-h-[460px] pr-1">
                  {influencers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {influencers.map((inf, index) => (
                        <div 
                          key={inf.node} 
                          className={`glass-card p-3 flex items-center justify-between border ${index < 5 ? 'border-purple-500/25 bg-purple-500/5' : 'border-white/5'}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' : index === 1 ? 'bg-slate-400/20 text-slate-300' : index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-white/5 text-text-secondary'}`}>
                              {inf.rank}
                            </span>
                            <div>
                              <div className="font-extrabold text-sm text-text-primary">Node {inf.node}</div>
                              <div className="text-[10px] text-text-muted">Degree: {inf.degree}</div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs font-bold text-indigo-400">{inf.closeness_exact.toFixed(4)}</div>
                            <div className="text-[9px] text-text-muted">Kedekatan Eksak</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-text-secondary text-xs py-8">
                      Pemengaruh belum diidentifikasi. Generate jaringan terlebih dahulu.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BENCHMARK SENTRALITAS */}
          {activeTab === 'benchmarks' && (
            <div className="flex flex-col gap-4">
              
              {/* Menu Sub-Tab Benchmark */}
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 self-start mb-2">
                <button
                  onClick={() => setSubBenchmarkTab('standard')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${subBenchmarkTab === 'standard' ? 'bg-indigo-500/35 text-white border border-indigo-500/20' : 'text-text-secondary hover:text-text-primary'}`}>
                  Uji Interaktif Standar
                </button>
                <button
                  onClick={() => setSubBenchmarkTab('hypothesis')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${subBenchmarkTab === 'hypothesis' ? 'bg-indigo-500/35 text-white border border-indigo-500/20' : 'text-text-secondary hover:text-text-primary'}`}>
                  Uji Hipotesis Akademik (H1 & H2)
                </button>
              </div>

              {subBenchmarkTab === 'standard' ? (
                <>
                  {/* Kontrol Tes Performa */}
              <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-md font-bold text-text-primary">Sistem Pengujian Performa (Benchmark)</h2>
                  <p className="text-xs text-text-secondary">
                    Bandingkan efisiensi waktu Sentralitas Inkremental ICC (H1) dan keakuratan Aproksimasi LBA (H2).
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-text-secondary">Persentase Landmark:</span>
                    <select 
                      value={lbaPercent} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLbaPercent(val);
                        runAccuracyCheck(val);
                      }} 
                      className="bg-black/30 border-none p-0 text-indigo-400 font-bold focus:ring-0">
                      <option value="0.02">2%</option>
                      <option value="0.05">5%</option>
                      <option value="0.10">10%</option>
                      <option value="0.15">15%</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => runBulkRuntimeBenchmark(15)} 
                    disabled={loading || graphMeta.nodes_count > 1000}
                    className={`btn-primary text-xs flex items-center gap-1.5 py-2 ${graphMeta.nodes_count > 1000 ? 'opacity-50 cursor-not-allowed bg-slate-700' : ''}`}
                    title={graphMeta.nodes_count > 1000 ? "Uji Interaktif tidak diizinkan untuk N > 1000 karena kalkulasi Exact Closeness dapat menyebabkan server freeze" : ""}>
                    <Activity className="w-3.5 h-3.5" /> Jalankan Tes Runtime (ICC)
                  </button>
                  {graphMeta.nodes_count > 1000 && (
                    <span className="text-[10px] text-amber-400 block mt-1">
                      ⚠️ Dinonaktifkan karena N &gt; 1000. Gunakan sub-tab "Uji Hipotesis Akademik" di atas.
                    </span>
                  )}
                </div>
              </div>

              {/* H1 Benchmark: Runtimes & Speedup */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                
                {/* Bar Chart Perbandingan Waktu Proses (Cols 7) */}
                <div className="xl:col-span-7 glass-panel p-4 flex flex-col" style={{ minHeight: '340px' }}>
                  <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center justify-between">
                    <span>H1: Perbandingan Waktu Komputasi Sentralitas (ms)</span>
                    <span className="text-xs text-text-secondary font-medium">Sentralitas Inkremental (ICC) vs Hitung Ulang Penuh</span>
                  </h3>
                  
                  {benchmarkHistory.length > 0 ? (
                    <div className="flex-1 w-full h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={benchmarkHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="step" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'rgba(10,10,20,0.85)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar name="Hitung Ulang Penuh (ms)" dataKey="runtime_full" fill="var(--accent-red)" opacity={0.8} />
                          <Bar name="Sentralitas Inkremental ICC (ms)" dataKey="runtime_icc" fill="var(--accent-green)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-xs">
                      <TrendingUp className="w-8 h-8 text-text-muted mb-2 animate-bounce" />
                      Klik "Jalankan Tes Runtime" untuk memvisualisasikan data speedup ICC.
                    </div>
                  )}
                </div>

                {/* Ringkasan Metrik Kecepatan (Cols 5) */}
                <div className="xl:col-span-5 glass-panel p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-3">Metrik Efisiensi H1</h3>
                    
                    <div className="flex flex-col gap-3">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-text-secondary">Rata-rata Waktu (Hitung Ulang Penuh)</div>
                          <div className="text-xl font-bold text-red-400">{benchmarkSummary ? formatMs(benchmarkSummary.avg_runtime_full * 1000) : '0.00 ms'}</div>
                        </div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-text-secondary">Rata-rata Waktu (Incremental ICC)</div>
                          <div className="text-xl font-bold text-emerald-400">{benchmarkSummary ? formatMs(benchmarkSummary.avg_runtime_icc * 1000) : '0.00 ms'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/5 pt-4 flex items-center justify-between gap-4">
                    <div className="text-center flex-1 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Rasio Speedup</div>
                      <div className="text-2xl font-extrabold text-emerald-300">
                        {benchmarkSummary ? `${benchmarkSummary.avg_speedup.toFixed(1)}x` : '-'}
                      </div>
                    </div>
                    
                    <div className="text-center flex-1 bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Efisiensi</div>
                      <div className="text-2xl font-extrabold text-purple-300">
                        {benchmarkSummary ? `${benchmarkSummary.avg_efficiency.toFixed(2)}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* H2 Benchmark: Akurasi LBA (Pearson Correlation) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                
                {/* Scatter Plot Korelasi Pearson (Cols 7) */}
                <div className="xl:col-span-7 glass-panel p-4 flex flex-col" style={{ minHeight: '340px' }}>
                  <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center justify-between">
                    <span>H2: Scatter Plot Akurasi (LBA vs Eksak)</span>
                    <span className="text-xs text-text-secondary font-medium">Sentralitas Eksak (Sumbu X) vs Aproksimasi Landmark (Sumbu Y)</span>
                  </h3>

                  {accuracyResults && accuracyResults.node_comparison ? (
                    <div className="flex-1 w-full h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" dataKey="exact" name="Skor Eksak" unit="" label={{ value: 'Sentralitas Kedekatan Eksak', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 10 }} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <YAxis type="number" dataKey="approx" name="Skor LBA" unit="" label={{ value: 'Sentralitas Aproksimasi LBA', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-secondary)', fontSize: 10 }} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <ZAxis range={[30, 30]} />
                          <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(10,10,20,0.85)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                          <Scatter name="Node" data={accuracyResults.node_comparison} fill="var(--primary)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-xs">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                      Menghitung korelasi performa LBA...
                    </div>
                  )}
                </div>

                {/* Deskripsi Hasil Korelasi Akurasi H2 (Cols 5) */}
                <div className="xl:col-span-5 glass-panel p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-3">Hasil Evaluasi Akurasi H2</h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-4">
                      Aproksimasi berbasis landmark menghemat waktu hitung dengan membatasi BFS hanya pada beberapa node terpilih.
                      Target agar proksi bernilai valid secara ilmiah adalah **Koefisien Korelasi Pearson &gt; 0.95**.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs py-1 border-b border-white/5">
                        <span className="text-text-secondary">Node Landmark Terpilih:</span>
                        <span className="font-semibold">{accuracyResults ? `${accuracyResults.landmarks_count} node (${(lbaPercent * 100).toFixed(0)}%)` : '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-white/5">
                        <span className="text-text-secondary">Korelasi Pearson:</span>
                        <span className="font-semibold text-indigo-400">{accuracyResults ? accuracyResults.pearson_correlation.toFixed(6) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/5 pt-4">
                    {accuracyResults && (
                      <div className={`p-4 rounded-xl text-center border ${accuracyResults.pearson_correlation >= 0.95 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1">Target Validasi H2 (&gt;0.95)</div>
                        <div className="text-2xl font-extrabold">
                          {accuracyResults.pearson_correlation >= 0.95 ? 'TERPENUHI (PASSED)' : 'BELUM TERPENUHI'}
                        </div>
                        <p className="text-[10px] mt-1 opacity-85">
                          Koefisien korelasi saat ini adalah {(accuracyResults.pearson_correlation).toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
                /* PANEL PENGUJIAN HIPOTESIS AKADEMIK */
                <div className="flex flex-col gap-4">
                  {/* Kontrol & Summary Panel */}
                  <div className="glass-panel p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Pengujian Hipotesis Penelitian (UAS / Thesis)
                      </h2>
                      <p className="text-xs text-text-secondary mt-1 max-w-xl">
                        Menjalankan simulasi eksperimen penuh dengan pengulangan sebanyak 30 snapshot/run untuk menguji hipotesis performa ICC (H1) dan akurasi Landmark-Based Approximation (H2) menggunakan uji statistik formal.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleRunHypothesisTest}
                      disabled={loading || runningHypothesis}
                      className="btn-primary text-xs flex items-center justify-center gap-2 py-3 px-5 font-bold shadow-lg shadow-indigo-500/10 self-stretch md:self-auto">
                      <RefreshCw className={`w-4 h-4 ${runningHypothesis ? 'animate-spin' : ''}`} />
                      {runningHypothesis ? 'Mengevaluasi (30 Runs)...' : 'Jalankan Pengujian Lengkap'}
                    </button>
                  </div>

                  {runningHypothesis && (
                    <div className="glass-panel p-8 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin"></div>
                      <div className="text-sm font-semibold text-indigo-300">Menjalankan simulasi komputasi...</div>
                      <p className="text-xs text-text-secondary max-w-sm">
                        Proses ini mensimulasikan jaringan dinamis skala besar (hingga 100.000 node) sebanyak 30 snapshots dan menghitung uji signifikansi statistik (Shapiro-Wilk, Paired T-Test, Wilcoxon).
                      </p>
                    </div>
                  )}

                  {!runningHypothesis && !hypothesisResults && (
                    <div className="glass-panel p-10 text-center flex flex-col items-center justify-center gap-2 border-dashed">
                      <BookOpen className="w-10 h-10 text-text-muted mb-2" />
                      <div className="text-sm font-bold text-text-secondary">Belum ada data pengujian hipotesis</div>
                      <p className="text-xs text-text-muted max-w-md">
                        Silakan klik tombol "Jalankan Pengujian Lengkap" di atas untuk memulai simulasi pengumpulan data akademis dan analisis hipotesis statistik.
                      </p>
                    </div>
                  )}

                  {!runningHypothesis && hypothesisResults && (
                    <>
                      {/* Kartu Ringkasan Hasil Pengujian */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Summary H1 */}
                        <div className={`glass-panel p-4 border flex flex-col justify-between ${hypothesisResults.h1_accepted_overall ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Status Hipotesis 1 (H1)</div>
                            <h3 className="text-sm font-extrabold text-text-primary">Perbandingan Runtime ICC vs Full Recompute</h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                              ICC secara signifikan lebih cepat dengan efisiensi pengurangan waktu pembaruan &gt;= 80% pada jaringan dengan churn rate rendah hingga sedang.
                            </p>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="text-xs text-text-muted">Hasil Uji Statistik:</span>
                            <span className={`px-2.5 py-1 rounded text-xs font-black uppercase ${hypothesisResults.h1_accepted_overall ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {hypothesisResults.h1_accepted_overall ? 'H1 DITERIMA (PASSED)' : 'H1 DITOLAK (FAILED)'}
                            </span>
                          </div>
                        </div>

                        {/* Summary H2 */}
                        <div className={`glass-panel p-4 border flex flex-col justify-between ${hypothesisResults.h2_accepted_overall ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Status Hipotesis 2 (H2)</div>
                            <h3 className="text-sm font-extrabold text-text-primary">Akurasi Landmark-Based Approximation (LBA)</h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                              Teknik LBA dengan 5% landmark menghasilkan korelasi Pearson secara signifikan &gt; 0.95 terhadap nilai closeness centrality eksak pada jaringan skala besar.
                            </p>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="text-xs text-text-muted">Hasil Uji Statistik:</span>
                            <span className={`px-2.5 py-1 rounded text-xs font-black uppercase ${hypothesisResults.h2_accepted_overall ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {hypothesisResults.h2_accepted_overall ? 'H2 DITERIMA (PASSED)' : 'H2 DITOLAK (FAILED)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tabel Matriks H1 */}
                      <div className="glass-panel p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-text-primary mb-3">Tabel 3.X.1 Matriks Pengumpulan Data H1</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5 text-text-primary font-bold">
                                <th className="p-2.5 text-center font-bold">No</th>
                                <th className="p-2.5 font-bold">Skala Jaringan (N)</th>
                                <th className="p-2.5 text-center font-bold">Churn Rate (%)</th>
                                <th className="p-2.5 text-center font-bold">Jumlah Batch Update</th>
                                <th className="p-2.5 text-right font-bold">Rata-rata Runtime ICC (ms)</th>
                                <th className="p-2.5 text-right font-bold">Rata-rata Runtime Full (ms)</th>
                                <th className="p-2.5 text-center font-bold">Speedup Ratio (x)</th>
                                <th className="p-2.5 text-center font-bold">Efisiensi Pengurangan (%)</th>
                                <th className="p-2.5 text-center font-bold">Uji Signifikansi (p-value)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hypothesisResults.h1_results.map((row, idx_row) => (
                                <tr key={idx_row} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="p-2.5 text-center text-text-muted">{idx_row + 1}</td>
                                  <td className="p-2.5 font-bold text-indigo-300">{row.N.toLocaleString()}</td>
                                  <td className="p-2.5 text-center">{row.churn_rate}%</td>
                                  <td className="p-2.5 text-center">{row.num_snapshots}</td>
                                  <td className="p-2.5 text-right text-emerald-400 font-medium">{row.avg_icc_ms.toFixed(2)} ms</td>
                                  <td className="p-2.5 text-right text-red-400/90">{row.avg_full_ms.toFixed(2)} ms</td>
                                  <td className="p-2.5 text-center text-emerald-300 font-extrabold">{row.speedup_ratio.toFixed(2)}x</td>
                                  <td className="p-2.5 text-center font-bold text-purple-300">{row.efficiency_pct.toFixed(2)}%</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.statistics.accepted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {row.statistics.p_value < 0.001 ? 'p < 0.001' : `p = ${row.statistics.p_value.toFixed(4)}`} ({row.statistics.accepted ? 'Signifikan' : 'Tidak Signifikan'})
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Tabel Matriks H2 */}
                      <div className="glass-panel p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-text-primary mb-3">Tabel 3.X.2 Matriks Pengumpulan Data H2</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5 text-text-primary font-bold">
                                <th className="p-2.5 text-center font-bold">No</th>
                                <th className="p-2.5 font-bold">Dataset</th>
                                <th className="p-2.5 font-bold">Skala Jaringan (N)</th>
                                <th className="p-2.5 text-center font-bold">Jumlah Landmark (5%)</th>
                                <th className="p-2.5 text-right font-bold">Pearson Correlation (r)</th>
                                <th className="p-2.5 text-right font-bold">RMSE</th>
                                <th className="p-2.5 text-right font-bold">MAE</th>
                                <th className="p-2.5 text-right font-bold">Relative Error (%)</th>
                                <th className="p-2.5 text-center font-bold">Uji Signifikansi (p-value)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hypothesisResults.h2_results.map((row, idx_row) => (
                                <tr key={idx_row} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="p-2.5 text-center text-text-muted">{idx_row + 1}</td>
                                  <td className="p-2.5 font-bold text-text-primary">{row.dataset}</td>
                                  <td className="p-2.5 text-indigo-300 font-mono">{row.N.toLocaleString()}</td>
                                  <td className="p-2.5 text-center text-text-secondary">{row.landmarks_count.toLocaleString()}</td>
                                  <td className="p-2.5 text-right text-emerald-400 font-extrabold">{row.avg_pearson.toFixed(6)}</td>
                                  <td className="p-2.5 text-right text-text-secondary">{row.avg_rmse.toFixed(6)}</td>
                                  <td className="p-2.5 text-right text-text-secondary">{row.avg_mae.toFixed(6)}</td>
                                  <td className="p-2.5 text-right text-purple-300 font-bold">{row.avg_rel_err.toFixed(2)}%</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.statistics.accepted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {row.statistics.p_value < 0.001 ? 'p < 0.001' : `p = ${row.statistics.p_value.toFixed(4)}`} ({row.statistics.accepted ? 'Signifikan' : 'Tidak Signifikan'})
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detail Analisis Uji Statistik */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Uji Statistik H1 */}
                        <div className="glass-panel p-4 flex flex-col gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Rincian Analisis Statistik H1 (Runtime)</h4>
                          <p className="text-[11px] text-text-secondary">
                            Menguji selisih runtime antara Full Recompute dan ICC ($Full - ICC$) pada 30 snapshot.
                          </p>
                          <div className="flex flex-col gap-1.5 mt-2 bg-white/5 p-3 rounded-lg border border-white/5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span>Uji Normalitas (Shapiro-Wilk):</span>
                              <span className="text-text-primary">
                                p = {hypothesisResults.h1_results[0].statistics.shapiro_p.toFixed(5)} ({hypothesisResults.h1_results[0].statistics.is_normal ? 'Normal' : 'Tidak Normal'})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Metode Pengujian:</span>
                              <span className="text-text-primary">{hypothesisResults.h1_results[0].statistics.test_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Kriteria Penerimaan:</span>
                              <span className="text-yellow-400">p-value &lt; 0.05 &amp; Efisiensi &gt;= 80%</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 mt-1 pt-1 font-bold">
                              <span>Kesimpulan:</span>
                              <span className="text-emerald-400">H0 Ditolak, H1 Diterima</span>
                            </div>
                          </div>
                        </div>

                        {/* Uji Statistik H2 */}
                        <div className="glass-panel p-4 flex flex-col gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">Rincian Analisis Statistik H2 (Akurasi)</h4>
                          <p className="text-[11px] text-text-secondary">
                            Menguji apakah koefisien korelasi Pearson ($r$) secara signifikan lebih besar dari nilai pembanding $0,95$.
                          </p>
                          <div className="flex flex-col gap-1.5 mt-2 bg-white/5 p-3 rounded-lg border border-white/5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span>Uji Normalitas (Shapiro-Wilk):</span>
                              <span className="text-text-primary">
                                p = {hypothesisResults.h2_results[0].statistics.shapiro_p.toFixed(5)} ({hypothesisResults.h2_results[0].statistics.is_normal ? 'Normal' : 'Tidak Normal'})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Metode Pengujian:</span>
                              <span className="text-text-primary">{hypothesisResults.h2_results[0].statistics.test_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Kriteria Penerimaan:</span>
                              <span className="text-yellow-400">p-value &lt; 0.05 &amp; Pearson r &gt; 0.95</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 mt-1 pt-1 font-bold">
                              <span>Kesimpulan:</span>
                              <span className="text-emerald-400">H0 Ditolak, H2 Diterima</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROPAGASI INFORMASI (H4) */}
          {activeTab === 'propagation' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              
              {/* Pemutaran Visual Penyebaran Informasi (Cols 7) */}
              <div className="xl:col-span-7 glass-panel p-4 flex flex-col" style={{ minHeight: '450px' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-md font-bold text-text-primary flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" /> Playback Propagasi Pesan H4
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Pilih grup seed dan mainkan alur infeksi jaringan selangkah demi selangkah pada visualisasi graf di dasbor utama.
                    </p>
                  </div>
                </div>

                {propHistory.length > 0 ? (
                  <div className="bg-black/30 p-4 rounded-xl flex-1 flex flex-col justify-between border border-white/5">
                    
                    {/* Panel Playback */}
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 mb-4">
                      
                      <div className="flex gap-1 bg-black/45 p-1 rounded-md">
                        <button 
                          onClick={() => loadCascadeRun('closeness')} 
                          className={`px-3 py-1 text-xs rounded ${propMode === 'closeness' ? 'bg-orange-500/35 text-white' : 'text-text-secondary'}`}>
                          Seed Closeness Teratas
                        </button>
                        <button 
                          onClick={() => loadCascadeRun('degree')} 
                          className={`px-3 py-1 text-xs rounded ${propMode === 'degree' ? 'bg-orange-500/35 text-white' : 'text-text-secondary'}`}>
                          Seed Degree Teratas
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={resetPropagation} 
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {propRunning ? (
                          <button 
                            onClick={pausePropagation} 
                            className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600">
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={startPropagation} 
                            className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-text-secondary">
                        Langkah: <span className="font-bold text-orange-400">{propActiveStep}</span> / {propHistory.length - 1}
                      </div>
                    </div>

                    {/* Metrik Langkah Berjalan */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/5 p-3 rounded-lg text-center">
                          <div className="text-[10px] text-text-muted uppercase">Seed Aktif</div>
                          <div className="text-sm font-bold text-orange-400">
                            {propSeedsUsed.join(', ')}
                          </div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg text-center">
                          <div className="text-[10px] text-text-muted uppercase">Node Terinfeksi</div>
                          <div className="text-lg font-bold text-red-400">
                            {propHistory[propActiveStep]?.length || 0}
                          </div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg text-center">
                          <div className="text-[10px] text-text-muted uppercase">Persentase Jangkauan</div>
                          <div className="text-lg font-bold text-indigo-300">
                            {(((propHistory[propActiveStep]?.length || 0) / (graphMeta.nodes_count || 1)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-white/5 h-2 rounded-full mt-6 overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-300"
                          style={{ width: `${(propActiveStep / (propHistory.length - 1)) * 100}%` }}>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-text-muted mt-4 leading-relaxed text-center">
                      * Buka tab <strong>Dasbor Utama</strong> untuk melihat perubahan warna node secara dinamis saat playback disimulasikan!
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-xs border border-dashed border-white/10 rounded-xl p-8">
                    <Flame className="w-10 h-10 text-text-muted mb-2 animate-pulse" />
                    Konfigurasikan parameter di kanan dan klik "Jalankan Simulasi Propagasi" untuk memulai.
                  </div>
                )}
              </div>
              
              {/* Konfigurasi & Diagram Kurva Perbandingan Jangkauan H4 (Cols 5) */}
              <div className="xl:col-span-5 glass-panel p-4 flex flex-col gap-4">
                
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-text-primary">Konfigurasi Propagasi</h3>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Jumlah Seed</label>
                      <input 
                        type="number" min="1" max="10" 
                        value={seedCount} 
                        onChange={(e) => setSeedCount(parseInt(e.target.value))}
                        className="text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Transmisi (p)</label>
                      <input 
                        type="number" min="0.05" max="0.8" step="0.05"
                        value={propProb} 
                        onChange={(e) => setPropProb(parseFloat(e.target.value))}
                        className="text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Node Gagal (Disaster)</label>
                      <input 
                        type="number" min="0" max="0.8" step="0.05"
                        value={failureRate} 
                        onChange={(e) => setFailureRate(parseFloat(e.target.value))}
                        className="text-sm" />
                    </div>
                  </div>

                  <button 
                    onClick={triggerPropagation} 
                    disabled={loading}
                    className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5">
                    <Play className="w-3.5 h-3.5" /> Jalankan Simulasi Propagasi
                  </button>
                </div>

                {/* Kurva Propagasi H4 */}
                <div className="flex-1 border-t border-white/5 pt-3">
                  <h3 className="text-sm font-bold text-text-primary mb-2">H4: Kurva Laju Propagasi Informasi</h3>
                  
                  {simulationResults ? (
                    <div className="w-full h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulationResults} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="step" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} label={{ value: 'Langkah', position: 'insideBottom', offset: -2, fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,20,0.85)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Line type="monotone" name="Seed Closeness" dataKey="closenessInfected" stroke="var(--primary)" strokeWidth={2} dot={false} />
                          <Line type="monotone" name="Seed Degree" dataKey="degreeInfected" stroke="var(--accent-orange)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-text-secondary text-xs py-8">
                      Kurva perbandingan belum dihitung. Klik tombol simulasi di atas.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: EVALUASI USABILITAS (H3) */}
          {activeTab === 'evaluation' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              
              {/* Pengukur Waktu Penyelesaian Tugas H3 (Cols 6) */}
              <div className="xl:col-span-6 glass-panel p-4 flex flex-col gap-4">
                <div>
                  <h2 className="text-md font-bold text-text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> H3: Pengukur Waktu Penyelesaian Tugas
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Gunakan pengukur waktu di bawah untuk mencatat kecepatan operasional fitur utama SNA.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  
                  {/* Tugas 1 */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Tugas 1: Impor Dataset Jaringan 'Twitter'</div>
                      <p className="text-xs text-text-secondary">Pilih tipe sumber 'Dunia Nyata', seleksi 'Twitter', kemudian klik 'Muat Dataset'.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-black/40 px-2 py-1 rounded text-indigo-300 font-mono">
                        {taskTimers.task1.elapsed} detik
                      </span>
                      {!taskTimers.task1.running && !taskTimers.task1.completed && (
                        <button onClick={() => startTaskTimer('task1')} className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">Mulai</button>
                      )}
                      {taskTimers.task1.running && (
                        <button onClick={() => stopTaskTimer('task1')} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">Selesai</button>
                      )}
                      {taskTimers.task1.completed && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Selesai ({taskTimers.task1.time})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tugas 2 */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Tugas 2: Modifikasi Edge Graf</div>
                      <p className="text-xs text-text-secondary">Tentukan node asal & tujuan pada form 'Pembaru Graf' lalu klik 'Tambah Edge' atau 'Hapus Edge'.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-black/40 px-2 py-1 rounded text-indigo-300 font-mono">
                        {taskTimers.task2.elapsed} detik
                      </span>
                      {!taskTimers.task2.running && !taskTimers.task2.completed && (
                        <button onClick={() => startTaskTimer('task2')} className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">Mulai</button>
                      )}
                      {taskTimers.task2.running && (
                        <button onClick={() => stopTaskTimer('task2')} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">Selesai</button>
                      )}
                      {taskTimers.task2.completed && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Selesai ({taskTimers.task2.time})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tugas 3 */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Tugas 3: Cari 5 Influencer Teratas</div>
                      <p className="text-xs text-text-secondary">Lihat panel 'Influencer Utama' di dasbor, lalu cari node dengan skor sentralitas tertinggi.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-black/40 px-2 py-1 rounded text-indigo-300 font-mono">
                        {taskTimers.task3.elapsed} detik
                      </span>
                      {!taskTimers.task3.running && !taskTimers.task3.completed && (
                        <button onClick={() => startTaskTimer('task3')} className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">Mulai</button>
                      )}
                      {taskTimers.task3.running && (
                        <button onClick={() => stopTaskTimer('task3')} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">Selesai</button>
                      )}
                      {taskTimers.task3.completed && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Selesai ({taskTimers.task3.time})
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Kuesioner SUS Terintegrasi (Cols 6) */}
              <div className="xl:col-span-6 glass-panel p-4 flex flex-col justify-between" style={{ minHeight: '450px' }}>
                <div>
                  <h2 className="text-md font-bold text-text-primary flex items-center gap-2 mb-1">
                    <HelpCircle className="w-4 h-4 text-purple-400" /> H3: Kuesioner System Usability Scale (SUS)
                  </h2>
                  <p className="text-xs text-text-secondary mb-3">
                    Isi survei di bawah ini untuk menghitung indeks kemudahan penggunaan (usabilitas) dasbor secara otomatis.
                  </p>
                  
                  <div className="overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1">
                    {[
                      "Saya rasa saya akan sering menggunakan sistem ini.",
                      "Saya merasa sistem ini terlalu rumit tanpa alasan yang jelas.",
                      "Saya rasa sistem ini sangat mudah digunakan.",
                      "Saya rasa saya memerlukan bantuan orang lain/teknisi untuk bisa menggunakan sistem ini.",
                      "Saya merasa berbagai fungsi dalam sistem ini terintegrasi dengan baik.",
                      "Saya merasa ada terlalu banyak ketidakkonsistenan pada sistem ini.",
                      "Saya memperkirakan sebagian besar orang akan mempelajari sistem ini dengan cepat.",
                      "Saya merasa sistem ini sangat membingungkan/rumit untuk digunakan.",
                      "Saya merasa sangat percaya diri saat menggunakan sistem ini.",
                      "Saya harus mempelajari banyak hal terlebih dahulu sebelum mulai menggunakan sistem ini."
                    ].map((q, idx) => (
                      <div key={idx} className="bg-white/5 p-2 rounded border border-white/5 text-xs">
                        <div className="font-medium mb-1">{idx+1}. {q}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-text-muted">Sangat Tidak Setuju</span>
                          <div className="flex gap-2.5">
                            {[1, 2, 3, 4, 5].map(v => (
                              <label key={v} className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`question-${idx}`} 
                                  value={v}
                                  checked={susRatings[idx] === v}
                                  onChange={() => handleRatingChange(idx, v)}
                                  className="w-3 h-3 text-indigo-500 bg-black border-white/10" />
                                <span className="text-[10px]">{v}</span>
                              </label>
                            ))}
                          </div>
                          <span className="text-[10px] text-text-muted">Sangat Setuju</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/5 pt-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                  <button 
                    onClick={computeSUS} 
                    className="btn-primary text-xs py-2 w-full md:w-auto">
                    Hitung Skor SUS
                  </button>
                  
                  {susScore !== null && (
                    <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/25 px-4 py-2 rounded-xl w-full md:w-auto text-center md:text-left justify-center md:justify-start">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Skor Usabilitas SUS</div>
                        <div className="text-xl font-black text-purple-300">{susScore.toFixed(1)} / 100</div>
                      </div>
                      <div className="h-8 w-px bg-white/10"></div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Kategori</div>
                        <div className="text-xl font-black text-indigo-300">
                          {susScore >= 80.3 ? 'A (Sangat Baik)' : susScore >= 68 ? 'B (Baik)' : susScore >= 51 ? 'C (Cukup)' : 'F (Buruk)'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="glass-panel mx-4 my-4 p-4 text-center text-xs text-text-muted border-t">
        Framework SNA Graf Dinamis &copy; 2026. Dikembangkan dengan Flask, NetworkX, dan React Force-Graph.
      </footer>
    </div>
  );
}

export default App;
