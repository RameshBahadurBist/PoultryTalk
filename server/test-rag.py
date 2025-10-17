import os
import json
import time
import pandas as pd
import requests
import numpy as np
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

# Load environment variables (for OpenAI API key)
load_dotenv()

# Configuration
EXCEL_PATH = "poultry_questions_answers.xlsx"  # Path to the Excel file
API_URL = "https://api.kapalik.com/chat"  # RAG API endpoint
OPENAI_MODEL_EMBEDDING = "text-embedding-3-small"  # Embedding model for similarity
OUTPUT_FILE = "rag_evaluation_results.json"  # File to save results

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_embedding(text):
    """Get embedding for a given text using OpenAI."""
    response = client.embeddings.create(
        input=text,
        model=OPENAI_MODEL_EMBEDDING
    )
    return np.array(response.data[0].embedding)


def compute_cosine_similarity(emb1, emb2):
    """Compute cosine similarity between two embeddings."""
    return cosine_similarity([emb1], [emb2])[0][0]


def evaluate_rag():
    """Main function to evaluate the RAG system."""
    # Load the ground-truth data from Excel
    df = pd.read_excel(EXCEL_PATH)
    # Assume columns: 'Question' and 'Answer' (adjust if different)
    questions = df['Question'].tolist()  # Adjust column name if needed
    ground_truths = df['Answer'].tolist()  # Adjust column name if needed

    results = []
    semantic_similarities = []
    retrieval_precisions = []  # Average similarity score from retrieved contexts
    latencies = []

    for idx, (question, ground_truth) in enumerate(zip(questions, ground_truths)):
        print(
            f"Processing question {idx + 1}/{len(questions)}: {question[:50]}...")

        # Prepare payload for API (text query, no image)
        payload = {
            "message": question,
            "image": False
        }

        start_time = time.time()
        try:
            # Send POST request to RAG API
            response = requests.post(API_URL, json=payload)
            response.raise_for_status()
            api_data = response.json()

            generated_answer = api_data.get('response', '')
            contexts = api_data.get('contexts', [])
            similarity_scores = api_data.get('similarity_scores', [])

            # Compute latency
            latency = time.time() - start_time
            latencies.append(latency)

            # Compute semantic similarity if generated_answer is available
            if generated_answer and ground_truth:
                gt_embedding = get_embedding(ground_truth)
                gen_embedding = get_embedding(generated_answer)
                semantic_sim = compute_cosine_similarity(
                    gt_embedding, gen_embedding)
                semantic_similarities.append(semantic_sim)
            else:
                semantic_sim = None

            # Compute retrieval precision as average of similarity_scores (if available)
            if similarity_scores:
                avg_retrieval_sim = np.mean(similarity_scores)
                retrieval_precisions.append(avg_retrieval_sim)
            else:
                avg_retrieval_sim = None

            # Store per-query results
            result = {
                "question": question,
                "ground_truth": ground_truth,
                "generated_answer": generated_answer,
                "semantic_similarity": semantic_sim,
                "latency_seconds": latency,
                "num_contexts": len(contexts),
                "avg_retrieval_similarity": avg_retrieval_sim,
                "similarity_scores": similarity_scores,
                "contexts": contexts
            }
            results.append(result)

        except Exception as e:
            print(f"Error processing question {idx + 1}: {e}")
            results.append({
                "question": question,
                "ground_truth": ground_truth,
                "error": str(e)
            })

        # Add a small delay to avoid rate limiting (adjust as needed)
        time.sleep(1)

    # Compute aggregate metrics
    aggregates = {
        "num_questions": len(questions),
        "avg_semantic_similarity": np.mean(semantic_similarities) if semantic_similarities else None,
        "std_semantic_similarity": np.std(semantic_similarities) if semantic_similarities else None,
        "avg_retrieval_precision": np.mean(retrieval_precisions) if retrieval_precisions else None,
        "std_retrieval_precision": np.std(retrieval_precisions) if retrieval_precisions else None,
        "avg_latency": np.mean(latencies) if latencies else None,
        "std_latency": np.std(latencies) if latencies else None
    }

    # Save full results to JSON file
    output_data = {
        "aggregates": aggregates,
        "per_query_results": results
    }
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=4, ensure_ascii=False)

    print(f"Evaluation complete. Results saved to {OUTPUT_FILE}")
    print("Aggregate Metrics:")
    print(json.dumps(aggregates, indent=4))


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY environment variable is not set.")
    evaluate_rag()
