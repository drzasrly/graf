from flask import Blueprint, request, jsonify
from backend.routes.graph_routes import get_active_session
from backend.benchmark.accuracy_test import run_accuracy_benchmark
from backend.benchmark.runtime_test import run_runtime_benchmark

centrality_bp = Blueprint('centrality', __name__)

@centrality_bp.route('/centrality', methods=['POST'])
def get_node_centrality():
    """
    POST /api/centrality
    Fetches centrality of a specific node or all nodes.
    Body format:
    {
      "node": 15
    }
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Belum ada graf yang diinisialisasi.'}), 400
        
    data = request.get_json() or {}
    node_id = data.get('node')
    
    # If a specific node is requested
    if node_id is not None:
        node_id_str = str(node_id)
        if not session.graph.has_node(node_id_str):
            return jsonify({'error': f'Node {node_id} tidak ada di dalam graf.'}), 404
            
        closeness_val = session.exact_centralities.get(node_id_str, 0.0)
        return jsonify({
            'node': node_id,
            'closeness': round(closeness_val, 6)
        }), 200
        
    # Return summary of all nodes if no specific node is provided
    # Format: list of {node: x, closeness: y}
    results = [
        {'node': node, 'closeness': round(val, 6)}
        for node, val in session.exact_centralities.items()
    ]
    return jsonify(results), 200

@centrality_bp.route('/influencers', methods=['GET'])
def get_influencers():
    """
    GET /api/centrality/influencers
    Returns the top N influencers sorted by Closeness Centrality.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Belum ada graf yang diinisialisasi.'}), 400
        
    limit = int(request.args.get('limit', 10))
    
    # Sort nodes by Closeness Centrality
    top_exact = sorted(session.exact_centralities.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    influencers = []
    for rank, (node, score) in enumerate(top_exact, 1):
        influencers.append({
            'rank': rank,
            'node': node,
            'closeness_exact': round(score, 6),
            'closeness_icc': round(session.icc.closeness.get(node, 0.0), 6),
            'closeness_lba': round(session.lba_centralities.get(node, 0.0), 6),
            'degree': session.graph.degree(node)
        })
        
    return jsonify(influencers), 200

@centrality_bp.route('/benchmark/runtime', methods=['POST'])
def benchmark_runtime():
    """
    POST /api/centrality/benchmark/runtime
    Runs runtime benchmarks for a given number of random updates.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Sesi graf belum aktif.'}), 400
        
    data = request.get_json() or {}
    num_updates = int(data.get('num_updates', 15))
    
    try:
        # Run test on the active session's graph (copy it to avoid altering state)
        benchmark_history = run_runtime_benchmark(session.graph.copy(), num_updates)
        
        # Calculate summary statistics
        avg_icc = sum(b['runtime_icc'] for b in benchmark_history) / num_updates
        avg_full = sum(b['runtime_full'] for b in benchmark_history) / num_updates
        avg_speedup = avg_full / max(1e-9, avg_icc)
        avg_efficiency = ((avg_full - avg_icc) / max(1e-9, avg_full)) * 100
        
        return jsonify({
            'history': benchmark_history,
            'summary': {
                'avg_runtime_icc': avg_icc,
                'avg_runtime_full': avg_full,
                'avg_speedup': avg_speedup,
                'avg_efficiency': avg_efficiency
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Benchmark runtime gagal: {str(e)}'}), 500

@centrality_bp.route('/benchmark/accuracy', methods=['POST'])
def benchmark_accuracy():
    """
    POST /api/centrality/benchmark/accuracy
    Runs accuracy benchmarks comparing Exact closeness with Landmark-Based Closeness.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Sesi graf belum aktif.'}), 400
        
    data = request.get_json() or {}
    percent = float(data.get('percent', 0.05))
    
    try:
        results = run_accuracy_benchmark(session.graph, percent)
        return jsonify({
            'pearson_correlation': results['pearson_correlation'],
            'node_comparison': results['node_comparison'],
            'percent': percent,
            'landmarks_count': max(1, int(session.graph.number_of_nodes() * percent))
        }), 200
    except Exception as e:
        return jsonify({'error': f'Benchmark akurasi gagal: {str(e)}'}), 500
