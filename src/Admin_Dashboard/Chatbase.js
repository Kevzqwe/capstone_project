// Chatbase.js - Simplified Chatbase integration
const initializeChatbase = () => {
  // Initialize the chatbase queue and proxy if not already done
  if (!window.chatbase || window.chatbase("getState") !== "initialized") {
    window.chatbase = (...args) => {
      if (!window.chatbase.q) {
        window.chatbase.q = [];
      }
      window.chatbase.q.push(args);
    };
    
    window.chatbase = new Proxy(window.chatbase, {
      get(target, prop) {
        if (prop === "q") {
          return target.q;
        }
        return (...args) => target(prop, ...args);
      },
    });
  }

  const loadChatbaseScript = () => {
    // Check if script already exists
    if (document.getElementById("qLBNkxXcRUo19x8-TuiJQ")) {
      console.log('Chatbase script already loaded');
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = "qLBNkxXcRUo19x8-TuiJQ";
    script.domain = "www.chatbase.co";
    script.defer = true;
    
    script.onload = () => {
      console.log('Chatbase chatbot loaded successfully');
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Chatbase script:', error);
    };
    
    document.body.appendChild(script);
  };

  // Load script based on document ready state
  if (document.readyState === "complete") {
    loadChatbaseScript();
  } else {
    window.addEventListener("load", loadChatbaseScript);
  }
};

// Export the initialization function
export default initializeChatbase;