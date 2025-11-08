// // ============================================
// // Chat System - Complete Testing Suite
// // test-chat-system.ts
// // ============================================

// import io, { Socket } from 'socket.io-client';
// import axios from 'axios';

// // Configuration
// const API_BASE = 'http://localhost:3000';
// const SOCKET_URL = 'http://localhost:3000/chat';
// const AUTH_TOKEN = 'your-jwt-token-here';

// // Test utilities
// class ChatSystemTester {
//   private socket: Socket;
//   private userId: number;
//   private organizationId: number;
//   private testChannelId: number;

//   constructor() {
//     this.setupAxios();
//   }

//   private setupAxios() {
//     axios.defaults.baseURL = API_BASE;
//     axios.defaults.headers.common['Authorization'] = `Bearer ${AUTH_TOKEN}`;
//   }

//   // ==================== SETUP ====================

//   async connectWebSocket(): Promise<void> {
//     return new Promise((resolve, reject) => {
//       this.socket = io(SOCKET_URL, {
//         auth: { token: AUTH_TOKEN },
//         transports: ['websocket']
//       });

//       this.socket.on('connected', (data) => {
//         console.log('✅ WebSocket Connected:', data);
//         this.userId = parseInt(data.userId);
//         this.organizationId = parseInt(data.organizationId);
//         resolve();
//       });

//       this.socket.on('error', (error) => {
//         console.error('❌ WebSocket Error:', error);
//         reject(error);
//       });

//       this.socket.on('connect_error', (error) => {
//         console.error('❌ Connection Error:', error);
//         reject(error);
//       });

//       // Setup event listeners
//       this.setupEventListeners();
//     });
//   }

//   private setupEventListeners() {
//     this.socket.on('new_message', (data) => {
//       console.log('📨 New Message:', data);
//     });

//     this.socket.on('message_edited', (data) => {
//       console.log('✏️  Message Edited:', data);
//     });

//     this.socket.on('message_deleted', (data) => {
//       console.log('🗑️  Message Deleted:', data);
//     });

//     this.socket.on('message_reaction', (data) => {
//       console.log('👍 Reaction:', data);
//     });

//     this.socket.on('user_typing', (data) => {
//       console.log('⌨️  Typing:', data);
//     });

//     this.socket.on('user_status_changed', (data) => {
//       console.log('🟢 Status Changed:', data);
//     });

//     this.socket.on('mentioned', (data) => {
//       console.log('@ Mentioned:', data);
//     });
//   }

//   disconnect() {
//     if (this.socket) {
//       this.socket.disconnect();
//       console.log('🔌 Disconnected');
//     }
//   }

//   // ==================== CHANNEL TESTS ====================

//   async testCreateChannel(): Promise<number> {
//     console.log('\n🧪 Testing: Create Channel');
    
//     try {
//       const response = await axios.post('/chat/channels/create', {
//         name: `Test Channel ${Date.now()}`,
//         description: 'Test channel for automated testing',
//         channelType: 'group',
//         isPrivate: false,
//         memberIds: []
//       });

//       this.testChannelId = response.data.id;
//       console.log('✅ Channel Created:', response.data);
//       return this.testChannelId;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testGetChannels() {
//     console.log('\n🧪 Testing: Get Channels');
    
//     try {
//       const response = await axios.post('/chat/channels/list', {
//         limit: 10,
//         offset: 0
//       });

//       console.log(`✅ Found ${response.data.length} channels`);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testUpdateChannel() {
//     console.log('\n🧪 Testing: Update Channel');
    
//     try {
//       const response = await axios.post('/chat/channels/update', {
//         channelId: this.testChannelId.toString(),
//         name: 'Updated Test Channel',
//         description: 'Updated description'
//       });

//       console.log('✅ Channel Updated:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testAddMembers(userIds: number[]) {
//     console.log('\n🧪 Testing: Add Members');
    
//     try {
//       const response = await axios.post('/chat/channels/members/add', {
//         channelId: this.testChannelId.toString(),
//         userIds: userIds.map(id => id.toString()),
//         role: 'member'
//       });

//       console.log('✅ Members Added:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testGetMembers() {
//     console.log('\n🧪 Testing: Get Members');
    
//     try {
//       const response = await axios.post('/chat/channels/members/list', {
//         channelId: this.testChannelId
//       });

//       console.log(`✅ Found ${response.data.length} members`);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== MESSAGE TESTS ====================

//   async testSendMessageHTTP(): Promise<number> {
//     console.log('\n🧪 Testing: Send Message (HTTP)');
    
//     try {
//       const response = await axios.post('/chat/messages/send', {
//         channelId: this.testChannelId,
//         content: 'Test message via HTTP',
//         messageType: 'text'
//       });

//       console.log('✅ Message Sent:', response.data);
//       return response.data.id;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testSendMessageWebSocket(): Promise<void> {
//     console.log('\n🧪 Testing: Send Message (WebSocket)');
    
//     return new Promise((resolve, reject) => {
//       this.socket.emit('send_message', {
//         channelId: this.testChannelId,
//         content: 'Test message via WebSocket',
//         messageType: 'text'
//       }, (response) => {
//         if (response.success) {
//           console.log('✅ Message Sent:', response.message);
//           resolve();
//         } else {
//           console.error('❌ Failed:', response.error);
//           reject(response.error);
//         }
//       });
//     });
//   }

//   async testGetMessages() {
//     console.log('\n🧪 Testing: Get Messages');
    
//     try {
//       const response = await axios.post('/chat/messages/list', {
//         channelId: this.testChannelId.toString(),
//         limit: 50,
//         offset: 0
//       });

//       console.log(`✅ Found ${response.data.length} messages`);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testEditMessage(messageId: number) {
//     console.log('\n🧪 Testing: Edit Message');
    
//     try {
//       const response = await axios.post('/chat/messages/edit', {
//         messageId: messageId.toString(),
//         content: 'Edited message content'
//       });

//       console.log('✅ Message Edited:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testDeleteMessage(messageId: number) {
//     console.log('\n🧪 Testing: Delete Message');
    
//     try {
//       const response = await axios.post('/chat/messages/delete', {
//         messageId: messageId,
//         hardDelete: false
//       });

//       console.log('✅ Message Deleted:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testReactToMessage(messageId: number) {
//     console.log('\n🧪 Testing: React to Message');
    
//     try {
//       const response = await axios.post('/chat/messages/reactions/add', {
//         messageId: messageId.toString(),
//         emoji: '👍'
//       });

//       console.log('✅ Reaction Added:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testPinMessage(messageId: number) {
//     console.log('\n🧪 Testing: Pin Message');
    
//     try {
//       const response = await axios.post('/chat/messages/pin', {
//         messageId: messageId.toString(),
//         isPinned: true
//       });

//       console.log('✅ Message Pinned:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== TYPING INDICATOR TESTS ====================

//   async testTypingIndicator() {
//     console.log('\n🧪 Testing: Typing Indicator');
    
//     // Join channel first
//     this.socket.emit('join_channel', { channelId: this.testChannelId });
    
//     // Start typing
//     this.socket.emit('typing_start', { channelId: this.testChannelId });
//     console.log('✅ Typing Started');
    
//     // Wait 2 seconds
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // Stop typing
//     this.socket.emit('typing_stop', { channelId: this.testChannelId });
//     console.log('✅ Typing Stopped');
//   }

//   // ==================== READ RECEIPT TESTS ====================

//   async testMarkAsRead(messageId: number) {
//     console.log('\n🧪 Testing: Mark as Read');
    
//     try {
//       const response = await axios.post('/chat/mark-read', {
//         channelId: this.testChannelId,
//         messageId: messageId
//       });

//       console.log('✅ Marked as Read:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testGetUnreadCount() {
//     console.log('\n🧪 Testing: Get Unread Count');
    
//     try {
//       const response = await axios.post('/chat/unread/count');

//       console.log('✅ Unread Count:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== SEARCH TESTS ====================

//   async testSearchMessages() {
//     console.log('\n🧪 Testing: Search Messages');
    
//     try {
//       const response = await axios.post('/chat/search', {
//         query: 'test',
//         channelId: this.testChannelId,
//         limit: 10,
//         offset: 0
//       });

//       console.log(`✅ Found ${response.data.length} results`);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== PRESENCE TESTS ====================

//   async testUpdatePresence() {
//     console.log('\n🧪 Testing: Update Presence');
    
//     try {
//       const response = await axios.post('/chat/presence/update', {
//         status: 'away'
//       });

//       console.log('✅ Presence Updated:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testGetOnlineUsers() {
//     console.log('\n🧪 Testing: Get Online Users');
    
//     try {
//       const response = await axios.get('/chat/presence/online');

//       console.log(`✅ Found ${response.data.length} online users`);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== CHANNEL SETTINGS TESTS ====================

//   async testGetChannelSettings() {
//     console.log('\n🧪 Testing: Get Channel Settings');
    
//     try {
//       const response = await axios.post('/chat/channels/settings/get', {
//         channelId: this.testChannelId
//       });

//       console.log('✅ Settings Retrieved:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   async testUpdateChannelSettings() {
//     console.log('\n🧪 Testing: Update Channel Settings');
    
//     try {
//       const response = await axios.post('/chat/channels/settings/update', {
//         channelId: this.testChannelId,
//         settings: {
//           allowReactions: true,
//           allowThreads: true,
//           maxMessageLength: 5000
//         }
//       });

//       console.log('✅ Settings Updated:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Failed:', error.response?.data || error.message);
//       throw error;
//     }
//   }

//   // ==================== CLEANUP ====================

//   async cleanup() {
//     console.log('\n🧹 Cleaning up...');
    
//     try {
//       // Archive test channel
//       await axios.post('/chat/channels/archive', {
//         channelId: this.testChannelId.toString(),
//         isArchived: true
//       });
//       console.log('✅ Test channel archived');
//     } catch (error) {
//       console.error('⚠️ Cleanup warning:', error.message);
//     }

//     this.disconnect();
//   }
// }

// // ==================== RUN ALL TESTS ====================

// async function runAllTests() {
//   const tester = new ChatSystemTester();
//   let messageId: number;

//   try {
//     console.log('🚀 Starting Chat System Tests...\n');

//     // Connect
//     await tester.connectWebSocket();
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     // Channel tests
//     await tester.testCreateChannel();
//     await tester.testGetChannels();
//     await tester.testUpdateChannel();
    
//     // Member tests (replace with real user IDs)
//     // await tester.testAddMembers([2, 3]);
//     await tester.testGetMembers();

//     // Message tests
//     messageId = await tester.testSendMessageHTTP();
//     await tester.testSendMessageWebSocket();
//     await tester.testGetMessages();
//     await tester.testEditMessage(messageId);
//     await tester.testReactToMessage(messageId);
//     await tester.testPinMessage(messageId);

//     // Typing indicator
//     await tester.testTypingIndicator();

//     // Read receipts
//     await tester.testMarkAsRead(messageId);
//     await tester.testGetUnreadCount();

//     // Search
//     await tester.testSearchMessages();

//     // Presence
//     await tester.testUpdatePresence();
//     await tester.testGetOnlineUsers();

//     // Settings
//     await tester.testGetChannelSettings();
//     await tester.testUpdateChannelSettings();

//     // Cleanup
//     await tester.cleanup();

//     console.log('\n✅ All tests completed successfully!');
//     process.exit(0);

//   } catch (error) {
//     console.error('\n❌ Test suite failed:', error);
//     await tester.cleanup();
//     process.exit(1);
//   }
// }

// // Run if executed directly
// if (require.main === module) {
//   runAllTests();
// }

// export { ChatSystemTester, runAllTests };