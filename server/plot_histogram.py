import json
import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import norm
import os

# Define the path to the JSON file
JSON_PATH = "rag_evaluation_results.json"

def extract_semantic_similarity(json_path):
    """Extract semantic similarity scores from the JSON file."""
    try:
        # Read the JSON file
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract semantic_similarity from per_query_results
        similarity_scores = [
            result["semantic_similarity"]
            for result in data["per_query_results"]
            if result["semantic_similarity"] is not None
        ]
        return similarity_scores
    except FileNotFoundError:
        print(f"Error: File {json_path} not found.")
        return []
    except json.JSONDecodeError:
        print("Error: Invalid JSON format.")
        return []
    except KeyError as e:
        print(f"Error: Missing key {e} in JSON structure.")
        return []

def plot_semantic_similarity_histogram(similarity_scores):
    """Generate and save a histogram of semantic similarity scores with a normal distribution curve."""
    # Create figure
    plt.figure(figsize=(8, 6))
    
    # Plot histogram
    plt.hist(similarity_scores, bins=20, density=True, alpha=0.7, color='skyblue', edgecolor='black', label='Similarity Scores')
    
    # Fit normal distribution
    mu, sigma = np.mean(similarity_scores), np.std(similarity_scores)
    x = np.linspace(min(similarity_scores), max(similarity_scores), 100)
    plt.plot(x, norm.pdf(x, mu, sigma), 'r-', lw=2, label=f'Normal Dist. (μ={mu:.3f}, σ={sigma:.3f})')
    
    # Add labels and title
    plt.xlabel('Semantic Similarity Score')
    plt.ylabel('Density')
    plt.title('Distribution of Semantic Similarity Scores for FarmTalk Responses')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Save the figure
    output_path = 'semantic_similarity_histogram.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Image saved to {output_path}")

if __name__ == "__main__":
    # Extract semantic similarity scores
    similarity_scores = extract_semantic_similarity(JSON_PATH)
    
    if similarity_scores:
        # Generate and save the plot
        plot_semantic_similarity_histogram(similarity_scores)
    else:
        print("No valid semantic similarity scores found. Image not generated.")
