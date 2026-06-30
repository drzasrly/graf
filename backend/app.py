from flask import Flask, jsonify
from flask_cors import CORS
from backend.routes.graph_routes import graph_bp
from backend.routes.centrality_routes import centrality_bp

app = Flask(__name__)
# Enable CORS so our frontend running on Vite (usually port 5173) can query it
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints under the /api path prefix
app.register_blueprint(graph_bp, url_prefix='/api')
app.register_blueprint(centrality_bp, url_prefix='/api')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'message': 'SNA Framework Backend API is running'
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': f'Internal Server Error: {str(e)}'}), 500

if __name__ == '__main__':
    # Start the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
