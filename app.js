const statusEl = document.getElementById('status');
const myCodeEl = document.getElementById('myCode');
const peerCodeInput = document.getElementById('peerCode');
const fileSection = document.getElementById('fileSection');
const fileInput = document.getElementById('fileInput');
const downloadLink = document.getElementById('downloadLink');

// FREE PUBLIC SIGNALING SERVER (100% reliable)
const socket = io('https://peer-signal.fly.dev');

// Generate clean 4-char code (no confusing 0/O/I/1)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const myCode = generateCode();
myCodeEl.textContent = myCode;
statusEl.textContent = "✅ Share your code with your peer!";

let peer;
let isInitiator = false;

// --------------------------
// FIXED: Connect to Peer
// --------------------------
window.connectToPeer = () => {
  const peerCode = peerCodeInput.value.trim().toUpperCase();
  
  if (!peerCode || peerCode.length !== 4) {
    statusEl.textContent = "❌ Enter a valid 4-character code!";
    return;
  }

  statusEl.textContent = `🔄 Connecting to ${peerCode}...`;
  isInitiator = true;
  createPeer(peerCode);
};

// --------------------------
// FIXED: Create WebRTC Peer
// --------------------------
function createPeer(peerId) {
  peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  // Send WebRTC signal via server
  peer.on('signal', data => {
    socket.emit('signal', {
      to: peerId,
      from: myCode,
      data: data
    });
  });

  // SUCCESS: Connected!
  peer.on('connect', () => {
    statusEl.textContent = `✅ Connected to ${peerId}! Send files.`;
    fileSection.style.display = "block";
  });

  // Receive file
  peer.on('data', data => {
    if (typeof data === 'string') {
      window.fileMeta = JSON.parse(data);
      statusEl.textContent = `📥 Receiving ${window.fileMeta.name}...`;
      return;
    }

    const blob = new Blob([data]);
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = window.fileMeta.name;
    downloadLink.textContent = `📁 Download ${window.fileMeta.name}`;
    downloadLink.style.display = "block";
    statusEl.textContent = "✅ File received!";
  });

  // Errors
  peer.on('error', err => {
    statusEl.textContent = `❌ Connection error: ${err.message}`;
    console.error(err);
  });
}

// --------------------------
// FIXED: Listen for incoming connections
// --------------------------
socket.on('signal', msg => {
  // If we get a signal and don't have a peer yet = auto-create receiver
  if (!peer) {
    isInitiator = false;
    createPeer(msg.from);
  }
  
  // Answer the connection
  if (peer && msg.from) {
    peer.signal(msg.data);
  }
});

// --------------------------
// Send File
// --------------------------
window.sendFile = () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first!");
  
  statusEl.textContent = `📤 Sending ${file.name}...`;
  peer.send(JSON.stringify({ name: file.name }));

  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = () => peer.send(reader.result);
};

