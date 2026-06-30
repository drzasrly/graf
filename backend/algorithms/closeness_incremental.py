import networkx as nx
from collections import deque

class IncrementalCloseness:
    def __init__(self, graph):
        self.graph = graph.copy()
        self.nodes = list(self.graph.nodes())
        self.num_nodes = len(self.nodes)
        
        # self.distances[s][t] stores shortest path distance from s to t
        self.distances = {}
        self.closeness = {}
        
        # Compute initial shortest paths and closeness
        self.recompute_all()

    def recompute_all(self):
        self.nodes = list(self.graph.nodes())
        self.num_nodes = len(self.nodes)
        self.distances = {s: {} for s in self.nodes}
        self.closeness = {}
        
        for s in self.nodes:
            self._bfs(s)

    def _bfs(self, s):
        # SSSP using BFS for unweighted graph
        dist = {node: float('inf') for node in self.nodes}
        dist[s] = 0
        queue = deque([s])
        
        while queue:
            curr = queue.popleft()
            curr_dist = dist[curr]
            for neighbor in self.graph.neighbors(curr):
                if dist[neighbor] == float('inf'):
                    dist[neighbor] = curr_dist + 1
                    queue.append(neighbor)
                    
        self.distances[s] = dist
        
        # Compute closeness centrality using NetworkX formula
        # C(s) = (n_s - 1) / (N - 1) * (n_s - 1) / sum(d(s, t))
        # where n_s is the number of reachable nodes from s
        reachable = [d for d in dist.values() if d < float('inf')]
        n_s = len(reachable)
        sum_dist = sum(reachable)
        
        if sum_dist == 0 or n_s <= 1:
            self.closeness[s] = 0.0
        else:
            N = self.num_nodes
            # NetworkX formula for disconnected graphs:
            self.closeness[s] = ((n_s - 1) * (n_s - 1)) / ((N - 1) * sum_dist)

    def add_edge(self, u, v):
        # 1. Add nodes if they do not exist
        nodes_added = False
        for node in [u, v]:
            if not self.graph.has_node(node):
                self.graph.add_node(node)
                self.nodes.append(node)
                nodes_added = True
                
        if nodes_added:
            self.num_nodes = len(self.nodes)
            # Re-initialize distance arrays for new node dimensions
            for s in self.nodes:
                if s not in self.distances:
                    self.distances[s] = {}
                for t in self.nodes:
                    if t not in self.distances[s]:
                        self.distances[s][t] = 0 if s == t else float('inf')

        # Check if the edge already exists
        if self.graph.has_edge(u, v):
            return []
            
        # 2. Add edge
        self.graph.add_edge(u, v)
        
        # 3. Find affected nodes
        affected_nodes = []
        for s in self.nodes:
            # Check if adding edge (u, v) reduces distance to any node from s
            # s is affected if dist[s][u] + 1 < dist[s][v] or dist[s][v] + 1 < dist[s][u]
            if self.distances[s][u] + 1 < self.distances[s][v] or self.distances[s][v] + 1 < self.distances[s][u]:
                affected_nodes.append(s)
                
        # 4. Recalculate closeness for affected nodes
        for s in affected_nodes:
            self._bfs(s)
            
        # If we added new nodes, their centralities must be computed too
        if nodes_added:
            for node in [u, v]:
                if node not in affected_nodes:
                    self._bfs(node)
                    affected_nodes.append(node)
            
        return affected_nodes

    def remove_edge(self, u, v):
        if not self.graph.has_edge(u, v):
            return []
            
        # 1. Remove edge
        self.graph.remove_edge(u, v)
        
        # 2. Find affected nodes
        affected_nodes = []
        for s in self.nodes:
            # Check if deleting (u, v) increases distances
            # s is affected if (u, v) was the UNIQUE shortest path edge to u or v from s
            is_u_to_v_affected = False
            if self.distances[s][u] != float('inf') and self.distances[s][u] + 1 == self.distances[s][v]:
                other_paths = False
                for w in self.graph.neighbors(v):
                    if w != u and self.distances[s][w] == self.distances[s][u]:
                        other_paths = True
                        break
                if not other_paths:
                    is_u_to_v_affected = True
                    
            is_v_to_u_affected = False
            if self.distances[s][v] != float('inf') and self.distances[s][v] + 1 == self.distances[s][u]:
                other_paths = False
                for w in self.graph.neighbors(u):
                    if w != v and self.distances[s][w] == self.distances[s][v]:
                        other_paths = True
                        break
                if not other_paths:
                    is_v_to_u_affected = True
                    
            if is_u_to_v_affected or is_v_to_u_affected:
                affected_nodes.append(s)
                
        # 3. Recalculate closeness for affected nodes
        for s in affected_nodes:
            self._bfs(s)
            
        return affected_nodes
