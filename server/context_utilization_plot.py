
import json
import matplotlib.pyplot as plt
import numpy as np
import os

# Define the path to the JSON file
JSON_PATH = "rag_evaluation_results.json"

def extract_context_data(json_path):
    """Extract context utilization data from the JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract relevant fields from per_query_results
        context_data = [
            {
                'question_idx': idx + 1,
                'num_contexts': round(result.get('num_contexts', 0)),  # Round to nearest integer
                'avg_retrieval_similarity': result.get('avg_retrieval_similarity', 0.0),
                'semantic_similarity': result.get('semantic_similarity', 0.0)
            }
            for idx, result in enumerate(data.get('per_query_results', []))
            if result.get('num_contexts') is not None and result.get('avg_retrieval_similarity') is not None
        ]
        return context_data
    except FileNotFoundError:
        print(f"Error: File {json_path} not found.")
        return []
    except json.JSONDecodeError:
        print("Error: Invalid JSON format.")
        return []
    except KeyError as e:
        print(f"Error: Missing key {e} in JSON structure.")
        return []

def plot_context_utilization(context_data):
    """Generate and save a presentable scatter plot for context utilization."""
    if not context_data:
        print("No valid context data found. Plot not generated.")
        return

    # Extract data
    num_contexts = [d['num_contexts'] for d in context_data]
    avg_retrieval_sim = [d['avg_retrieval_similarity'] for d in context_data]
    semantic_sim = [d['semantic_similarity'] for d in context_data]

    # Add jitter to reduce overlap
    jitter = np.random.normal(0, 0.1, len(num_contexts))
    num_contexts_jittered = [n + j for n, j in zip(num_contexts, jitter)]

    # Create a larger figure
    plt.figure(figsize=(12, 8))
    
    # Scatter plot with color gradient based on semantic similarity
    scatter = plt.scatter(num_contexts_jittered, avg_retrieval_sim, c=semantic_sim, cmap='viridis', alpha=0.7, edgecolors='none', s=80)
    plt.colorbar(scatter, label='Semantic Similarity')

    # Customize axes
    plt.xlabel('Number of Contexts Retrieved', fontsize=12)
    plt.ylabel('Average Retrieval Similarity Score', fontsize=12)
    plt.xticks(range(min(num_contexts), max(num_contexts) + 1))  # Integer ticks only
    plt.ylim(0, max(avg_retrieval_sim) * 1.1)

    # Add grid for readability
    plt.grid(True, linestyle='--', alpha=0.3)

    # Adjust layout to avoid overlap
    plt.tight_layout()

    # Save the plot
    output_path = 'context_utilization_analysis.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Plot saved to {output_path}")

def main():
    # Extract context data
    context_data = extract_context_data(JSON_PATH)
    if not context_data:
        return
    
    # Generate and save the plot
    plot_context_utilization(context_data)

if __name__ == "__main__":
    main()
