
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
     - mostly in kubernates or prod grade application healthcheck api get queued and not responds before timout and get rejected and container or pod gets killed and new one will spawn.

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





To monitor requests at a granular level and detect rejections in your Java Spring Boot application, you can use a combination of **application logs**, **metrics collection**, and **monitoring tools**. Here's how to achieve this:

---

### **1. Application Logs**
#### Log Rejected Requests:
- Enable detailed logging in your application to track rejected or dropped requests.
- Use a **`RejectedExecutionHandler`** if you're using a custom thread pool.

Example for Tomcat thread pool monitoring:
```java
@Bean
public TomcatServletWebServerFactory tomcatServletWebServerFactory() {
    return new TomcatServletWebServerFactory() {
        @Override
        protected void customizeConnector(Connector connector) {
            connector.setAttribute("maxThreads", 200);
            connector.setAttribute("acceptCount", 100);
        }

        @Override
        protected void postProcessContext(Context context) {
            context.getPipeline().addValve(new AccessLogValve() {
                {
                    setPattern("%h %l %u %t \"%r\" %s %b %D");
                    setDirectory("logs");
                    setPrefix("access_log");
                    setSuffix(".log");
                }
            });
        }
    };
}
```

Access logs include:
- **Status Codes**: Look for `429 Too Many Requests` or `503 Service Unavailable`.
- **Response Time**: Helps identify slow responses due to queuing or resource exhaustion.

---

### **2. Metrics Collection**
#### Use Actuator Metrics:
Spring Boot provides **Actuator** to expose detailed metrics about your application.

1. **Enable Actuator** in `application.properties`:
```properties
management.endpoints.web.exposure.include=*
management.endpoint.metrics.enabled=true
management.endpoint.health.enabled=true
```

2. **Monitor Thread Pool Metrics**:
   - Use `tomcat.threads.active`, `tomcat.threads.config.max`, and `tomcat.threads.busy` to monitor thread usage.
   - Example: `/actuator/metrics/tomcat.threads.active`.

3. **Request Metrics**:
   - Use `http.server.requests` to monitor request counts, response status codes, and latencies.
   - Example: `/actuator/metrics/http.server.requests`.

---

### **3. Monitoring Tools**
#### Use External Monitoring Tools for Granular Insights:
1. **Prometheus and Grafana**:
   - **Prometheus**: Collect metrics from Actuator's `/actuator/prometheus` endpoint.
   - **Grafana**: Visualize metrics using Prometheus as a data source.

   Metrics to track:
   - Request counts by status code (`2xx`, `4xx`, `5xx`).
   - Rejected requests (e.g., `503` responses).
   - Thread pool saturation (active vs max threads).

2. **ELK Stack (Elasticsearch, Logstash, Kibana)**:
   - Use **Logstash** to parse logs for rejected requests or specific status codes.
   - Visualize trends in **Kibana** dashboards.

3. **APM Tools**:
   Tools like **New Relic**, **Dynatrace**, or **Datadog** offer deep insights into application performance.
   - Monitor request rejection rates.
   - Get alerts for thread pool saturation or high response times.

---

### **4. Custom Rejection Monitoring**
If you use a custom thread pool or want more granular control, you can implement monitoring directly in your code.

#### Example: Custom Thread Pool with Monitoring
```java
@Bean
public Executor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(10);
    executor.setMaxPoolSize(200);
    executor.setQueueCapacity(1000);
    executor.setThreadNamePrefix("CustomExecutor-");
    executor.setRejectedExecutionHandler((r, e) -> {
        log.error("Request rejected: {}", r.toString());
    });
    return executor;
}
```

#### Expose Metrics:
- Track rejected requests with a counter metric.
- Use libraries like **Micrometer** to expose metrics:
```java
@Autowired
private MeterRegistry meterRegistry;

private Counter rejectedRequests = Counter.builder("custom.executor.rejected")
                                          .description("Number of rejected requests")
                                          .register(meterRegistry);

executor.setRejectedExecutionHandler((r, e) -> {
    rejectedRequests.increment();
    log.error("Request rejected: {}", r.toString());
});
```

---

### **5. Alerts and Notifications**
Set up alerts in your monitoring tool:
- **CPU Usage**: Alert if it exceeds 80%.
- **Thread Pool Saturation**: Alert if `tomcat.threads.active` approaches `tomcat.threads.config.max`.
- **High Response Latency**: Monitor `http.server.requests` for requests taking longer than a threshold.
- **Request Rejection**: Alert on increasing `503` or `429` responses.

---

### **6. Testing for Rejections**
Simulate high load to identify bottlenecks:
- Use tools like **Apache JMeter**, **Gatling**, or **k6** to send 100k requests.
- Monitor system metrics and logs during the test.

---

### **Summary of Steps**
1. Enable **detailed access logs** to detect rejected requests.
2. Use Spring Boot Actuator to expose **thread pool and request metrics**.
3. Integrate with tools like **Prometheus**, **Grafana**, or **APM tools** for granular monitoring.
4. Implement custom rejection logging if needed.
5. Simulate high load and analyze metrics to fine-tune configurations.

This approach ensures you can monitor and act on request rejections effectively.
