
## **Multi Treading**

When handling 100k requests with a Java Spring Boot application on a system with **4 CPU cores** and **4GB of RAM**, the performance and resource utilization largely depend on your application's threading model, specifically **`server.tomcat.threads.min`** and **`server.tomcat.threads.max`** in the Tomcat configuration. Here's how this works:

---

### **Key Concepts:**
1. **Tomcat Thread Pool**:
   - **`server.tomcat.threads.min`**: Minimum number of threads kept alive to handle requests.
   - **`server.tomcat.threads.max`**: Maximum number of threads that can handle requests simultaneously.

2. **Request Handling**:
   - Each incoming request is assigned a thread.
   - If your application calls another API internally (blocking I/O), the thread handling the request remains idle until the API response is received.
   - Too many threads can lead to resource contention, while too few threads can cause queuing delays.

---

### **How It Works in This Scenario:**

1. **Handling Requests**:
   - Suppose `server.tomcat.threads.max = 200` (a common default for Tomcat):
     - At most, 200 requests can be handled concurrently.
     - Requests beyond 200 are queued in the request queue.
     - If the queue is full, new requests are rejected or dropped.

2. **Internal API Calls**:
   - If each request involves a blocking call to an external API, the thread stays occupied but idle during the call.
   - High blocking times will reduce the system's ability to handle many concurrent requests.

3. **CPU and RAM Usage**:
   - **CPU**: Threads themselves don't consume much CPU during I/O wait. But high CPU usage might occur due to request processing or API response handling.
   - **RAM**: Each thread consumes stack memory (typically 512KB–1MB). For 200 threads, this could use 100–200MB just for thread stacks, leaving less memory for the heap, caches, and other resources.

---

### **Pros and Cons of Min/Max Thread Configuration**

#### **1. High `maxThreads` (e.g., 500–1000)**
- **Pros**:
  - More concurrent requests handled.
  - Fewer chances of request rejection or queuing delays.
- **Cons**:
  - Higher memory usage: Threads consume stack memory.
  - More context switching: Can degrade CPU performance, especially on a 4-core CPU.
  - Increased GC pressure: Less heap memory available for application logic.

#### **2. Low `maxThreads` (e.g., 50–100)**
- **Pros**:
  - Reduced memory usage per thread.
  - Less context switching, better CPU efficiency.
- **Cons**:
  - Limited concurrent request handling capacity.
  - High queuing delays and potential request rejection under heavy load.

---

### **Optimal Configuration**
1. **Thread Pool Sizing**:
   - Use **`maxThreads` = 4 × Cores** for CPU-intensive tasks (e.g., processing-heavy workloads).
   - Use **`maxThreads` = 50–200** for I/O-bound tasks (like your scenario with API calls).

2. **Asynchronous Programming**:
   - Leverage **non-blocking I/O** with Spring's **WebFlux** or use asynchronous features (`CompletableFuture`, `@Async`).
   - Reduces the need for blocking threads, allowing the system to handle more requests with fewer threads.

3. **Resource Monitoring**:
   - Use tools like **JVisualVM**, **JProfiler**, or **Prometheus** to monitor thread usage, memory, and CPU under load.
   - Tune parameters based on real-world data.

---

### **Recommendations for 100k Requests**
1. **Thread Configuration**:
   - Set `server.tomcat.threads.min = 10` and `server.tomcat.threads.max = 200` initially.
   - Monitor the system under load to adjust further.

2. **Queue Size**:
   - Use `server.tomcat.accept-count` to configure the maximum queue length for incoming requests (e.g., 1000).

3. **Enable Async Processing**:
   - Use non-blocking HTTP clients (e.g., **WebClient** instead of `RestTemplate`).

4. **API Caching**:
   - If possible, cache responses from the internal API to reduce load and response times.

5. **Scaling**:
   - For sustained 100k requests, consider horizontal scaling using **load balancers** and multiple application instances.

---

### **Pros and Cons of the Approach**

#### **Pros**:
- Flexible configuration for different workloads.
- Non-blocking programming reduces thread contention.
- Horizontal scaling can accommodate even higher loads.

#### **Cons**:
- Improper tuning can lead to resource exhaustion or underutilization.
- Asynchronous code can be complex to debug and maintain.
- Memory constraints (4GB RAM) may limit scalability without optimization.

By balancing your thread pool size, adopting asynchronous APIs, and caching where feasible, your Spring Boot application can efficiently handle high request volumes.
