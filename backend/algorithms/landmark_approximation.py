import random
from collections import deque

def choose_landmarks(graph, percent=0.05):
    """
    Selects a fraction of nodes from the graph to act as landmarks using a hybrid approach:
    - 80% nodes with the highest degree
    - 20% random nodes from the remaining nodes
    """
    total = graph.number_of_nodes()
    if total == 0:
        return []
    k = max(1, int(total * percent))
    
    # Calculate degree of each node to identify central hubs
    degrees = dict(graph.degree())
    top_nodes = sorted(degrees.keys(), key=degrees.get, reverse=True)
    
    k_important = int(k * 0.8)
    k_random = k - k_important
    
    important_landmarks = top_nodes[:k_important]
    
    if k_random > 0:
        remaining = list(set(graph.nodes()) - set(important_landmarks))
        random_landmarks = random.sample(remaining, min(len(remaining), k_random))
    else:
        random_landmarks = []
        
    return important_landmarks + random_landmarks

def landmark_closeness(graph, percent=0.05, landmarks=None):
    """
    Approximates closeness centrality for all nodes in the graph using landmarks.
    """
    nodes = list(graph.nodes())
    N = len(nodes)
    if N == 0:
        return {}
        
    if landmarks is None:
        landmarks = choose_landmarks(graph, percent)
        
    K = len(landmarks)
    if K == 0:
        return {node: 0.0 for node in nodes}
        
    # Run BFS from each landmark to all other nodes
    # Since the graph is undirected, dist[l][u] = dist[u][l]
    landmark_distances = {l: {} for l in landmarks}
    for l in landmarks:
        dist = {node: float('inf') for node in nodes}
        dist[l] = 0
        queue = deque([l])
        while queue:
            curr = queue.popleft()
            curr_dist = dist[curr]
            for neighbor in graph.neighbors(curr):
                if dist[neighbor] == float('inf'):
                    dist[neighbor] = curr_dist + 1
                    queue.append(neighbor)
        landmark_distances[l] = dist

    approx_closeness = {}
    for u in nodes:
        # Get distances from u to all landmarks
        reachable_landmarks = []
        sum_l_dist = 0
        for l in landmarks:
            d = landmark_distances[l].get(u, float('inf'))
            if d < float('inf'):
                reachable_landmarks.append(l)
                sum_l_dist += d
                
        num_reachable_l = len(reachable_landmarks)
        
        if num_reachable_l == 0 or sum_l_dist == 0:
            approx_closeness[u] = 0.0
        else:
            # Estimate fraction of reachable nodes based on reachable landmarks
            # n_u is the estimated size of the connected component containing u
            fraction_l = num_reachable_l / K
            n_u = max(1.0, N * fraction_l)
            
            # Average distance to landmarks
            avg_dist_l = sum_l_dist / num_reachable_l
            
            # Estimate sum of distances to all reachable nodes
            sum_dist_est = n_u * avg_dist_l
            
            if n_u <= 1:
                approx_closeness[u] = 0.0
            else:
                # NetworkX closeness centrality style formula:
                # C(u) = (n_u - 1) * (n_u - 1) / ((N - 1) * sum_dist_est)
                approx_closeness[u] = ((n_u - 1) * (n_u - 1)) / ((N - 1) * sum_dist_est)
                
    return approx_closeness
