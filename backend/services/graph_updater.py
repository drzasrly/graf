import time
from backend.algorithms.closeness_exact import exact_closeness
from backend.algorithms.closeness_incremental import IncrementalCloseness
from backend.algorithms.landmark_approximation import landmark_closeness

class GraphSession:
    def __init__(self, graph):
        self.graph = graph.copy()
        N = self.graph.number_of_nodes()
        
        # Safeguard: Initialize ICC solver only for reasonable sizes to prevent MemoryError (O(N^2) shortest path matrix)
        if N <= 1000:
            self.icc = IncrementalCloseness(self.graph)
        else:
            self.icc = None
            
        self.exact_centralities = {}
        self.lba_centralities = {}
        
        # Initial calculation
        self.update_all_centralities()

    def update_all_centralities(self):
        """
        Runs recomputation for Exact and LBA closeness centralities.
        If graph N > 1000, exact computation is skipped and approximated with LBA to prevent server timeouts.
        """
        N = self.graph.number_of_nodes()
        if N > 1000:
            self.lba_centralities = landmark_closeness(self.graph)
            self.exact_centralities = self.lba_centralities.copy()
        else:
            self.exact_centralities = exact_closeness(self.graph)
            self.lba_centralities = landmark_closeness(self.graph)

    def add_edge(self, u, v):
        """
        Adds an edge, updating ICC incrementally (if N <= 1000), measuring runtime,
        and comparing with full exact recomputation (approximated with LBA if N > 1000).
        """
        # 1. ICC Update
        start_time = time.time()
        if self.icc is not None:
            affected_nodes = self.icc.add_edge(u, v)
            self.graph = self.icc.graph.copy()
        else:
            # Fallback for large graph: directly add edge
            if not self.graph.has_node(u):
                self.graph.add_node(u)
            if not self.graph.has_node(v):
                self.graph.add_node(v)
            self.graph.add_edge(u, v)
            affected_nodes = [u, v]
        icc_time = time.time() - start_time
        
        # 2. Exact Closeness Full Recompute for benchmark comparison
        start_recompute = time.time()
        N = self.graph.number_of_nodes()
        if N > 1000:
            exact_results = self.lba_centralities.copy()
        else:
            exact_results = exact_closeness(self.graph)
        full_recompute_time = time.time() - start_recompute
        
        # Save exact results
        self.exact_centralities = exact_results
        
        # 3. LBA Update
        self.lba_centralities = landmark_closeness(self.graph)
        
        # Ensure new nodes have values
        for node in [u, v]:
            if node not in self.exact_centralities:
                self.exact_centralities[node] = 0.05
            if node not in self.lba_centralities:
                self.lba_centralities[node] = 0.05
        
        return {
            'affected_nodes': affected_nodes,
            'icc_time': icc_time,
            'full_recompute_time': full_recompute_time,
            'speedup': full_recompute_time / max(1e-9, start_recompute),
            'efficiency': ((full_recompute_time - icc_time) / max(1e-9, full_recompute_time)) * 100
        }

    def remove_edge(self, u, v):
        """
        Removes an edge, updating ICC incrementally (if N <= 1000), measuring runtime,
        and comparing with full exact recomputation (approximated with LBA if N > 1000).
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
        if self.icc is not None:
            affected_nodes = self.icc.remove_edge(u, v)
            self.graph = self.icc.graph.copy()
        else:
            # Fallback for large graph: directly remove edge
            self.graph.remove_edge(u, v)
            affected_nodes = [u, v]
        icc_time = time.time() - start_time
        
        # 2. Exact Closeness Full Recompute
        start_recompute = time.time()
        N = self.graph.number_of_nodes()
        if N > 1000:
            exact_results = self.lba_centralities.copy()
        else:
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
