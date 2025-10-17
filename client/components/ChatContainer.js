"use client";
import { useState, useRef, useEffect } from "react";
import {
  FaUser,
  FaPaperPlane,
  FaSeedling,
  FaBars,
  FaTimes,
  FaTractor,
  FaLeaf,
  FaSun,
  FaCloudRain,
  FaPaperclip,
  FaImage,
  FaFilePdf,
  FaFileAlt,
  FaTrash,
  FaMicrophone,
  FaStop,
  FaPlay,
  FaPause,
  FaEye,
  FaBrain,
  FaVolumeUp,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import Image from "next/image";
import Sidebar from "./Sidebar";

const ChatContainer = () => {
  const [user, loading] = useAuthState(auth);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [activeAudio, setActiveAudio] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop any playing audio when component unmounts or voice modal opens
  useEffect(() => {
    return () => {
      if (activeAudio) {
        activeAudio.pause();
      }
    };
  }, [activeAudio]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchChatHistory = async () => {
      const q = query(collection(db, "chats"), where("userId", "==", user.uid));

      const querySnapshot = await getDocs(q);
      const chats = [];
      querySnapshot.forEach((doc) => {
        chats.push({ id: doc.id, ...doc.data() });
      });

      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      setChatHistory(chats);

      if (chats.length > 0) {
        setCurrentChatId(chats[0].id);
        setMessages(chats[0].messages || []);
      } else {
        createNewChat();
      }
    };

    fetchChatHistory();
  }, [user]);

  const createNewChat = async () => {
    if (!user) return;

    const newChat = {
      userId: user.uid,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const docRef = doc(collection(db, "chats"));
      await setDoc(docRef, newChat);

      const newChatWithId = { ...newChat, id: docRef.id };
      setChatHistory([newChatWithId, ...chatHistory]);
      setCurrentChatId(docRef.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const updateChat = async (chatId, updates) => {
    try {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating chat:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessages([]);
      setChatHistory([]);
      setCurrentChatId(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Stop any playing audio
  const stopActiveAudio = () => {
    if (activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
    }
  };

  // File handling functions
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported.`);
        return false;
      }
      return true;
    });

    const newAttachments = await Promise.all(
      validFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        };
      })
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return FaImage;
    if (type === "application/pdf") return FaFilePdf;
    return FaFileAlt;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Enhanced analysis status detection
  const getAnalysisStatus = (attachments) => {
    const hasImages = attachments.some((att) => att.type.startsWith("image/"));
    const hasDocs = attachments.some((att) =>
      ["application/pdf", "text/plain", "text/csv"].includes(att.type)
    );

    const statuses = [];
    if (hasImages) statuses.push("images");
    if (hasDocs) statuses.push("documents");

    if (statuses.length === 0) return "text";
    if (statuses.length === 1) return statuses[0];
    if (statuses.length === 2) return `${statuses[0]} and ${statuses[1]}`;
    return `${statuses.slice(0, -1).join(", ")} and ${
      statuses[statuses.length - 1]
    }`;
  };

  const getAIResponse = async (
    userMessage,
    attachments = [],
    isVoice = false
  ) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage,
          attachments: attachments.map((att) => ({
            id: att.id,
            name: att.name,
            type: att.type,
            size: att.size,
            data: att.data,
          })),
          isVoice, // Include isVoice flag
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.statusText}`);
      }

      const data = await response.json();

      // If there's an audio response, play it automatically
      if (data.audio) {
        try {
          const audio = new Audio(data.audio);
          setActiveAudio(audio);
          audio
            .play()
            .catch((e) => console.log("Audio autoplay prevented:", e));
        } catch (e) {
          console.error("Error playing audio:", e);
        }
      }

      return {
        text: data.answer,
        audio: data.audio || null,
      };
    } catch (error) {
      console.error("Error:", error);
      return {
        text: "I'm having trouble connecting to the knowledge base. Please try again later.",
        audio: null,
      };
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (
      (!inputMessage.trim() && attachments.length === 0) ||
      !currentChatId ||
      isLoading
    )
      return;

    // Stop any playing audio when sending a new message
    stopActiveAudio();

    const userMessage = {
      id: Date.now(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
      attachments: attachments.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        preview: att.type.startsWith("image/") ? att.data : null,
      })),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Store the current attachments for API call
    const currentAttachments = [...attachments];

    // Clear input and attachments
    setInputMessage("");
    setAttachments([]);

    await updateChat(currentChatId, { messages: newMessages });

    if (messages.length === 0) {
      const title =
        inputMessage.length > 50
          ? inputMessage.substring(0, 50) + "..."
          : inputMessage || "New Chat with Attachment";

      await updateChat(currentChatId, { title });
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, title } : chat
        )
      );
    }

    // Set loading state with immediate analysis status
    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(
        inputMessage,
        currentAttachments,
        false
      ); // Pass isVoice: false

      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        audio: aiResponse.audio,
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      await updateChat(currentChatId, { messages: finalMessages });
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice modal functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        // Convert audio to base64 for API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onload = async () => {
          setIsProcessingVoice(true);

          try {
            // Send to voice processing API
            const response = await fetch("/api/voice", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                audio: reader.result.split(",")[1], // Remove data URL prefix
              }),
            });

            if (response.ok) {
              const data = await response.json();
              setVoiceMessage(data.text);
            } else {
              throw new Error("Voice processing failed");
            }
          } catch (error) {
            console.error("Error processing voice:", error);
            setVoiceMessage(
              "Sorry, I couldn't process your voice message. Please try again."
            );
          } finally {
            setIsProcessingVoice(false);
          }
        };

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!voiceMessage.trim()) return;

    // Stop any playing audio when sending a new message
    stopActiveAudio();

    // Close the voice modal
    setIsVoiceModalOpen(false);

    const userMessage = {
      id: Date.now(),
      content: voiceMessage,
      isUser: true,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    await updateChat(currentChatId, { messages: newMessages });

    if (messages.length === 0) {
      const title =
        voiceMessage.length > 50
          ? voiceMessage.substring(0, 50) + "..."
          : voiceMessage;

      await updateChat(currentChatId, { title });
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, title } : chat
        )
      );
    }

    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(voiceMessage, [], true); // Pass isVoice: true

      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        audio: aiResponse.audio,
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      await updateChat(currentChatId, { messages: finalMessages });
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
      setVoiceMessage("");
    }
  };

  const switchToChat = async (chatId) => {
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        setMessages(chatData.messages || []);
        setCurrentChatId(chatId);

        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      }
    } catch (error) {
      console.error("Error switching chat:", error);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await deleteDoc(doc(db, "chats", chatId));

      setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));

      if (currentChatId === chatId) {
        if (chatHistory.length > 1) {
          const remainingChats = chatHistory.filter(
            (chat) => chat.id !== chatId
          );
          switchToChat(remainingChats[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">Loading FarmTalk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
                <FaSeedling className="text-3xl text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                FarmTalk
              </h1>
              <p className="text-gray-600 leading-relaxed">
                Your intelligent farming companion. Get expert advice on crops,
                livestock, and sustainable agriculture practices.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              className="w-full bg-white text-gray-700 border-2 border-gray-200 rounded-xl py-4 px-6 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-3 font-medium shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Sidebar
        user={user}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        setMessages={setMessages}
        handleSignOut={handleSignOut}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        createNewChat={createNewChat}
        switchToChat={switchToChat}
        deleteChat={deleteChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-green-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
              >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <FaSeedling className="text-white text-sm" />
                </div>
                <h1 className="text-xl font-bold text-green-800 hidden sm:block">
                  FarmTalk
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-green-600">
              <FaSun className="text-yellow-500" />
              <FaCloudRain className="text-blue-500" />
              <FaLeaf className="text-green-500" />
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="max-w-2xl w-full text-center">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-6 shadow-lg">
                    <FaSeedling className="text-white text-4xl" />
                  </div>

                  <p className="text-black text-md mb-8">
                    Ask me anything about agriculture, crop management,
                    livestock care, or sustainable farming practices. You can
                    also attach images, documents, or use voice chat!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: FaSeedling,
                      text: "What crops grow best in my climate?",
                      color: "from-green-400 to-green-500",
                    },
                    {
                      icon: FaTractor,
                      text: "How to improve soil fertility naturally?",
                      color: "from-blue-400 to-blue-500",
                    },
                    {
                      icon: FaLeaf,
                      text: "Organic pest control methods",
                      color: "from-yellow-400 to-orange-500",
                    },
                    {
                      icon: FaSun,
                      text: "Best irrigation practices for dry seasons",
                      color: "from-purple-400 to-pink-500",
                    },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(item.text)}
                      className="group bg-white justify-center items-center rounded-xl p-6 border-2 border-green-100 hover:border-green-300 hover:shadow-lg transition-all duration-200 text-left"
                    >
                      <div
                        className={`flex w-full h-10 items-center justify-center rounded-lg mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <div
                          className={`flex justify-center items-center rounded-lg w-10 h-10 bg-gradient-to-r ${item.color}`}
                        >
                          <item.icon className="text-white text-lg" />
                        </div>
                      </div>

                      <p className="text-green-800 text-sm text-center font-medium">
                        {item.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 lg:p-6 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.isUser
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : "bg-gradient-to-r from-green-500 to-green-600"
                    }`}
                  >
                    {message.isUser ? (
                      <FaUser className="text-white text-sm" />
                    ) : (
                      <FaSeedling className="text-white text-sm" />
                    )}
                  </div>

                  {/* Message */}
                  <div
                    className={`flex-1 max-w-3xl ${
                      message.isUser ? "text-right" : ""
                    }`}
                  >
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div
                        className={`mb-2 ${
                          message.isUser ? "flex justify-end" : ""
                        }`}
                      >
                        <div className="flex flex-wrap gap-2 max-w-md">
                          {message.attachments.map((attachment) => {
                            const FileIcon = getFileIcon(attachment.type);
                            return (
                              <div
                                key={attachment.id}
                                className="bg-white border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm"
                              >
                                {attachment.type.startsWith("image/") &&
                                attachment.preview ? (
                                  <img
                                    src={attachment.preview}
                                    alt={attachment.name}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                ) : (
                                  <FileIcon className="text-green-600 text-lg" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-green-800 font-medium truncate">
                                    {attachment.name}
                                  </p>
                                  <p className="text-green-500 text-xs">
                                    {formatFileSize(attachment.size)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div
                      className={`inline-block px-6 py-4 rounded-2xl ${
                        message.isUser
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                          : "bg-white border border-green-100 text-green-900 rounded-bl-md shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>

                      {/* Audio player for AI responses with audio */}
                      {!message.isUser && message.audio && (
                        <div className="mt-3 pt-3 border-t border-green-100">
                          <div className="flex items-center gap-2">
                            <FaVolumeUp className="text-green-600 text-sm" />
                            <audio
                              controls
                              className="h-8 flex-1"
                              onPlay={(e) => setActiveAudio(e.target)}
                              onPause={() => setActiveAudio(null)}
                              onEnded={() => setActiveAudio(null)}
                            >
                              <source src={message.audio} type="audio/mp3" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      className={`mt-2 text-xs text-green-500 ${
                        message.isUser ? "text-right" : ""
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                    <FaSeedling className="text-white text-sm animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-green-100 rounded-2xl rounded-bl-md px-6 py-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                          <span className="text-green-700 font-medium">
                            FarmTalk is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-green-100 p-4 lg:p-6">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => {
                    const FileIcon = getFileIcon(attachment.type);
                    return (
                      <div
                        key={attachment.id}
                        className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm"
                      >
                        {attachment.type.startsWith("image/") ? (
                          <img
                            src={attachment.data}
                            alt={attachment.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <FileIcon className="text-green-600 text-lg" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-green-800 font-medium truncate">
                            {attachment.name}
                          </p>
                          <p className="text-green-500 text-xs">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Ask about farming, crops, livestock, or attach files..."
                className="w-full px-6 py-4 pr-20 bg-green-50 border-2 border-green-200 rounded-2xl focus:outline-none focus:border-green-400 focus:bg-white resize-none text-green-900 placeholder-gray-500 transition-all"
                rows={1}
                style={{
                  minHeight: "56px",
                  maxHeight: "200px",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 200) + "px";
                }}
              />

              {/* File input and send buttons */}
              <div className="absolute right-3 bottom-3 flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.txt,.csv,.xls,.xlsx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-gray-100 text-green-600 rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  <FaPaperclip className="w-4 h-4" />
                </button>

                {/* Voice Chat Button */}
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all duration-200"
                >
                  <FaMicrophone className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={
                    (!inputMessage.trim() && attachments.length === 0) ||
                    isLoading
                  }
                  className="p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-green-500 mt-3 text-center">
              Press Enter to send • Shift + Enter for new line • Attach images,
              PDFs, or documents
            </div>
          </form>
        </div>
      </div>

      {/* Voice Chat Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white flex items-center justify-between">
              <button
                onClick={() => {
                  setIsVoiceModalOpen(false);
                  setVoiceMessage("");
                  setIsRecording(false);
                }}
                className="p-2 hover:bg-green-400 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-lg" />
              </button>
              <h2 className="text-lg font-semibold">Voice Chat</h2>
              <div className="w-10"></div> {/* Spacer for alignment */}
            </div>

            <div className="p-6">
              <div className="mb-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  {isRecording ? (
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <FaMicrophone className="text-white text-xl" />
                    </div>
                  ) : (
                    <FaMicrophone className="text-blue-500 text-3xl" />
                  )}
                </div>
                <p className="text-gray-600">
                  {isRecording
                    ? "Listening... Speak now"
                    : voiceMessage
                    ? "Ready to send your message"
                    : "Click the microphone to start speaking"}
                </p>
              </div>

              {voiceMessage && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800">{voiceMessage}</p>
                </div>
              )}

              {isProcessingVoice && (
                <div className="mb-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">
                    Processing your voice message...
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-4">
                {isRecording ? (
                  <button
                    onClick={stopVoiceRecording}
                    className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <FaStop className="text-xl" />
                  </button>
                ) : (
                  <button
                    onClick={startVoiceRecording}
                    disabled={isProcessingVoice}
                    className="p-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaMicrophone className="text-xl" />
                  </button>
                )}

                {voiceMessage && !isRecording && !isProcessingVoice && (
                  <button
                    onClick={sendVoiceMessage}
                    className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                  >
                    <FaPaperPlane className="text-xl" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
