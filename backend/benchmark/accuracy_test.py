import numpy as np
import scipy.stats as stats
import networkx as nx
from backend.algorithms.closeness_exact import exact_closeness
from backend.algorithms.landmark_approximation import landmark_closeness

def calculate_pearson_correlation(exact, approx):
    """
    Computes Pearson Correlation between exact and landmark centralities.
    """
    nodes = sorted(list(exact.keys()))
    if len(nodes) < 2:
        return 1.0
        
    x = np.array([exact[node] for node in nodes])
    y = np.array([approx.get(node, 0.0) for node in nodes])
    
    # Check standard deviations to prevent divide by zero errors
    if np.std(x) == 0 or np.std(y) == 0:
        return 0.0
        
    correlation, _ = stats.pearsonr(x, y)
    return float(correlation)

def run_accuracy_benchmark(graph, percent=0.05):
    """
    Runs accuracy comparison on the graph, returns correlation and scores.
    """
    exact = exact_closeness(graph)
    approx = landmark_closeness(graph, percent=percent)
    
    correlation = calculate_pearson_correlation(exact, approx)
    
    # Package values for comparison plotting
    nodes = list(graph.nodes())
    node_comparison = []
    for node in nodes:
        node_comparison.append({
            'node': node,
            'exact': exact[node],
            'approx': approx.get(node, 0.0)
        })
        
    return {
        'pearson_correlation': correlation,
        'node_comparison': node_comparison
    }

if __name__ == '__main__':
    G = nx.barabasi_albert_graph(200, 3)
    G = nx.relabel_nodes(G, {n: str(n) for n in G.nodes()})
    
    print("Running accuracy benchmark...")
    res = run_accuracy_benchmark(G, percent=0.05)
    print(f"Pearson Correlation (LBA @ 5%): {res['pearson_correlation']:.6f}")
    if res['pearson_correlation'] >= 0.95:
        print("Success: Correlation is above 0.95 target!")
    else:
        print("Warning: Correlation is below 0.95 target.")
