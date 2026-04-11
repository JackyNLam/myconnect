const statusEl = document.getElementById('status');
const myCodeEl = document.getElementById('myCode');
const peerCodeInput = document.getElementById('peerCode');
const fileSection = document.getElementById('fileSection');
const fileInput = document.getElementById('fileInput');
const downloadLink = document.getElementById('downloadLink');

// Connect to my own vps
const socket = io('https://43.99.17.165:6039');

// Generate a random 4-character code (letters + numbers)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTWXYZ23456789'; // No confusing chars (0,O,I,1)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const myCode = generateCode();
myCodeEl.textContent = myCode;
statusEl.textContent = "Share your 4-character code with your peer!";

let peer;

// Connect to peer using their short code
window.connectToPeer = () => {
  const peerCode = peerCodeInput.value.trim().toUpperCase();
  if (!peerCode || peerCode.length !== 4) {
    statusEl.textContent = "❌ Enter a valid 4-character code!";
    return;
  }

  statusEl.textContent = `Connecting to ${peerCode}...`;

  // Create P2P connection
  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  });

  // Send WebRTC data via signaling server (using short code)
  peer.on('signal', data => {
    socket.emit('signal', {
      to: peerCode,
      from: myCode,
      data: data
    });
  });

  // Receive peer's WebRTC data
  socket.on('signal', msg => {
    if (msg.from === peerCode) peer.signal(msg.data);
  });

  // Connected!
  peer.on('connect', () => {
    statusEl.textContent = "✅ Connected! Send files now.";
    fileSection.style.display = "block";
  });

  // Receive file
  peer.on('data', data => {
    if (typeof data === 'string') {
      window.fileMeta = JSON.parse(data);
      statusEl.textContent = `Receiving ${window.fileMeta.name}...`;
      return;
    }
    const blob = new Blob([data]);
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = window.fileMeta.name;
    downloadLink.textContent = `✅ Download ${window.fileMeta.name}`;
    downloadLink.style.display = "block";
    statusEl.textContent = "File received!";
  });
};

// Send file
window.sendFile = () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first!");
  peer.send(JSON.stringify({ name: file.name }));
  const reader = new FileReader();
  reader.onload = () => peer.send(reader.result);
  reader.readAsArrayBuffer(file);
};

// Error handling
peer?.on('error', err => statusEl.textContent = `Error: ${err.message}`);

