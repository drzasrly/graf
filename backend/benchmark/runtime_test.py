import time
import random
import networkx as nx
from backend.algorithms.closeness_exact import exact_closeness
from backend.algorithms.closeness_incremental import IncrementalCloseness

def run_runtime_benchmark(graph, num_updates=20):
    """
    Benchmarks runtime comparison between ICC and Full Recompute over multiple random updates.
    """
    icc = IncrementalCloseness(graph)
    nodes = list(graph.nodes())
    results = []
    
    for i in range(num_updates):
        # Randomly choose addition or removal
        # Bias towards addition if density is low, but allow removals
        existing_edges = list(icc.graph.edges())
        op = "add"
        if len(existing_edges) > 5 and random.random() < 0.4:
            op = "remove"
            
        if op == "remove":
            u, v = random.choice(existing_edges)
            start_icc = time.perf_counter()
            affected = icc.remove_edge(u, v)
            time_icc = time.perf_counter() - start_icc
            
            start_full = time.perf_counter()
            exact_closeness(icc.graph)
            time_full = time.perf_counter() - start_full
        else:
            u = random.choice(nodes)
            v = random.choice(nodes)
            while u == v or icc.graph.has_edge(u, v):
                u = random.choice(nodes)
                v = random.choice(nodes)
            
            start_icc = time.perf_counter()
            affected = icc.add_edge(u, v)
            time_icc = time.perf_counter() - start_icc
            
            start_full = time.perf_counter()
            exact_closeness(icc.graph)
            time_full = time.perf_counter() - start_full
            
        speedup = time_full / max(1e-9, time_icc)
        efficiency = ((time_full - time_icc) / max(1e-9, time_full)) * 100
        
        results.append({
            'step': i + 1,
            'operation': op,
            'edge': f"({u}, {v})",
            'affected_nodes_count': len(affected),
            'runtime_icc': time_icc,
            'runtime_full': time_full,
            'speedup': speedup,
            'efficiency': efficiency
        })
        
    return results

if __name__ == '__main__':
    G = nx.barabasi_albert_graph(100, 2)
    G = nx.relabel_nodes(G, {n: str(n) for n in G.nodes()})
    
    print("Running runtime benchmark...")
    res = run_runtime_benchmark(G, num_updates=15)
    for r in res:
        print(f"Step {r['step']}: {r['operation']} {r['edge']} | "
              f"ICC: {r['runtime_icc']:.6f}s, Full: {r['runtime_full']:.6f}s | "
              f"Speedup: {r['speedup']:.2f}x | Efficiency: {r['efficiency']:.2f}%")
