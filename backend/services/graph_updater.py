import time
from backend.algorithms.closeness_exact import exact_closeness
from backend.algorithms.closeness_incremental import IncrementalCloseness
from backend.algorithms.landmark_approximation import landmark_closeness

class GraphSession:
    def __init__(self, graph):
        self.graph = graph.copy()
        # Initialize ICC solver with the initial graph
        self.icc = IncrementalCloseness(self.graph)
        
        self.exact_centralities = {}
        self.lba_centralities = {}
        
        # Initial calculation
        self.update_all_centralities()

    def update_all_centralities(self):
        """
        Runs full recomputation for Exact and LBA closeness centralities.
        """
        self.exact_centralities = exact_closeness(self.graph)
        self.lba_centralities = landmark_closeness(self.graph)

    def add_edge(self, u, v):
        """
        Adds an edge, updating ICC incrementally, measuring runtime,
        and comparing with full exact recomputation.
        """
        # 1. ICC Update
        start_time = time.time()
        affected_nodes = self.icc.add_edge(u, v)
        icc_time = time.time() - start_time
        
        # Update local graph reference to match ICC's graph
        self.graph = self.icc.graph.copy()
        
        # 2. Exact Closeness Full Recompute for benchmark comparison
        start_recompute = time.time()
        exact_results = exact_closeness(self.graph)
        full_recompute_time = time.time() - start_recompute
        
        # Save exact results
        self.exact_centralities = exact_results
        
        # 3. LBA Update
        self.lba_centralities = landmark_closeness(self.graph)
        
        return {
            'affected_nodes': affected_nodes,
            'icc_time': icc_time,
            'full_recompute_time': full_recompute_time,
            'speedup': full_recompute_time / max(1e-9, icc_time),
            'efficiency': ((full_recompute_time - icc_time) / max(1e-9, full_recompute_time)) * 100
        }

    def remove_edge(self, u, v):
        """
        Removes an edge, updating ICC incrementally, measuring runtime,
        and comparing with full exact recomputation.
        """
        if not self.graph.has_edge(u, v):
            return {
                'affected_nodes': [],
                'icc_time': 0,
                'full_recompute_time': 0,
                'speedup': 1,
                'efficiency': 0
            }
            
        # 1. ICC Update
        start_time = time.time()
        affected_nodes = self.icc.remove_edge(u, v)
        icc_time = time.time() - start_time
        
        # Update local graph reference
        self.graph = self.icc.graph.copy()
        
        # 2. Exact Closeness Full Recompute
        start_recompute = time.time()
        exact_results = exact_closeness(self.graph)
        full_recompute_time = time.time() - start_recompute
        
        self.exact_centralities = exact_results
        
        # 3. LBA Update
        self.lba_centralities = landmark_closeness(self.graph)
        
        return {
            'affected_nodes': affected_nodes,
            'icc_time': icc_time,
            'full_recompute_time': full_recompute_time,
            'speedup': full_recompute_time / max(1e-9, icc_time),
            'efficiency': ((full_recompute_time - icc_time) / max(1e-9, full_recompute_time)) * 100
        }
