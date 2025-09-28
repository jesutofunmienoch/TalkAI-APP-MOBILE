export default class Vapi {
  constructor(publicKey) {
    console.log('Mock Vapi initialized with key:', publicKey);
  }
  start(assistantId) {
    console.log('Mock Vapi started with assistant ID:', assistantId);
  }
  stop() {
    console.log('Mock Vapi stopped');
  }
  setMuted(muted) {
    console.log('Mock Vapi setMuted:', muted);
  }
  isMuted() {
    console.log('Mock Vapi isMuted called');
    return false;
  }
  on(event, callback) {
    console.log('Mock Vapi event listener added:', event);
    // Simulate some events for testing
    if (event === 'speech-start') {
      setTimeout(() => callback(), 1000);
    } else if (event === 'speech-end') {
      setTimeout(() => callback(), 2000);
    } else if (event === 'volume-level') {
      setTimeout(() => callback(0.5), 500); // Simulate volume level
    } else if (event === 'error') {
      setTimeout(() => callback(new Error('Mock error')), 3000);
    }
  }
}