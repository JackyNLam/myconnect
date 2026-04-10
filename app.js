const statusEl = document.getElementById('status');
const offerEl = document.getElementById('offer');
const answerEl = document.getElementById('answer');
const fileInput = document.getElementById('fileInput');
const sendBtn = document.getElementById('sendBtn');
const downloadLink = document.getElementById('downloadLink');

// Create P2P peer (uses public Google STUN server for discovery)
const peer = new SimplePeer({
  initiator: location.hash === '#init', // Auto-make one peer the initiator
  trickle: false,
  config: {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Free STUN server
  }
});

// 1. Generate connection code (send to other peer)
peer.on('signal', data => {
  offerEl.value = JSON.stringify(data);
  statusEl.textContent = "Copy the code above and send it to your peer.";
});

// 2. Connect using peer's code
window.connectPeer = () => {
  try {
    peer.signal(JSON.parse(answerEl.value));
    statusEl.textContent = "Connecting to peer...";
  } catch (err) {
    statusEl.textContent = "Invalid code! Try again.";
  }
};

// 3. Peer connected!
peer.on('connect', () => {
  statusEl.textContent = "✅ Connected! You can now send files.";
  fileInput.disabled = false;
  sendBtn.disabled = false;
});

// 4. Send file
window.sendFile = () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first!");

  statusEl.textContent = `Sending: ${file.name}...`;
  
  // Send file metadata + data
  peer.send(JSON.stringify({ name: file.name, size: file.size }));
  
  const reader = new FileReader();
  reader.onload = () => peer.send(reader.result);
  reader.readAsArrayBuffer(file);
};

// 5. Receive file
peer.on('data', data => {
  if (typeof data === 'string') {
    // First message: file info
    window.fileMeta = JSON.parse(data);
    statusEl.textContent = `Receiving: ${window.fileMeta.name}...`;
    return;
  }

  // Second message: file data
  const blob = new Blob([data]);
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = window.fileMeta.name;
  downloadLink.textContent = `✅ Download ${window.fileMeta.name}`;
  downloadLink.style.display = "block";
  statusEl.textContent = "File received!";
});

// Error handling
peer.on('error', err => {
  statusEl.textContent = `Error: ${err.message}`;
  console.error(err);
});

