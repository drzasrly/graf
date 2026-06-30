from flask import Blueprint, request, jsonify
import os
import random
import networkx as nx
from werkzeug.utils import secure_filename
from backend.services.graph_loader import (
    load_graph_from_csv,
    generate_barabasi_albert,
    generate_watts_strogatz,
    generate_lfr_like,
    get_predefined_dataset
)
from backend.services.graph_updater import GraphSession

graph_bp = Blueprint('graph', __name__)

# Global session store for the active graph
active_session = None

def get_active_session():
    global active_session
    return active_session

def set_active_session(session):
    global active_session
    active_session = session

@graph_bp.route('/upload', methods=['POST'])
def upload_graph():
    """
    POST /api/upload
    Allows uploading an edge-list CSV file.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Parameter file tidak ditemukan di request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Berkas belum dipilih'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../temp'))
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
            
        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        
        try:
            G = load_graph_from_csv(file_path)
            # Remove temp file
            os.remove(file_path)
            
            session = GraphSession(G)
            set_active_session(session)
            
            return jsonify({
                'message': 'Dataset graf berhasil diunggah dan diinisialisasi.',
                'nodes_count': G.number_of_nodes(),
                'edges_count': G.number_of_edges()
            }), 200
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': f'Gagal memproses berkas: {str(e)}'}), 500

@graph_bp.route('/init', methods=['POST'])
def init_graph():
    """
    POST /api/graph/init
    Initializes a graph using a predefined dataset or synthetic generator.
    """
    data = request.get_json() or {}
    source_type = data.get('source_type', 'synthetic') # 'predefined' or 'synthetic'
    name = data.get('name', 'barabasi_albert')
    
    try:
        if source_type == 'predefined':
            G = get_predefined_dataset(name)
        else:
            # Synthetic generators
            n = int(data.get('n', 100))
            if name == 'barabasi_albert':
                m = int(data.get('m', 2))
                G = generate_barabasi_albert(n, m)
            elif name == 'watts_strogatz':
                k = int(data.get('k', 4))
                p = float(data.get('p', 0.1))
                G = generate_watts_strogatz(n, k, p)
            elif name == 'lfr_like':
                G = generate_lfr_like(n)
            else:
                return jsonify({'error': f'Model generator tidak dikenal: {name}'}), 400
                
        session = GraphSession(G)
        set_active_session(session)
        
        return jsonify({
            'message': 'Graf berhasil diinisialisasi.',
            'nodes_count': G.number_of_nodes(),
            'edges_count': G.number_of_edges()
        }), 200
    except Exception as e:
        return jsonify({'error': f'Gagal menginisialisasi graf: {str(e)}'}), 500

@graph_bp.route('/info', methods=['GET'])
def get_graph_info():
    """
    GET /api/graph/info
    Returns the basic details and node/edge list of the active graph.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Belum ada graf yang diinisialisasi.'}), 400
        
    G = session.graph
    nodes_data = [{'id': node} for node in G.nodes()]
    edges_data = [{'source': u, 'target': v} for u, v in G.edges()]
    
    return jsonify({
        'nodes_count': G.number_of_nodes(),
        'edges_count': G.number_of_edges(),
        'nodes': nodes_data,
        'edges': edges_data
    }), 200

@graph_bp.route('/edge/add', methods=['POST'])
def add_edge():
    """
    POST /api/graph/edge/add
    Dynamically adds an edge and triggers incremental centrality recalculation.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Belum ada graf yang diinisialisasi.'}), 400
        
    data = request.get_json() or {}
    u = str(data.get('source'))
    v = str(data.get('target'))
    
    if not u or not v:
        return jsonify({'error': 'Node asal dan tujuan wajib diisi.'}), 400
        
    try:
        benchmark_results = session.add_edge(u, v)
        return jsonify({
            'message': f'Edge ({u}, {v}) berhasil ditambahkan.',
            'nodes_count': session.graph.number_of_nodes(),
            'edges_count': session.graph.number_of_edges(),
            'benchmark': benchmark_results
        }), 200
    except Exception as e:
        return jsonify({'error': f'Gagal menambahkan edge: {str(e)}'}), 500

@graph_bp.route('/edge/remove', methods=['POST'])
def remove_edge():
    """
    POST /api/graph/edge/remove
    Dynamically removes an edge and triggers incremental centrality recalculation.
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Belum ada graf yang diinisialisasi.'}), 400
        
    data = request.get_json() or {}
    u = str(data.get('source'))
    v = str(data.get('target'))
    
    if not u or not v:
        return jsonify({'error': 'Node asal dan tujuan wajib diisi.'}), 400
        
    try:
        benchmark_results = session.remove_edge(u, v)
        return jsonify({
            'message': f'Edge ({u}, {v}) berhasil dihapus.',
            'nodes_count': session.graph.number_of_nodes(),
            'edges_count': session.graph.number_of_edges(),
            'benchmark': benchmark_results
        }), 200
    except Exception as e:
        return jsonify({'error': f'Gagal menghapus edge: {str(e)}'}), 500

@graph_bp.route('/simulate-propagation', methods=['POST'])
def simulate_propagation():
    """
    POST /api/graph/simulate-propagation
    Simulates Independent Cascade propagation starting from top closeness vs top degree nodes.
    Supports random node failure/disruption to model disaster communication breakdown (RM4 / H4).
    """
    session = get_active_session()
    if not session:
        return jsonify({'error': 'Sesi graf belum aktif.'}), 400
        
    data = request.get_json() or {}
    seed_count = int(data.get('seed_count', 3))
    p = float(data.get('prob', 0.15))
    max_steps = int(data.get('max_steps', 20))
    failure_rate = float(data.get('failure_rate', 0.0))  # 0.0 = no failures, 0.20 = 20% node failure
    
    G = session.graph
    if G.number_of_nodes() == 0:
        return jsonify({'error': 'Graf kosong.'}), 400
        
    # Get seed sets
    # 1. Top closeness seeds
    top_closeness = sorted(session.exact_centralities.items(), key=lambda x: x[1], reverse=True)
    closeness_seeds = [node for node, val in top_closeness[:seed_count]]
    
    # 2. Top degree seeds
    top_degree = sorted(dict(G.degree()).items(), key=lambda x: x[1], reverse=True)
    degree_seeds = [node for node, val in top_degree[:seed_count]]
    
    # Determine failed nodes (disrupted nodes due to disaster)
    # Failed nodes cannot be seeds, and are selected randomly based on failure_rate
    non_seed_nodes = [n for n in G.nodes() if n not in closeness_seeds and n not in degree_seeds]
    num_failed = int(len(G.nodes()) * failure_rate)
    num_failed = min(num_failed, len(non_seed_nodes))
    
    failed_nodes = set(random.sample(non_seed_nodes, num_failed)) if num_failed > 0 else set()
    
    def run_cascade(seeds):
        # We copy the graph and remove failed nodes to simulate physical communication link disruption
        G_temp = G.copy()
        G_temp.remove_nodes_from(failed_nodes)
        
        # Ensure seeds exist in active graph
        active_seeds = [s for s in seeds if G_temp.has_node(s)]
        infected = set(active_seeds)
        newly_infected = list(active_seeds)
        history = [list(infected)] # Step 0
        
        step = 0
        while newly_infected and step < max_steps:
            next_newly_infected = []
            for active in newly_infected:
                if not G_temp.has_node(active):
                    continue
                for neighbor in G_temp.neighbors(active):
                    if neighbor not in infected:
                        if random.random() < p:
                            infected.add(neighbor)
                            next_newly_infected.append(neighbor)
            newly_infected = next_newly_infected
            history.append(list(infected))
            step += 1
            
        return history
        
    # Run simulation
    # We will average over 10 runs to smooth out stochasticity
    num_runs = 10
    closeness_histories = [run_cascade(closeness_seeds) for _ in range(num_runs)]
    degree_histories = [run_cascade(degree_seeds) for _ in range(num_runs)]
    
    # Process average infected count per step
    max_len_c = max(len(h) for h in closeness_histories)
    max_len_d = max(len(h) for h in degree_histories)
    
    avg_c = []
    for step in range(max_len_c):
        counts = []
        for run in closeness_histories:
            idx = min(step, len(run) - 1)
            counts.append(len(run[idx]))
        avg_c.append(sum(counts) / len(counts))
        
    avg_d = []
    for step in range(max_len_d):
        counts = []
        for run in degree_histories:
            idx = min(step, len(run) - 1)
            counts.append(len(run[idx]))
        avg_d.append(sum(counts) / len(counts))
        
    return jsonify({
        'closeness_seeds': closeness_seeds,
        'degree_seeds': degree_seeds,
        # Return history of one random run for visual step-by-step display
        'closeness_visual_run': closeness_histories[0],
        'degree_visual_run': degree_histories[0],
        'closeness_avg_infected': avg_c,
        'degree_avg_infected': avg_d,
        'total_nodes': G.number_of_nodes(),
        'failed_nodes': list(failed_nodes)
    }), 200
