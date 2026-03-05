let symptoms = [];
let locationStr = "GPS: Not Available";
let rawCoords = { lat: 0, lon: 0 };
let currentLang = 'en-IN'; 
let cameraStream = null;
let lastShake = 0;
let motionEnabled = false;
let recognition = null; 

// 🔊 AUDIO SYSTEM
const emergencySiren = new Audio('/static/siren.mp3');
emergencySiren.loop = true; 

// 📍 HIGH-PRECISION LOCATION
navigator.geolocation.getCurrentPosition(p => {
    rawCoords.lat = p.coords.latitude;
    rawCoords.lon = p.coords.longitude;
    locationStr = `${rawCoords.lat.toFixed(5)},${rawCoords.lon.toFixed(5)}`;
}, () => { 
    locationStr = "GPS: Denied"; 
}, { enableHighAccuracy: true });

// 🌐 MULTILINGUAL LOGIC
function changeLang(lang) {
    currentLang = lang;
    haptic('success');
    window.speechSynthesis.cancel();
    
    let msg = (lang === 'te-IN') ? "తెలుగు భాష సెట్ చేయబడింది" : 
              (lang === 'hi-IN') ? "हिंदी भाषा सक्रिय है" : "English language activated";
    
    if (lang === 'te-IN') updateUIForLang("మాట్లాడండి", "🚑 అంబులెన్స్ కాల్", "విశ్లేషణ ప్రారంభించండి");
    else if (lang === 'hi-IN') updateUIForLang("बात करने के लिए टैप करें", "🚑 एम्बुलेंस कॉल", "विश्लेषण शुरू करें");
    else updateUIForLang("🎤 Tap to Speak", "🚑 Call Ambulance (108)", "🧠 Start AI Analysis");
    
    speakResult(msg);
}

function updateUIForLang(voiceText, scanText, analyzeText) {
    const startBtn = document.getElementById("start-btn");
    const scanBtn = document.getElementById("scan-btn-main");
    const analyzeBtn = document.getElementById("analyze-btn");
    if(startBtn) startBtn.innerText = voiceText;
    if(scanBtn) scanBtn.innerText = scanText;
    if(analyzeBtn) analyzeBtn.innerText = analyzeText;
}

// 🎤 VOICE CONSULTATION
const startBtn = document.getElementById("start-btn");
if (startBtn) {
    startBtn.onclick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("❌ Your browser doesn't support Speech.");
            return;
        }
        if (recognition) { try { recognition.stop(); } catch(e) {} }

        recognition = new SpeechRecognition();
        recognition.lang = currentLang;
        recognition.continuous = false;
        recognition.interimResults = false;

        haptic('success');
        startBtn.innerText = "Listening... 🎤";
        startBtn.style.background = "#ff1744"; 

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            symptoms.push(transcript);
            updateChips();
            speakResult(currentLang === 'en-IN' ? "Added " + transcript : "చేర్చబడింది " + transcript);
        };
        recognition.onerror = () => resetVoiceUI();
        recognition.onend = () => resetVoiceUI();
        try { recognition.start(); } catch (e) { resetVoiceUI(); }
    };
}

function resetVoiceUI() {
    if (!startBtn) return;
    startBtn.innerText = (currentLang === 'te-IN') ? "మాట్లాడండి" : 
                        (currentLang === 'hi-IN') ? "बात करने के लिए टैप करें" : "🎤 Tap to Speak";
    startBtn.style.background = ""; 
}

// ♿ ACCESSIBILITY: SHAKE-TO-SOS
async function enableMotionSensors(event) {
    const btn = event.currentTarget; 
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("⚠️ Sensors require HTTPS.");
    }
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') activateMotionLogic(btn);
        } catch (err) { alert("❌ Error: " + err); }
    } else { activateMotionLogic(btn); }
}

function activateMotionLogic(btn) {
    window.addEventListener('devicemotion', handleMotion, true);
    motionEnabled = true;
    haptic('success');
    btn.style.background = "#10b981"; 
    btn.innerHTML = "✅ Motion SOS Active";
}

function handleMotion(event) {
    let acc = event.accelerationIncludingGravity;
    if (!acc) return;
    let totalAcc = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
    if (totalAcc > 28) { 
        let now = Date.now();
        if (now - lastShake > 5000) {
            lastShake = now;
            triggerGlobalEmergency("Shake Detected");
        }
    }
}

// 🆘 EMERGENCY SYSTEM
function triggerGlobalEmergency(reason = "Medical Emergency") {
    haptic('panic');
    emergencySiren.play().catch(() => {});
    document.body.classList.add('emergency-flash');
    let confirmMsg = (currentLang === 'te-IN') ? "🚨 అత్యవసర పరిస్థితి! SOS ని సక్రియం చేయాలా?" : 
                     (currentLang === 'hi-IN') ? "🚨 आपातकालीन स्थिति! क्या SOS सक्रिय करें?" : 
                     `🚨 RISK ALERT: ${reason.toUpperCase()}! Activate SOS?`;
    if (confirm(confirmMsg)) {
        sendSOSMessage(reason);
        setTimeout(() => callAmbulance(), 1500); 
    } else { stopEmergencySiren(); }
}

function stopEmergencySiren() {
    emergencySiren.pause();
    emergencySiren.currentTime = 0;
    document.body.classList.remove('emergency-flash');
}

function sendSOSMessage(reason) {
    const contactNumber = "108"; 
    const mapsLink = `https://www.google.com/maps?q=${rawCoords.lat},${rawCoords.lon}`;
    const messageBody = `🆘 EMERGENCY SOS\nReason: ${reason}\nLoc: ${locationStr}\nMap: ${mapsLink}`;
    window.location.href = `sms:${contactNumber}?body=${encodeURIComponent(messageBody)}`;
}

function callAmbulance() { window.location.href = "tel:108"; }

function startMedicineScan() { callAmbulance(); }

// ⌨️ INPUT METHODS
function addTextSymptom() {
    const input = document.getElementById("text-input");
    if (!input || !input.value.trim()) return;
    symptoms.push(input.value.trim());
    updateChips();
    input.value = "";
    haptic('success');
}

function addIconSymptom(name) {
    symptoms.push(name);
    updateChips();
    haptic('success');
}

function removeSymptom(index) {
    symptoms.splice(index, 1);
    updateChips();
}

// 🧠 AI ANALYSIS
const analyzeBtn = document.getElementById("analyze-btn");
if(analyzeBtn) analyzeBtn.onclick = async () => {
    if (symptoms.length === 0) return alert("Please add symptoms first!");
    const resultArea = document.getElementById("result");
    const sevBar = document.getElementById("sev-container");
    resultArea.innerHTML = `<div class="loader-container"><div class="heart-pulse">❤️</div><p>Scanning Risks...</p></div>`;
    if(sevBar) sevBar.style.display = "block";
    
    try {
        const res = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symptoms, lat: rawCoords.lat, lon: rawCoords.lon })
        });
        const data = await res.json();
        renderResult(data);
    } catch (err) { 
        resultArea.innerHTML = "<div>⚠️ Connection Error</div>"; 
    }
};

// 📊 RENDERING RESULTS
function renderResult(data) {
    const resultArea = document.getElementById("result");
    const hub = document.getElementById("emergency-hub");
    const severity = data.severity || "LOW"; 
    
    if (severity === "EMERGENCY") triggerGlobalEmergency(data.analysis.split('!')[0]); 
    else stopEmergencySiren();

    const displayMessage = data.analysis || data.message || "Assessment complete.";
    resultArea.innerHTML = `
        <div class="glass-card result-card ${severity.toLowerCase()}">
            <div class="hub-header">
                <h3 style="margin:0;">📋 Analysis: ${severity}</h3>
                <span class="pulse-icon" style="background:${severity === 'EMERGENCY' ? '#ff1744' : '#10b981'}">●</span>
            </div>
            <p style="line-height:1.6; margin: 15px 0;">${displayMessage}</p>
        </div>`;

    if (data.hospital && hub) {
        hub.style.display = "block";
        hub.innerHTML = `
            <h3 style="margin:0; color:white;">🏥 Nearby: ${data.hospital}</h3>
            <button class="emergency-btn" onclick="window.location.href='tel:${data.h_phone}'">📞 Call Hospital</button>
            <a class="emergency-btn" style="background:#10b981; display:block; text-align:center; text-decoration:none; margin-top:10px;" 
               href="https://www.google.com/maps?q=${data.h_lat},${data.h_lon}" target="_blank">📍 Navigate</a>`;
    }
    speakResult(displayMessage);
}

// ✨ NEW: FULL RESET FUNCTION
function clearAllData() {
    symptoms = []; 
    updateChips(); 
    
    const resultArea = document.getElementById("result");
    if (resultArea) {
        resultArea.innerHTML = `
            <div style="color: #94a3b8; text-align: center; margin-top: 100px;">
                <p style="font-size: 40px; margin-bottom: 10px;">📉</p>
                <p>No active analysis.<br>Complete input to begin.</p>
            </div>`;
    }

    const hub = document.getElementById("emergency-hub");
    if (hub) { hub.style.display = "none"; hub.innerHTML = ""; }

    const sevBar = document.getElementById("sev-container");
    if (sevBar) { sevBar.style.display = "none"; }

    stopEmergencySiren();
    haptic('success');
}

// 🧬 UTILS
function updateChips() {
    const chipContainer = document.getElementById("symptoms-chips");
    if(chipContainer) {
        chipContainer.innerHTML = symptoms.map((s, i) => `
            <span class="chip" onclick="removeSymptom(${i})">${s} ✕</span>
        `).join("");
    }
}

function speakResult(text) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = (currentLang === 'te-IN') ? 'te-IN' : (currentLang === 'hi-IN') ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(speech);
}

function haptic(type) {
    if (!navigator.vibrate) return;
    type === 'panic' ? navigator.vibrate([500, 200, 500, 200, 500]) : navigator.vibrate(40);
}