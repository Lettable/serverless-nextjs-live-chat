# Live Chat Using Server-Sent Events (SSE) with MongoDB Change Streams

This README explains how we implemented a **serverless live chat system** using **Next.js**, **MongoDB Change Streams**, and **Server-Sent Events (SSE)**. The setup allows real-time updates when new messages are inserted into the database, ensuring fast and efficient live communication between clients.

---

## Features of the Implementation

- **Real-Time Updates:** Uses **MongoDB Change Streams** to detect new messages in the database.
- **Server-Sent Events (SSE):** Streams real-time updates to connected clients over HTTP.
- **Stateless Architecture:** No need to manage WebSocket connections or state, making it simpler and cost-effective for serverless environments.
- **Optimized Performance:** SSE minimizes server overhead, as clients control reconnections.
- **Stream Handling:** The implementation efficiently closes streams when clients disconnect.

---

## Implementation Details

### 1. **The Code: A Single API Route**

The implementation is encapsulated in a single file that handles the live chat functionality. Below is the code:

```javascript
import { MongoClient } from "mongodb";
import { connectDB } from "@/utils/config/db";
import Message from "@/utils/model/message";
import { NextResponse } from "next/server";

export async function GET(req) {
  connectDB(); // Connect to the MongoDB database

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Watch the MongoDB collection for changes
      const changeStream = Message.watch();

      // When a new message is inserted
      changeStream.on("change", (change) => {
        if (change.operationType === "insert") {
          const newMessage = change.fullDocument;
          // Format the message as an SSE event
          const messageString = `data: ${JSON.stringify(newMessage)}\n\n`;
          // Enqueue the message into the stream
          controller.enqueue(new TextEncoder().encode(messageString));
        }
      });

      // Handle client disconnections
      req.signal.addEventListener("abort", () => {
        changeStream.close(); // Close the MongoDB change stream
        controller.close(); // Close the SSE stream
      });
    },
  });

  // Return the stream as an SSE response
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

### 2. **How It Works**

1. **Database Connection:**  
   The `connectDB()` function establishes a connection to MongoDB. The `Message` model represents the chat messages collection.

2. **MongoDB Change Streams:**  
   The `Message.watch()` method listens for real-time changes in the `messages` collection. Specifically, it captures **insert operations** (i.e., new chat messages).

3. **Server-Sent Events (SSE):**  
   - A **ReadableStream** is created to send data to connected clients.
   - When a new message is detected in the database, it is sent to the client as an SSE event using the `controller.enqueue()` method.
   - The message is formatted as a string in the format:  
     ```plaintext
     data: { "message": "Hello", "username": "User1" }
     ```

4. **Handling Client Disconnects:**  
   - The `req.signal.addEventListener("abort")` ensures that resources (e.g., change streams and the SSE connection) are closed when the client disconnects.

5. **Response Headers:**  
   The response includes headers specific to SSE:  
   - `Content-Type: text/event-stream` to indicate an SSE stream.
   - `Cache-Control: no-cache` to prevent caching of the stream.
   - `Connection: keep-alive` to keep the connection open.

---

### 3. **Advantages of SSE with MongoDB Change Streams**

- **Scalability:**  
  SSE is ideal for scenarios where the server only needs to push updates to clients. Unlike WebSockets, there’s no need to maintain persistent bi-directional communication, reducing server resource usage.

- **Real-Time Updates:**  
  MongoDB Change Streams enable instant detection of new messages, ensuring the chat remains live and responsive.

- **Simplified Architecture:**  
  The server does not need to handle client state or connection management, as SSE is inherently stateless. Clients automatically handle reconnections if the connection drops.

- **Serverless-Friendly:**  
  This implementation works seamlessly in serverless environments, like **Vercel**, where WebSocket support might be limited.

---

## Setting Up the Project

### 1. **Prerequisites**

- **Next.js:** Ensure your project is using the `app` directory for serverless API routes.
- **MongoDB Atlas:** Use a cloud-hosted MongoDB database for easy scalability and availability.
- **Node.js 18+:** Required for compatibility with the `ReadableStream` API.

---

### 2. **Steps to Implement**

1. **Create the `api/stream-messages` API Route:**  
   Save the provided code as `stream-messages/route.js` in your Next.js `app` directory.

2. **Connect to MongoDB:**  
   Configure the `connectDB()` function to connect to your MongoDB instance. Example:

   ```javascript
   import mongoose from "mongoose";

   const MONGODB_URI = process.env.MONGODB_URI;

   export const connectDB = async () => {
     if (!mongoose.connection.readyState) {
       await mongoose.connect(MONGODB_URI, {
         useNewUrlParser: true,
         useUnifiedTopology: true,
       });
     }
   };
   ```

3. **Define the `Message` Model:**  
   The `Message` schema defines the structure of chat messages:

   ```javascript
   import mongoose from "mongoose";
   
   const messageSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    });
    
    const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
    export default Message;

   ```

4. **Frontend Integration:**  
   Use the EventSource API to listen for live updates:

   ```javascript
   useEffect(() => {
     const eventSource = new EventSource("/api/stream-messages");

     eventSource.onmessage = (event) => {
       const newMessage = JSON.parse(event.data);
       setMessages((prevMessages) => [...prevMessages, newMessage]);
     };

     return () => eventSource.close();
   }, []);
   ```

---

## Testing the Implementation

1. **Run the Server:**  
   Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. **Send a Message:**  
   Use a POST API route or an admin panel to insert new messages into the database.

3. **Verify Real-Time Updates:**  
   Open the chat application in multiple browser windows and ensure new messages appear in real-time.

---

## Final Notes

- **Error Handling:**  
  Implement error handling for database connection failures and unexpected client disconnects.

- **Scaling:**  
  For production, consider using **Redis Pub/Sub** or **Kafka** for message broadcasting if handling a very high number of concurrent users.

This setup provides a lightweight, scalable solution for building real-time applications without the complexity of WebSockets or polling.