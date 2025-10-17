# Poultry-Optimized Backend (app.py)
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document
import re
import base64
import json
import time
import numpy as np
from datetime import datetime
from collections import deque
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
CHROMA_PATH = "chroma"
OPENAI_MODEL = "gpt-4o"  # Using a more available model

# Serve the 'data' folder publicly at /data URL
DATA_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
app.config['DATA_FOLDER'] = DATA_FOLDER


# Global variables for reusing connections
embedding_function = None
llm = None
db = None

# Conversation memory
conversation_memory = {}

# Poultry-specific research metrics tracking
poultry_metrics = {
    "queries": [],
    "retrieval_times": [],
    "similarity_scores": [],
    "poultry_categories": {
        "broilers": 0,
        "layers": 0,
        "breeding": 0,
        "health": 0,
        "nutrition": 0,
        "management": 0,
        "housing": 0,
        "disease": 0,
        "precision": 0,  # Added precision category
        "general": 0
    }
}

# Enhanced Poultry keyword categories for better query classification
POULTRY_KEYWORDS = {
    "broilers": ["broiler", "meat bird", "chicken meat", "broiler chicken", "meat production", "growth rate", "fcr"],
    "layers": ["layer", "laying hen", "egg production", "laying", "egg laying", "laying performance", "egg quality"],
    "breeding": ["breeding", "breeder", "reproduction", "hatchery", "incubation", "fertility", "hatchability"],
    "health": ["health", "veterinary", "treatment", "medicine", "vaccine", "vaccination", "immunity"],
    "nutrition": ["nutrition", "feed", "feeding", "diet", "protein", "energy", "vitamin", "mineral", "supplement"],
    "management": ["management", "farming", "production", "performance", "operation", "system", "practice"],
    "housing": ["housing", "coop", "barn", "ventilation", "lighting", "temperature", "environment", "facility"],
    "disease": ["disease", "illness", "infection", "pathogen", "bacteria", "virus", "parasite", "mortality", "syndrome"],
    # Added precision keywords
    "precision": ["precision", "precision poultry", "smart farming", "iot", "sensors", "automated", "monitoring", "technology", "data-driven"]
}

# Poultry-related terms for context filtering
POULTRY_TERMS = ['poultry', 'chicken', 'broiler', 'layer',
                 'hen', 'rooster', 'bird', 'duck', 'turkey', 'precision', 'describe', 'image']


def initialize_components():
    global embedding_function, llm, db

    try:
        # Initialize embedding function
        embedding_function = OpenAIEmbeddings(
            model="text-embedding-3-small",
            max_retries=2,
            request_timeout=10
        )

        # Initialize LLM with optimized settings for poultry expertise
        llm = ChatOpenAI(
            model=OPENAI_MODEL,
            temperature=0.1,  # Lower temperature for more precise poultry advice
            max_tokens=300,
            max_retries=2,
            request_timeout=15,
            streaming=False
        )

        # Initialize vector database
        if os.path.exists(CHROMA_PATH):
            db = Chroma(
                persist_directory=CHROMA_PATH,
                embedding_function=embedding_function
            )
            print("✅ Poultry knowledge database loaded successfully")
        else:
            print("❌ Warning: Poultry database not found")
            print(
                "Please run 'python populate_database.py' first to create the poultry database")
            db = None

    except Exception as e:
        print(f"❌ Error initializing poultry system components: {e}")


# Initialize components at startup
initialize_components()

# Poultry-optimized prompt templates
POULTRY_CONTEXT_PROMPT_TEMPLATE = """You are a specialized poultry expert assistant. Answer the question based on the provided poultry research context and conversation history. 
Focus specifically on poultry (chickens, ducks, turkeys, etc.) and provide detailed, practical advice for poultry farmers and researchers. IMPORTANT: Keep your answer under 150 words.

Conversation History:
{history}

Relevant Poultry Research Context:
{context}

Question: {question}

Provide a comprehensive answer focusing on:
1. Direct answer to the question
2. Practical applications for poultry farming
3. Scientific backing from the research
4. Any recommendations or best practices

Answer:"""

POULTRY_GENERAL_PROMPT_TEMPLATE = """You are a specialized poultry expert assistant. Answer the user's question about poultry farming, focusing on:
- Chicken production (broilers and layers)
- Poultry health and disease management
- Poultry nutrition and feeding
- Housing and environmental management
- Breeding and genetics
- Production efficiency
- Precision poultry and smart farming technologies

Conversation History:
{history}

Question: {question}

Provide detailed, practical advice for poultry farmers. IMPORTANT: Keep your answer under 150 words."""

POULTRY_IMAGE_PROMPT_TEMPLATE = """You are a poultry expert analyzing this image. Look for:
- Bird species and breed identification
- Health conditions or symptoms
- Housing and facility conditions
- Feed and nutrition aspects
- Management practices
- Any poultry-related equipment or systems

User's question: {question}

Provide a detailed poultry-focused analysis. IMPORTANT: Keep your answer under 150 words."""

POULTRY_GREETING_RESPONSE = """I’m a PoultryTalk AI Assistant. My expertise is limited to poultry-related topics such as precision, nutrition, housing, management, health, and disease prevention. If your question is related to poultry but not clearly stated, please include “poultry” or specify the species/type (e.g., broiler, broiler breeder, laying hen, turkey). Kindly reframe your question within this scope and try again.
Note: To remove this question and answer, choose “Incorrect” and then select “Cancel.”"""

def classify_poultry_query(text):
    """Classify the query into poultry categories for better tracking"""
    text_lower = text.lower()
    categories_found = []

    for category, keywords in POULTRY_KEYWORDS.items():
        if any(keyword in text_lower for keyword in keywords):
            categories_found.append(category)
            poultry_metrics["poultry_categories"][category] += 1

    if not categories_found:
        poultry_metrics["poultry_categories"]["general"] += 1
        categories_found = ["general"]

    return categories_found


def is_poultry_related(text):
    """Check if the query is poultry-related"""
    text_lower = text.lower()
    return any(term in text_lower for term in POULTRY_TERMS)


def is_simple_greeting(text):
    """Check if it's a simple greeting only (not poultry-related)"""
    text_lower = text.lower().strip()

    simple_greetings = {
        'hi', 'hello', 'hey', 'yo', 'hola', 'greetings',
        'good morning', 'good afternoon', 'good evening',
        'bye', 'goodbye', 'see you'
    }

    return (text_lower in simple_greetings or
            any(text_lower.startswith(g) for g in simple_greetings))


def get_poultry_relevant_context(query, k=6, session_id=None):
    """Get relevant poultry context with enhanced filtering and return context details"""
    if not db:
        return [], [], []

    start_time = time.time()

    try:
        # Enhanced query with poultry terms for better retrieval
        enhanced_query = f"poultry chicken {query}"

        # Get similar documents
        results = db.similarity_search_with_score(enhanced_query, k=k)

        # Calculate retrieval time
        retrieval_time = time.time() - start_time
        poultry_metrics["retrieval_times"].append(retrieval_time)

        # Filter by similarity threshold and extract content
        relevant_docs = []
        similarity_scores = []
        context_details = []  # New: store context details for API response

        for doc, score in results:
            # Convert distance to similarity score
            similarity = 1 - score
            similarity_scores.append(similarity)

            # Lowered threshold for better retrieval
            if similarity >= 0.05:  # Reduced from 0.08 to 0.05
                # Prioritize documents with poultry keywords
                content_lower = doc.page_content.lower()
                has_poultry_terms = any(
                    term in content_lower for term in POULTRY_TERMS)

                doc_info = {
                    "content": doc.page_content,
                    "similarity": similarity,
                    "metadata": doc.metadata,
                    "poultry_relevant": has_poultry_terms
                }

                # Store context details for API response
                context_detail = {
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "similarity_score": similarity,
                    # "source": doc.metadata.get('source', 'Unknown'),
                    "source": f"https://api.kapalik.com/data/{os.path.basename(doc.metadata.get('source', 'Unknown'))}",
                    "page": doc.metadata.get('page', 'N/A')
                }

                # Accept documents with reasonable similarity or poultry terms
                if has_poultry_terms or similarity >= 0.1:  # More lenient criteria
                    relevant_docs.append(doc_info)
                    context_details.append(context_detail)

        # Sort by poultry relevance and similarity
        combined = list(zip(relevant_docs, context_details))
        combined.sort(key=lambda x: (
            x[0]["poultry_relevant"], x[0]["similarity"]), reverse=True)
        relevant_docs, context_details = zip(
            *combined) if combined else ([], [])

        relevant_docs = list(relevant_docs)
        context_details = list(context_details)

        # Store metrics for research
        poultry_metrics["similarity_scores"].extend(similarity_scores)

        print(f"Found {len(relevant_docs)} poultry-relevant documents")

        return relevant_docs, similarity_scores, context_details

    except Exception as e:
        print(f"Error retrieving poultry context: {e}")
        return [], [], []


def update_conversation_history(session_id, role, message, image_used=False, query_categories=None):
    """Update conversation history for a session with poultry categories"""
    if session_id not in conversation_memory:
        conversation_memory[session_id] = {
            "history": deque(maxlen=25),
            "created_at": datetime.now().isoformat(),
            "message_count": 0,
            "poultry_categories": set()
        }

    # Add message to history
    conversation_memory[session_id]["history"].append({
        "role": role,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "image_used": image_used,
        "categories": query_categories or []
    })

    # Track categories for this session
    if query_categories:
        conversation_memory[session_id]["poultry_categories"].update(
            query_categories)

    conversation_memory[session_id]["message_count"] += 1


def get_conversation_history(session_id, as_string=True):
    """Retrieve conversation history for a session"""
    if session_id not in conversation_memory:
        return "" if as_string else []

    if as_string:
        history_str = ""
        for msg in conversation_memory[session_id]["history"]:
            role = "Farmer" if msg["role"] == "user" else "Poultry Expert"
            history_str += f"{role}: {msg['message']}\n"
        return history_str
    else:
        return list(conversation_memory[session_id]["history"])


def process_poultry_image_query(image_data, message, session_id=None):
    """Process poultry image query with specialized analysis"""
    try:
        # Enhanced default prompt for poultry images
        if not message or message.strip() == "":
            message = "Analyze this poultry-related image. What can you tell me about the birds, their condition, housing, or any poultry management aspects visible?"

        # Create message with poultry-focused image analysis
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": POULTRY_IMAGE_PROMPT_TEMPLATE.format(
                        question=message)},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}"
                        }
                    }
                ]
            }
        ]

        # Get response from the LLM
        response = llm.invoke(messages)
        return response.content

    except Exception as e:
        print(f"Error processing poultry image: {e}")
        return "I'm sorry, I couldn't process the poultry image. Please try again with a clear image of your birds or facilities."


def generate_poultry_response_with_context(user_message, context_docs, history, session_id):
    """Generate response using poultry context and conversation history"""
    # Prepare context string with emphasis on most relevant documents
    context_str = "\n".join([
        f"[Relevance: {doc['similarity']:.2f}] {doc['content']}"
        for doc in context_docs[:4]  # Top 4 most relevant documents
    ])

    # Create prompt with poultry context and history
    prompt = ChatPromptTemplate.from_template(POULTRY_CONTEXT_PROMPT_TEMPLATE)
    formatted_prompt = prompt.format(
        history=history,
        context=context_str,
        question=user_message
    )

    # Get response from LLM
    response = llm.invoke(formatted_prompt)
    return response.content


def generate_poultry_general_response(user_message, history, session_id):
    """Generate response using general poultry knowledge"""
    # Create prompt with poultry focus
    prompt = ChatPromptTemplate.from_template(POULTRY_GENERAL_PROMPT_TEMPLATE)
    formatted_prompt = prompt.format(
        history=history,
        question=user_message
    )

    # Get response from LLM
    response = llm.invoke(formatted_prompt)
    return response.content


@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Get the user's request
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400

        user_message = data['message'].strip()
        has_image = data.get('image', False)
        image_data = data.get('imageData') if has_image else None
        session_id = data.get('session_id', str(uuid.uuid4()))

        # Classify poultry query categories
        query_categories = classify_poultry_query(user_message)

        # Track query for poultry research
        poultry_metrics["queries"].append({
            "session_id": session_id,
            "message": user_message,
            "has_image": has_image,
            "categories": query_categories,
            "timestamp": datetime.now().isoformat()
        })

        # Update user message in conversation history
        update_conversation_history(
            session_id, "user", user_message, has_image, query_categories)

        # Handle simple greetings
        if is_simple_greeting(user_message):
            response_text = POULTRY_GREETING_RESPONSE
            update_conversation_history(session_id, "assistant", response_text)

            return jsonify({
                'response': response_text,
                'session_id': session_id,
                'has_context': False,
                'context_sources': 0,
                'contexts': [],
                'response_type': 'greeting',
                'poultry_categories': query_categories
            })

        # Check if query is poultry-related
        if not is_poultry_related(user_message):
            response_text = POULTRY_GREETING_RESPONSE
            update_conversation_history(session_id, "assistant", response_text)

            return jsonify({
                'response': response_text,
                'session_id': session_id,
                'has_context': False,
                'context_sources': 0,
                'contexts': [],
                'response_type': 'non_poultry',
                'poultry_categories': query_categories
            })

        # Handle poultry image queries
        if has_image and image_data:
            # Process image with poultry expertise
            ai_response = process_poultry_image_query(
                image_data, user_message, session_id)

            # Get relevant poultry context
            context_docs, similarity_scores, context_details = get_poultry_relevant_context(
                user_message, session_id=session_id)

            # Enhance response with poultry research if available
            if context_docs:
                history = get_conversation_history(session_id)
                enhanced_response = generate_poultry_response_with_context(
                    f"{user_message} Based on the image analysis:",
                    context_docs, history, session_id
                )
                final_response = f"{ai_response}\n\n**Additional Poultry Research Insights:**\n{enhanced_response}"
                response_type = 'image_with_context'
            else:
                final_response = ai_response
                response_type = 'image_chatgpt'

            # Update conversation history
            update_conversation_history(
                session_id, "assistant", final_response)

            return jsonify({
                'response': final_response,
                'session_id': session_id,
                'has_context': len(context_docs) > 0,
                'context_sources': len(context_docs),
                'contexts': context_details,
                'similarity_scores': similarity_scores,
                'response_type': response_type,
                'poultry_categories': query_categories
            })

        # Handle text-based poultry queries
        context_docs, similarity_scores, context_details = get_poultry_relevant_context(
            user_message, session_id=session_id)
        history = get_conversation_history(session_id)

        # Check if this is about conversation history
        history_keywords = ["previous", "before", "earlier",
                            "last message", "what did I say", "what was my"]
        is_about_history = any(keyword in user_message.lower()
                               for keyword in history_keywords)

        # Generate appropriate response
        if is_about_history:
            response_text = generate_poultry_general_response(
                user_message, history, session_id)
            response_type = 'history_chatgpt'
        elif not context_docs:
            # Use general poultry knowledge
            response_text = generate_poultry_general_response(
                user_message, history, session_id)
            response_type = 'chatgpt'
        else:
            # Generate response with poultry research context
            response_text = generate_poultry_response_with_context(
                user_message, context_docs, history, session_id)
            response_type = 'context'

        update_conversation_history(session_id, "assistant", response_text)

        return jsonify({
            'response': response_text,
            'session_id': session_id,
            'has_context': len(context_docs) > 0,
            'context_sources': len(context_docs),
            'contexts': context_details,
            'similarity_scores': similarity_scores,
            'response_type': response_type,
            'poultry_categories': query_categories
        })

    except Exception as e:
        print(f"Error in poultry chat endpoint: {e}")
        return jsonify({'error': 'An error occurred processing your poultry question'}), 500


@app.route('/history/<session_id>', methods=['GET'])
def get_history(session_id):
    """Get conversation history for a session with poultry categories"""
    if session_id not in conversation_memory:
        return jsonify({'error': 'Session not found'}), 404

    return jsonify({
        'session_id': session_id,
        'history': list(conversation_memory[session_id]["history"]),
        'message_count': conversation_memory[session_id]["message_count"],
        'created_at': conversation_memory[session_id]["created_at"],
        'poultry_categories': list(conversation_memory[session_id]["poultry_categories"])
    })


@app.route('/poultry-metrics', methods=['GET'])
def get_poultry_metrics():
    """Get poultry-specific research metrics"""
    return jsonify({
        'query_count': len(poultry_metrics["queries"]),
        'avg_retrieval_time': np.mean(poultry_metrics["retrieval_times"]) if poultry_metrics["retrieval_times"] else 0,
        'avg_similarity_score': np.mean(poultry_metrics["similarity_scores"]) if poultry_metrics["similarity_scores"] else 0,
        'total_sessions': len(conversation_memory),
        'poultry_category_distribution': poultry_metrics["poultry_categories"],
        'most_common_category': max(poultry_metrics["poultry_categories"], key=poultry_metrics["poultry_categories"].get)
    })


@app.route('/session', methods=['POST'])
def create_session():
    """Create a new poultry session"""
    session_id = str(uuid.uuid4())
    conversation_memory[session_id] = {
        "history": deque(maxlen=25),
        "created_at": datetime.now().isoformat(),
        "message_count": 0,
        "poultry_categories": set()
    }

    return jsonify({
        'session_id': session_id,
        'message': 'New poultry consultation session created'
    })

@app.route('/data/<path:filename>')
def serve_data_file(filename):
    return send_from_directory(app.config['DATA_FOLDER'], filename)

if __name__ == '__main__':
    # Startup checks
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY environment variable is not set")
        exit(1)

    print("✅ OpenAI API key found")
    print(f"🐔 Starting Poultry-Specialized RAG API server with {OPENAI_MODEL}")
    print("📚 Available endpoints:")
    print("   POST /chat             - Send a poultry question")
    print("   GET  /history/<id>     - Get conversation history")
    print("   GET  /poultry-metrics  - Get poultry research metrics")
    print("   POST /session          - Create a new poultry session")

    # Run with optimized settings
    app.run(debug=False, host='0.0.0.0', port=8000, threaded=True)
