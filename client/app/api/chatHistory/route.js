import { NextResponse } from "next/server";

// In-memory storage for demo purposes
// In production, you would use a database like MongoDB, PostgreSQL, etc.
let chatHistory = [];

export async function GET(request) {
  try {
    // In production, you would:
    // 1. Verify authentication
    // 2. Get user ID from token/session
    // 3. Fetch chat history for that specific user from database

    return NextResponse.json({
      success: true,
      chats: chatHistory.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      ),
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const newChat = await request.json();

    // In production, you would:
    // 1. Verify authentication
    // 2. Get user ID from token/session
    // 3. Validate input data
    // 4. Save to database with user ID

    const chat = {
      ...newChat,
      id: newChat.id || Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    chatHistory.unshift(chat);

    return NextResponse.json({
      success: true,
      chat: chat,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create chat" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const updatedData = await request.json();
    const { id, ...updates } = updatedData;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Verify authentication
    // 2. Check if user owns this chat
    // 3. Update in database

    const chatIndex = chatHistory.findIndex((chat) => chat.id === id);

    if (chatIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    chatHistory[chatIndex] = {
      ...chatHistory[chatIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      chat: chatHistory[chatIndex],
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Verify authentication
    // 2. Check if user owns this chat
    // 3. Delete from database

    const chatIndex = chatHistory.findIndex((chat) => chat.id === id);

    if (chatIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    chatHistory.splice(chatIndex, 1);

    return NextResponse.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
