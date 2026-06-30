const API_BASE = 'http://localhost:5000/api';

export const snaApi = {
  health: () => 
    fetch(`${API_BASE}/health`).then(r => r.json()),
    
  initGraph: (payload) => 
    fetch(`${API_BASE}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()),
    
  getGraphInfo: () => 
    fetch(`${API_BASE}/info`).then(r => r.json()),
    
  addEdge: (source, target) => 
    fetch(`${API_BASE}/edge/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target })
    }).then(r => r.json()),
    
  removeEdge: (source, target) => 
    fetch(`${API_BASE}/edge/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target })
    }).then(r => r.json()),
    
  simulatePropagation: (seedCount, prob, maxSteps, failureRate = 0.0) => 
    fetch(`${API_BASE}/simulate-propagation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_count: seedCount, prob, max_steps: maxSteps, failure_rate: failureRate })
    }).then(r => r.json()),
    
  getNodeCentrality: (node = null) => 
    fetch(`${API_BASE}/centrality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node !== null ? { node } : {})
    }).then(r => r.json()),
    
  getInfluencers: (limit = 10) => 
    fetch(`${API_BASE}/influencers?limit=${limit}`).then(r => r.json()),
    
  benchmarkRuntime: (numUpdates = 15) => 
    fetch(`${API_BASE}/benchmark/runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_updates: numUpdates })
    }).then(r => r.json()),
    
  benchmarkAccuracy: (percent = 0.05) => 
    fetch(`${API_BASE}/benchmark/accuracy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percent })
    }).then(r => r.json())
};
