# Resumable File Upload System (Redis-Powered)

A robust, high-performance file upload system built with Node.js and Redis. This application leverages chunked streaming to handle large files reliably, allowing users to pause, resume, and recover from network failures without losing progress.

## 🚀 Features

- **Chunked Uploads:** Large files are split into small, manageable pieces (1MB default) on the client side.
- **Redis-Backed Caching:** Every file chunk is cached in Redis, providing extremely low-latency temporary storage.
- **Resumability:** If a connection drops, the system identifies missing chunks and resumes exactly where it left off.
- **Real-time Progress:** Visual feedback with a glassmorphic progress bar and individual chunk markers.
- **Network Failure Simulation:** A built-in feature to test the system's resilience by simulating interruptions.
- **Mock Storage Fallback:** Automatically switches to an in-memory storage if the Redis instance is unavailable.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database (Caching):** Redis (Cloud or Local)
- **Frontend:** Vanilla JavaScript, Semantic HTML5, CSS3 (Glassmorphism)
- **Middlewares:** Multer (Memory Storage), CORS, Dotenv

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- A running Redis instance (Local or Redis Cloud)

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd FileUpload
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   PORT=3000
   REDIS_HOST=your-redis-host
   REDIS_PORT=your-redis-port
   REDIS_PASSWORD=your-redis-password
   REDIS_USERNAME=default
   ```

4. **Start the server:**
   ```bash
   node server.js
   ```

## 🏗️ How It Works

### 1. Initialization (`POST /upload/start`)
The client sends the file name and total size. The server generates a unique `uploadId` and calculates the total number of chunks. This metadata is stored in Redis.

### 2. Chunk Streaming (`POST /upload/chunk`)
The client slices the file into chunks and sends them sequentially. The server receives the binary data via Multer, converts it to base64, and stores it in Redis with the key format `upload:ID:chunk:INDEX`.

### 3. Status Check (`GET /upload/status`)
Before resuming an upload, the client requests the current status. The server checks Redis to see which chunk indices already exist and tells the client which ones to skip.

### 4. Finalization (`POST /upload/finalize`)
Once all chunks are received, the server pulls them from Redis, decodes them, and streams them into a single physical file on the disk using Node.js `fs.createWriteStream`. Finally, it cleans up all temporary data from Redis.

## 📂 Project Structure

```text
FileUpload/
├── controllers/        # Business logic for uploads
├── routes/             # API endpoint definitions
├── services/           # Redis connection and data access
├── config/             # Redis client configuration
├── public/             # Frontend assets (HTML, CSS, JS)
├── uploads/            # Final destination for uploaded files
├── server.js           # Entry point
└── .env                # Secret configuration
```

## 🧪 Testing Resumability

1. Select a large file (e.g., 50MB).
2. Click **Start Upload**.
3. Halfway through, click **Simulate Network Failure**.
4. Refresh the page or wait.
5. Select the **same file** again.
6. Click **Start Upload**. Notice the progress bar jumps immediately to the previous position!
