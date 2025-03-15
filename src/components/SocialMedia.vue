<template>
  <div>
    <button @click="logout" class="logoutButton">登出</button>
    <h1>留言板
    </h1>
    <div>
      <h2><strong>{{ this.userName }}你好！</strong><br>新增你的貼文：</h2>
      <form @submit.prevent="createPost" class="postForm">
        <textarea v-model="newPostContent" placeholder="你在想什麼?" required class="postTextArea"></textarea>
        <button type="submit" class="postButton">發文</button>
      </form>
    </div>

    <div>
      <h2>所有貼文</h2>
      <div v-for="post in posts" :key="post.postId" class="post">
        <div class="post-content">
          <div v-if="post.isEditing">
            <textarea v-model="post.editedContent" class="editTextArea"></textarea>
            <button @click="savePost(post)" class="postButton">儲存變更</button>
            <button @click="cancelEdit(post)" class="cancelButton">取消</button>
          </div>
          <div v-else>
            <p>{{ post.content }}</p>
            <p><strong>{{ post.userName }}</strong> 建立於: {{ post.createdAt }}</p>
            <button v-if="post.userId == this.userId" @click="deletePost(post.postId)"
              class="deleteButton">刪除貼文</button>
            <button v-if="post.userId == this.userId" @click="editPost(post)" class="editButton">編輯</button>
          </div>
          <form @submit.prevent="addComment(post)">
            <input type="text" v-model="post.newCommentContent" placeholder="輸入留言" required class="commentInput">
            <button type="submit" class="commentButton">新增留言</button>
          </form>
          <div v-for="comment in post.comments" :key="comment.commentId" class="comment">
            <div class="comment-content">
              <p>{{ comment.content }}</p>
              <p><strong>{{ comment.userName }}</strong> 回覆於: {{ comment.createdAt }}</p>
              <button v-if="comment.userId == this.userId" @click="deleteComment(post.postId, comment.commentId)"
                class="deleteButton">刪除您的留言</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="chatContainer" :class="{ 'collapsed': isChatCollapsed }">
      <button @click="toggleChat" class="postButton">{{ isChatCollapsed ? '開啟聊天室' : '收起聊天室' }}</button>
      <div v-if="!isChatCollapsed">
        <h2 :style="{ color: socketStatusColor }">{{ socketStatus }}</h2>
        <div id="messages" ref="messages">
          <div v-for="msg in messages" :key="msg.id"
            :class="['message', msg.username === userName ? 'my-message' : 'other-message']">
            <strong>{{ msg.username }}:</strong> {{ msg.message }}
            <div class="timestamp">{{ msg.timestamp }}</div>
          </div>
        </div>
        <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="輸入訊息..."
          :disabled="isInputDisabled">
        <button @click="sendMessage" :disabled="isInputDisabled">傳送訊息</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      newPostContent: '',
      posts: [],
      userId: sessionStorage.getItem('userId'),
      userName: sessionStorage.getItem('userName'),
      isChatCollapsed: true,
      messages: [],
      newMessage: '',
      socket: null,
      socketStatus: '',
      socketStatusColor: 'black',
      isInputDisabled: false,
    };
  },
  created() {
    this.fetchPosts();
    this.connectWebSocket();
  },
  methods: {
    sendRequest(method, url, data = null) {
      const token = sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      return axios({ method, url, headers, data })
        .then(response => response.data)
        .catch(error => { console.error(`Error during ${method} request to ${url}:`, error); throw error; });
    },
    createPost() {
      const newPost = {
        content: this.newPostContent,
        userId: this.userId,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      this.sendRequest('POST', 'http://localhost:8090/api/posts', newPost)
        .then(() => { this.fetchPosts(); this.newPostContent = ''; })
        .catch(error => console.error('Error creating post:', error));
    },
    addComment(post) {
      const newComment = {
        content: post.newCommentContent,
        userId: this.userId,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        postId: post.postId
      };
      this.sendRequest('POST', `http://localhost:8090/api/posts/${post.postId}/comments`, newComment)
        .then(() => { this.fetchPosts(); post.newCommentContent = ''; })
        .catch(error => console.error('Error adding comment:', error));
    },
    deletePost(postId) {
      this.sendRequest('DELETE', `http://localhost:8090/api/posts/${postId}`)
        .then(() => this.fetchPosts())
        .catch(error => console.error('Error deleting post:', error));
    },
    deleteComment(postId, commentId) {
      this.sendRequest('DELETE', `http://localhost:8090/api/posts/${postId}/comments/${commentId}`)
        .then(() => this.fetchPosts())
        .catch(error => console.error('Error deleting comment:', error));
    },
    fetchPosts() {
      this.sendRequest('GET', 'http://localhost:8090/api/posts')
        .then(data => {
          this.posts = data.reverse().map(post => ({
            ...post,
            newCommentContent: '',
            isEditing: false,
            editedContent: post.content
          }));
        })
        .catch(error => console.error('Error fetching posts:', error));
    },
    editPost(post) {
      post.isEditing = true;
    },
    cancelEdit(post) {
      post.isEditing = false;
      post.editedContent = post.content;
    },
    savePost(post) {
      this.sendRequest('PUT', `http://localhost:8090/api/posts/${post.postId}`, {
        postId: post.postId,
        content: post.editedContent,
        userId: post.userId,
        createdAt: post.createdAt
      })
        .then(() => {
          post.content = post.editedContent;
          post.isEditing = false;
        })
        .catch(error => console.error('Error updating post:', error));
    },
    connectWebSocket() {
      const token = sessionStorage.getItem("token");
      const url = `ws://localhost:8090/ws/chat?token=${token}`;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.socketStatus = "✅ 已進入聊天室";
        this.socketStatusColor = "green";
        this.isInputDisabled = false;
      };

      this.socket.onerror = (error) => {
        console.error("❌ WebSocket 連接錯誤:", error);
        this.socketStatus = "⚠️ 聊天室連線失敗";
        this.socketStatusColor = "red";
        this.isInputDisabled = true;
      };

      this.socket.onclose = (event) => {
        console.warn("⚠️ WebSocket 已關閉:", event.code, event.reason);

        const reason = event.reason;

        if (event.code === 1006) {
          this.socketStatus = reason;
        } else if (event.code === 1008) {
          this.socketStatus = reason;
        } else {
          this.socketStatus = reason;
        }

        this.socketStatusColor = "red";
        this.isInputDisabled = true;
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.messages.push({
          username: data.username,
          message: data.message,
          timestamp: new Date().toLocaleTimeString(),
        });
        this.$nextTick(() => {
          if (!this.isChatCollapsed) {
            this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
          }
        });
      };
    },
    toggleChat() {
      this.isChatCollapsed = !this.isChatCollapsed;
    },
    sendMessage() {
      if (this.newMessage.trim() && this.socket.readyState === WebSocket.OPEN) {
        console.log(JSON.stringify({ username: this.userName, message: this.newMessage }));
        this.socket.send(JSON.stringify({ username: this.userName, message: this.newMessage }));
        this.newMessage = '';
      }
    },
    logout() {
      sessionStorage.clear();
      this.$router.push('/');
      window.location.reload();
    }
  }
};
</script>

<style>
body {
  background-color: rgba(203, 232, 241, 0.3);
  /* 淺藍色且透明度高 */
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  /* 設置字體 */
}
</style>

<style scoped>
/* Post 的樣式 */
.post {
  width: 80%;
  /* 使 post 寬度佔螢幕寬度的 80% */
  margin: 0 auto;
  /* 使 post 在螢幕上居中 */
  border: 2px solid #003366;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
}

/* 相鄰 Post 背景顏色不同 */
.post:nth-child(even) {
  background-color: #e9ecef;
  /* 比如淡灰色 */
}

.post:nth-child(odd) {
  background-color: #f9f9f9;
  /* 原本的背景顏色 */
}

/* 其他樣式保持不變 */
.post p {
  margin: 0;
  padding: 5px 0;
  color: #333;
}

.comment {
  margin-left: 20px;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
  padding-left: 10px;
  background-color: #f2f2f2;
  border-left: 3px solid #007bff;
  position: relative;
}

.comment-content,
.post-content {
  position: relative;
}

.comment p {
  margin: 0;
  padding: 3px 0;
  color: #555;
}

form {
  margin-top: 10px;
}

.postButton,
.commentButton,
.deleteButton {
  border-radius: 5px;
  cursor: pointer;
}

.postButton {
  background-color: #2ba33d;
  color: white;
  border: none;
  padding: 8px 15px;
}

.commentButton {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
}

.deleteButton {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
}

.postButton:hover {
  background-color: #2a923d;
}

.commentButton:hover {
  background-color: #0056b3;
}

.deleteButton:hover {
  background-color: #c82333;
}

textarea,
input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-top: 5px;
  box-sizing: border-box;
}

#chatContainer {
  position: fixed;
  right: 10px;
  bottom: 10px;
  width: 300px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

#messages {
  border: 1px solid #ccc;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  background-color: #fafafa;
  /* Adding a background color */
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  /* Optional: to add some shadow */
}

.message {
  padding: 8px 12px;
  margin: 5px;
  border-radius: 8px;
  max-width: 70%;
  word-wrap: break-word;
  font-size: 16px;
  /* Make the font size uniform */
  background-color: #ffffff;
  /* Ensure message bubbles are readable */
}

.my-message {
  background-color: #007bff;
  color: white;
  align-self: flex-end;
  text-align: right;
}

.other-message {
  background-color: #f1f1f1;
  color: black;
  align-self: flex-start;
  text-align: left;
}

.timestamp {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
  /* Align the timestamp on the right side */
}

@media (max-width: 600px) {
  #messages {
    height: 200px;
  }

  .message {
    font-size: 14px;
  }

  .timestamp {
    font-size: 10px;
    /* Adjust timestamp font size for smaller screens */
  }
}

.logoutButton {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.logoutButton:hover {
  background-color: #c82333;
}

.post {
  width: 80%;
  margin: 0 auto;
  border: 2px solid #003366;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.post p {
  margin: 0;
  padding: 5px 0;
  color: #333;
}

.editButton,
.saveButton,
.cancelButton,
.deleteButton {
  margin-top: 10px;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.editButton {
  position: absolute;
  top: 10px;
  right: 100px;
  /* 保持與刪除按鈕不重疊 */
  background-color: #ffc107;
  color: black;
  padding: 6px 12px;
  /* 更小的內邊距，縮小按鈕 */
  border: none;
  border-radius: 20px;
  /* 使按鈕更圓 */
  cursor: pointer;
  font-size: 14px;
  /* 調整字型大小 */
}

.editButton:hover {
  background-color: #e0a800;
}

.saveButton {
  background-color: #28a745;
  color: white;
}

.cancelButton {
  background-color: #6c757d;
  color: white;
}

.deleteButton {
  background-color: #dc3545;
  color: white;
}
</style>
