import networkx as nx

class IncrementalCloseness:
    def __init__(self, graph):
        self.graph = graph.copy()
        # self.closeness stores closeness centralities for all nodes in the graph
        self.closeness = nx.closeness_centrality(self.graph)

    def add_edge(self, u, v):
        # 1. Add nodes if they do not exist
        for node in [u, v]:
            if not self.graph.has_node(node):
                self.graph.add_node(node)
                self.closeness[node] = 0.05
                
        # Check if the edge already exists
        if self.graph.has_edge(u, v):
            return []
            
        # 2. Add edge
        self.graph.add_edge(u, v)
        
        # 3. Determine affected nodes: u, v, and their direct neighbors
        affected_nodes = {u, v}
        affected_nodes.update(self.graph.neighbors(u))
        affected_nodes.update(self.graph.neighbors(v))
        affected_nodes = list(affected_nodes)
        
        # 4. Recalculate closeness centrality only for the affected nodes
        for node in affected_nodes:
            self.closeness[node] = nx.closeness_centrality(self.graph, u=node)
            
        return affected_nodes

    def remove_edge(self, u, v):
        if not self.graph.has_edge(u, v):
            return []
            
        # 1. Determine affected nodes: u, v, and their direct neighbors (before removal)
        affected_nodes = {u, v}
        affected_nodes.update(self.graph.neighbors(u))
        affected_nodes.update(self.graph.neighbors(v))
        affected_nodes = list(affected_nodes)
        
        # 2. Remove edge
        self.graph.remove_edge(u, v)
        
        # 3. Recalculate closeness centrality only for the affected nodes
        for node in affected_nodes:
            if self.graph.has_node(node):
                self.closeness[node] = nx.closeness_centrality(self.graph, u=node)
            else:
                self.closeness[node] = 0.0
                
        return affected_nodes
