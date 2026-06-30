import networkx as nx

def exact_closeness(graph):
    """
    Computes the exact closeness centrality of all nodes in the graph.
    Returns a dictionary mapping node labels to closeness centrality values.
    """
    return nx.closeness_centrality(graph)
