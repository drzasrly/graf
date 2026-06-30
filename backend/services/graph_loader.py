import networkx as nx
import os
import pandas as pd
import random

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../datasets'))

def ensure_datasets_dir():
    if not os.path.exists(DATASETS_DIR):
        os.makedirs(DATASETS_DIR)

def load_graph_from_csv(file_path):
    """
    Loads an undirected graph from a CSV file.
    Expected columns: source, target
    """
    df = pd.read_csv(file_path)
    G = nx.Graph()
    for _, row in df.iterrows():
        u = str(row['source'])
        v = str(row['target'])
        G.add_edge(u, v)
    return G

def generate_barabasi_albert(n=100, m=2):
    """
    Generates a Barabasi-Albert scale-free graph.
    """
    G = nx.barabasi_albert_graph(n, m)
    # Convert node labels to strings for consistency
    return nx.relabel_nodes(G, {node: str(node) for node in G.nodes()})

def generate_watts_strogatz(n=100, k=4, p=0.1):
    """
    Generates a Watts-Strogatz small-world graph.
    """
    G = nx.watts_strogatz_graph(n, k, p)
    return nx.relabel_nodes(G, {node: str(node) for node in G.nodes()})

def generate_lfr_like(n=100):
    """
    Generates a simplified LFR-like benchmark graph with power-law degree distribution
    and community structure.
    """
    # Using powerlaw_cluster_graph as a proxy for LFR community-structured graph
    G = nx.powerlaw_cluster_graph(n, m=2, p=0.2)
    return nx.relabel_nodes(G, {node: str(node) for node in G.nodes()})

def get_predefined_dataset(name):
    """
    Retrieves or generates a predefined real-world graph dataset.
    Options: 'facebook', 'twitter', 'communication'
    """
    ensure_datasets_dir()
    file_path = os.path.join(DATASETS_DIR, f"{name}.csv")
    
    if os.path.exists(file_path):
        return load_graph_from_csv(file_path)
    
    # Generate mock dataset representing the requested network characteristics
    if name == 'facebook':
        # Small world properties
        G = generate_watts_strogatz(150, k=6, p=0.05)
    elif name == 'twitter':
        # Scale-free properties (heavy hubs)
        G = generate_barabasi_albert(150, m=3)
    elif name == 'communication':
        # Mixed random graph
        G = generate_lfr_like(120)
    else:
        raise ValueError(f"Unknown dataset name: {name}")
    
    # Save to CSV for future use
    df = pd.DataFrame(list(G.edges()), columns=['source', 'target'])
    df.to_csv(file_path, index=False)
    
    return G
