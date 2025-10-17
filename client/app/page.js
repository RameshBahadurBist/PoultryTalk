// pages/index.js
'use client'
import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function FarmTalk() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('http://localhost:8000/session', {
          method: 'POST'
        });
        const data = await response.json();
        setSessionId(data.session_id);
        
        // Add welcome message
        setMessages([{
          id: Date.now(),
          text: "Hello! I'm FarmTalk Assistant. I can help answer your agricultural questions based on research documents or my general knowledge. How can I assist you today?",
          sender: 'assistant'
        }]);
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };

    initializeSession();
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      image: imagePreview
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Clear input and image
    const currentInput = input;
    setInput('');
    const currentImage = image;
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Prepare form data
      let base64Image = '';
      if (currentImage) {
        base64Image = await convertImageToBase64(currentImage);
      }

      const requestBody = {
        message: currentInput,
        image: !!currentImage,
        imageData: base64Image,
        session_id: sessionId
      };

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.response,
        sender: 'assistant',
        hasContext: data.has_context,
        sources: data.context_sources
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'assistant',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/...;base64, part
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    try {
      const response = await fetch('http://localhost:8000/session', {
        method: 'POST'
      });
      const data = await response.json();
      setSessionId(data.session_id);
      
      // Reset messages with a new welcome
      setMessages([{
        id: Date.now(),
        text: "Hello! I'm FarmTalk Assistant. I've cleared our conversation. How can I help you?",
        sender: 'assistant'
      }]);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Head>
        <title>FarmTalk - Agricultural Assistant</title>
        <meta name="description" content="AI-powered agricultural assistant" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">FarmTalk Assistant</h1>
          </div>
          <button 
            onClick={clearConversation}
            className="bg-green-800 hover:bg-green-900 text-white py-2 px-4 rounded-lg text-sm"
          >
            New Conversation
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Send a message to start a conversation about agriculture</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-4 ${
                      message.sender === 'user'
                        ? 'bg-green-100 text-green-900'
                        : message.isError
                        ? 'bg-red-100 text-red-900'
                        : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    {message.image && (
                      <div className="mb-2">
                        <img
                          src={message.image}
                          alt="Uploaded"
                          className="rounded max-w-full h-auto max-h-40 object-cover"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.hasContext && (
                      <div className="mt-2 text-xs opacity-70">
                        {message.sources > 0
                          ? `Based on ${message.sources} source${message.sources !== 1 ? 's' : ''} from documents`
                          : 'Using general knowledge'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-blue-100 text-blue-900 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-pulse mr-2">
                        <div className="h-2 w-2 bg-blue-900 rounded-full"></div>
                      </div>
                      <div className="animate-pulse mr-2">
                        <div className="h-2 w-2 bg-blue-900 rounded-full"></div>
                      </div>
                      <div className="animate-pulse">
                        <div className="h-2 w-2 bg-blue-900 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded max-w-full h-auto max-h-32 object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="flex">
            <div className="flex-grow flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about crops, livestock, or agricultural practices. You can also upload an image..."
                className="w-full border border-gray-300 rounded-l-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="1"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                id="file-input"
                disabled={isLoading}
              />
              <label
                htmlFor="file-input"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 cursor-pointer border border-gray-300 border-l-0 flex items-center"
                title="Upload image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !image)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-r-lg p-3 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Ask questions about agriculture or upload images of plants, animals, or fields for analysis.
            You can ask about previous conversations too.
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center text-gray-600 text-sm p-4">
        <p>FarmTalk Assistant - Powered by AI and Agricultural Research</p>
      </footer>
    </div>
  );
}