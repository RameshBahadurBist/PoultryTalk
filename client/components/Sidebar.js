"use client";
import { useState, useEffect } from "react";
import { 
  FaUser, 
  FaSeedling, 
  FaTrash, 
  FaSearch, 
  FaTimes, 
  FaPlus,
  FaTractor,
  FaLeaf,
  FaSignOutAlt,
  FaEnvelope
} from "react-icons/fa";
import { BiCollapse, BiExpand } from "react-icons/bi";
import Image from "next/image";

const Sidebar = ({
  user,
  chatHistory,
  setChatHistory,
  currentChatId,
  setCurrentChatId,
  setMessages,
  handleSignOut,
  sidebarOpen,
  setSidebarOpen,
  createNewChat,
  switchToChat,
  deleteChat,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChats, setFilteredChats] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    if (chatHistory.length <= 1) return;
    deleteChat(chatId);
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/chatHistory");
        if (response.ok) {
          const data = await response.json();
          setChatHistory(data.chats || []);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [user, setChatHistory]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredChats(chatHistory);
    } else {
      const filtered = chatHistory.filter((chat) =>
        chat.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [searchTerm, chatHistory]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setSearchOpen(false);
    setSearchTerm("");
    setProfileMenuOpen(false);
  };

  const toggleSearch = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setSearchTerm("");
    }
    setProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isCollapsed ? "w-20" : "w-80"
        } bg-white border-r border-green-200 shadow-lg`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center justify-between">
              {!isCollapsed ? (
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <FaSeedling className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">FarmTalk</h1>
                    <p className="text-green-100 text-xs">Agricultural Assistant</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg mx-auto shadow-sm">
                  <FaSeedling className="text-green-600 text-xl" />
                </div>
              )}

              {!isCollapsed && (
                <button
                  onClick={toggleCollapse}
                  className="p-2 hover:bg-green-400 rounded-lg transition-colors text-white"
                  title="Collapse sidebar"
                >
                  <BiCollapse className="text-xl" />
                </button>
              )}
            </div>

            {isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="w-full p-2 mt-4 hover:bg-green-400 rounded-lg transition-colors text-white"
                title="Expand sidebar"
              >
                <BiExpand className="text-xl" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-2">
            {/* New Chat Button */}
            <button
              onClick={createNewChat}
              className={`w-full flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-200 border border-green-200 ${
                isCollapsed ? "justify-center" : ""
              }`}
              title={isCollapsed ? "New Chat" : ""}
            >
              <FaPlus className="text-gray-600" />
              {!isCollapsed && (
                <span className="text-gray-800 font-medium">Start New Chat</span>
              )}
            </button>

            {/* Search Button */}
            <button
              onClick={toggleSearch}
              className={`w-full flex items-center gap-3 p-3 hover:bg-green-50 rounded-xl transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${searchOpen ? "bg-green-50 border border-green-200" : ""}`}
              title={isCollapsed ? "Search Chats" : ""}
            >
              <FaSearch className="text-black" />
              {!isCollapsed && (
                <span className="text-black font-medium">Search Conversations</span>
              )}
            </button>

            {/* Search Input */}
            {searchOpen && !isCollapsed && (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your farming questions..."
                  className="w-full p-3 pl-10 bg-green-50 border border-green-200 rounded-xl text-green-800 placeholder-green-500 focus:outline-none focus:border-green-400 focus:bg-white transition-all"
                  autoFocus
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4">
            {!isCollapsed && (
              <div className="flex items-center gap-2 mb-4 px-2">
                <h3 className="text-sm font-semibold text-black tracking-wide">
                  {searchTerm
                    ? `Search Results (${filteredChats.length})`
                    : "Recent Conversations"}
                </h3>
              </div>
            )}

            <div className="space-y-2">
              {filteredChats
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => switchToChat(chat.id)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      currentChatId === chat.id
                        ? "bg-gradient-to-r from-green-100 to-green-200 border border-green-300 shadow-sm"
                        : "hover:bg-green-50 border border-transparent hover:border-green-200"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? chat.title : ""}
                  >
                    {isCollapsed ? (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    ) : (
                      <>
                        <div className="flex justify-center items-center gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <FaLeaf className="text-white text-xs" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-green-800 font-medium text-sm truncate leading-relaxed">
                              {chat.title}
                            </p>
                            <p className="text-gray-400 font-semibold text-xs">
                              {new Date(chat.updatedAt?.toDate ? chat.updatedAt.toDate() : chat.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {chatHistory.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="absolute cursor-pointer top-4.5 right-2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all text-red-400 hover:text-red-600"
                            title="Delete conversation"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}

              {filteredChats.length === 0 && searchTerm && !isCollapsed && (
                <div className="text-center py-8">
                  <FaSearch className="text-green-300 text-2xl mx-auto mb-3" />
                  <p className="text-green-500 text-sm">
                    No conversations found for &quot;{searchTerm}&quot;
                  </p>
                  <p className="text-green-400 text-xs mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-200 bg-green-25">
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors ${
                  isCollapsed ? "justify-center" : ""
                } ${profileMenuOpen ? "bg-green-50 border border-green-200" : ""}`}
              >
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Profile"
                    width={36}
                    height={36}
                    className="rounded-full border-2 border-green-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 border-2 border-green-200">
                    <FaUser className="text-white text-sm" />
                  </div>
                )}
                
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-green-800 truncate">
                      {user?.displayName || "Farmer"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </button>

              {/* Profile Menu Dropdown */}
              {profileMenuOpen && !isCollapsed && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      console.log("Contact us clicked");
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-green-700 hover:text-green-800 hover:bg-green-50 transition-colors flex items-center gap-3"
                  >
                    <FaEnvelope className="text-green-500" />
                    Contact Support
                  </button>
                  <div className="border-t border-green-100"></div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <FaSignOutAlt className="text-red-500" />
                    Sign Out
                  </button>
                </div>
              )}

              {/* Collapsed Profile Menu */}
              {profileMenuOpen && isCollapsed && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden whitespace-nowrap">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      console.log("Contact us clicked");
                    }}
                    className="block px-4 py-3 text-sm text-green-700 hover:text-green-800 hover:bg-green-50 transition-colors"
                    title="Contact Support"
                  >
                    Contact Support
                  </button>
                  <div className="border-t border-green-100"></div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setProfileMenuOpen(false);
                    }}
                    className="block px-4 py-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;