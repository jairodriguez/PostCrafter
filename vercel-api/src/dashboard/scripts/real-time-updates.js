/**
 * Real-Time Updates System
 * 
 * Handles real-time data updates for the PostCrafter dashboard using
 * WebSocket connections, Server-Sent Events, and intelligent polling.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

class RealTimeUpdatesManager {
  constructor() {
    this.isConnected = false;
    this.websocket = null;
    this.eventSource = null;
    this.pollingInterval = null;
    this.connectionType = 'polling'; // 'websocket', 'sse', 'polling'
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
    this.subscribers = new Map();
    this.lastDataUpdate = null;
    this.connectionStatus = 'disconnected';
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    this.config = {
      websocketUrl: this.getWebSocketUrl(),
      sseUrl: '/api/realtime/stream',
      pollingInterval: 30000, // 30 seconds
      heartbeatInterval: 30000, // 30 seconds
      reconnectDelay: 5000, // 5 seconds
      maxReconnectDelay: 60000, // 1 minute
      enableAutoReconnect: true
    };

    this.initializeConnection();
  }

  /**
   * Get WebSocket URL based on current environment
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/realtime`;
  }

  /**
   * Initialize real-time connection
   */
  async initializeConnection() {
    console.log('🔄 Initializing real-time connection...');
    
    try {
      // Try WebSocket first
      if (await this.tryWebSocketConnection()) {
        this.connectionType = 'websocket';
        console.log('✅ WebSocket connection established');
      } 
      // Fallback to Server-Sent Events
      else if (await this.tryServerSentEventsConnection()) {
        this.connectionType = 'sse';
        console.log('✅ Server-Sent Events connection established');
      } 
      // Fallback to polling
      else {
        this.connectionType = 'polling';
        this.startPolling();
        console.log('✅ Polling mode activated');
      }

      this.isConnected = true;
      this.connectionStatus = 'connected';
      this.updateConnectionStatus();
      this.startHeartbeat();
      this.notifyConnectionChange('connected');

    } catch (error) {
      console.error('❌ Failed to establish real-time connection:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Try to establish WebSocket connection
   */
  async tryWebSocketConnection() {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.websocketUrl);
        
        const timeout = setTimeout(() => {
          this.websocket.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket connected');
          this.setupWebSocketHandlers();
          resolve(true);
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('WebSocket connection failed:', error);
          reject(error);
        };

        this.websocket.onclose = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection closed'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeData(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      this.handleDisconnection();
    };

    this.websocket.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
      this.handleConnectionError(error);
    };

    // Send initial subscription message
    this.sendWebSocketMessage({
      type: 'subscribe',
      channels: ['metrics', 'activity', 'alerts']
    });
  }

  /**
   * Send message via WebSocket
   */
  sendWebSocketMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Try to establish Server-Sent Events connection
   */
  async tryServerSentEventsConnection() {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.config.sseUrl);
        
        const timeout = setTimeout(() => {
          this.eventSource.close();
          reject(new Error('SSE connection timeout'));
        }, 5000);

        this.eventSource.onopen = () => {
          clearTimeout(timeout);
          console.log('📡 Server-Sent Events connected');
          this.setupSSEHandlers();
          resolve(true);
        };

        this.eventSource.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('SSE connection failed:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up Server-Sent Events handlers
   */
  setupSSEHandlers() {
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeData(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.addEventListener('metrics', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeData({ type: 'metrics', data });
      } catch (error) {
        console.error('Error parsing SSE metrics:', error);
      }
    });

    this.eventSource.addEventListener('activity', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeData({ type: 'activity', data });
      } catch (error) {
        console.error('Error parsing SSE activity:', error);
      }
    });

    this.eventSource.addEventListener('alert', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeData({ type: 'alert', data });
      } catch (error) {
        console.error('Error parsing SSE alert:', error);
      }
    });

    this.eventSource.onerror = (error) => {
      console.error('📡 SSE error:', error);
      this.handleConnectionError(error);
    };
  }

  /**
   * Start polling mechanism
   */
  startPolling() {
    console.log('🔄 Starting polling mode');
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.config.pollingInterval);

    // Initial poll
    this.pollForUpdates();
  }

  /**
   * Poll for data updates
   */
  async pollForUpdates() {
    try {
      const response = await fetch('/api/realtime/poll', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Last-Update': this.lastDataUpdate || new Date(0).toISOString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updates && data.updates.length > 0) {
          data.updates.forEach(update => this.handleRealtimeData(update));
        }
        this.lastDataUpdate = data.timestamp || new Date().toISOString();
      }
    } catch (error) {
      console.error('Polling request failed:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Handle real-time data updates
   */
  handleRealtimeData(data) {
    console.log('📊 Received real-time data:', data.type);
    
    try {
      // Update last data timestamp
      this.lastDataUpdate = data.timestamp || new Date().toISOString();

      // Notify subscribers based on data type
      switch (data.type) {
        case 'metrics':
          this.notifySubscribers('metrics', data.data);
          break;
        case 'activity':
          this.notifySubscribers('activity', data.data);
          break;
        case 'alert':
          this.notifySubscribers('alert', data.data);
          break;
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
        default:
          this.notifySubscribers('data', data);
      }

      // Update connection status UI
      this.updateLastUpdateTime();

    } catch (error) {
      console.error('Error handling real-time data:', error);
    }
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat(data) {
    console.log('💓 Heartbeat received');
    this.connectionStatus = 'connected';
    this.updateConnectionStatus();
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionType === 'websocket' && this.websocket) {
        this.sendWebSocketMessage({ type: 'ping' });
      } else if (this.connectionType === 'polling') {
        // For polling, we check the connection status
        this.checkConnectionHealth();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth() {
    try {
      const response = await fetch('/api/health', { method: 'HEAD' });
      if (response.ok) {
        this.connectionStatus = 'connected';
      } else {
        this.connectionStatus = 'degraded';
      }
    } catch (error) {
      this.connectionStatus = 'disconnected';
    }
    this.updateConnectionStatus();
  }

  /**
   * Handle connection disconnection
   */
  handleDisconnection() {
    console.log('🔌 Connection lost');
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatus();
    this.notifyConnectionChange('disconnected');

    if (this.config.enableAutoReconnect) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    console.error('Connection error:', error);
    this.connectionRetries++;
    
    if (this.connectionRetries >= this.maxRetries) {
      console.error('Max connection retries reached');
      this.connectionStatus = 'failed';
      this.updateConnectionStatus();
      return;
    }

    // Exponential backoff for reconnection
    const delay = Math.min(
      this.retryDelay * Math.pow(2, this.connectionRetries),
      this.config.maxReconnectDelay
    );

    setTimeout(() => {
      this.initializeConnection();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatus = 'reconnecting';
    this.updateConnectionStatus();

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.initializeConnection();
    }, this.config.reconnectDelay);
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);

    console.log(`📡 Subscribed to ${type} updates`);
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(type, callback) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).delete(callback);
    }
  }

  /**
   * Notify subscribers of data updates
   */
  notifySubscribers(type, data) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * Notify connection status change
   */
  notifyConnectionChange(status) {
    const event = new CustomEvent('realtimeConnectionChange', {
      detail: { status, type: this.connectionType }
    });
    window.dispatchEvent(event);
  }

  /**
   * Update connection status in UI
   */
  updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    const statusDot = statusElement?.querySelector('.status-dot');
    const statusText = statusElement?.querySelector('.status-text');

    if (statusDot && statusText) {
      // Remove all status classes
      statusDot.classList.remove('status-connected', 'status-disconnected', 'status-warning', 'status-reconnecting');
      
      switch (this.connectionStatus) {
        case 'connected':
          statusDot.classList.add('status-connected');
          statusText.textContent = 'Connected';
          break;
        case 'disconnected':
          statusDot.classList.add('status-disconnected');
          statusText.textContent = 'Disconnected';
          break;
        case 'reconnecting':
          statusDot.classList.add('status-warning');
          statusText.textContent = 'Reconnecting...';
          break;
        case 'degraded':
          statusDot.classList.add('status-warning');
          statusText.textContent = 'Degraded';
          break;
        case 'failed':
          statusDot.classList.add('status-disconnected');
          statusText.textContent = 'Connection Failed';
          break;
      }
    }
  }

  /**
   * Update last update time in UI
   */
  updateLastUpdateTime() {
    const lastUpdatedElement = document.getElementById('last-updated-time');
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = new Date().toLocaleTimeString();
    }
  }

  /**
   * Force refresh connection
   */
  forceRefresh() {
    console.log('🔄 Force refreshing connection...');
    this.disconnect();
    setTimeout(() => {
      this.initializeConnection();
    }, 1000);
  }

  /**
   * Disconnect from real-time updates
   */
  disconnect() {
    console.log('🔌 Disconnecting real-time updates...');

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatus();
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      type: this.connectionType,
      status: this.connectionStatus,
      retries: this.connectionRetries,
      reconnectAttempts: this.reconnectAttempts,
      lastUpdate: this.lastDataUpdate
    };
  }

  /**
   * Set configuration options
   */
  setConfig(options) {
    this.config = { ...this.config, ...options };
  }

  /**
   * Destroy the real-time updates manager
   */
  destroy() {
    this.disconnect();
    this.subscribers.clear();
    console.log('🗑️ Real-time updates manager destroyed');
  }
}

// Export for use in other modules
export { RealTimeUpdatesManager };