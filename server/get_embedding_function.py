from langchain_community.embeddings.ollama import OllamaEmbeddings
# from langchain_aws import BedrockEmbeddings
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()


def get_embedding_function():
    # Use OpenAI embeddings (recommended for production)
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",  # or "text-embedding-3-large" for better quality
        openai_api_key=os.environ["OPENAI_API_KEY"],
    )

    # Use Ollama for local development (free, runs offline)
    # embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # Use Bedrock only if you have AWS credentials configured
    # embeddings = BedrockEmbeddings(
    #     credentials_profile_name="default",
    #     region_name="us-east-1"
    # )
    return embeddings
