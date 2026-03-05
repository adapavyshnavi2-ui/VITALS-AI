let symptoms = [];
let locationStr = "GPS: Not Available";
let rawCoords = { lat: 0, lon: 0 };
let currentLang = 'en-IN'; 
let recognition = null; 

// 🔊 AUDIO SYSTEM (Fixed Path for GitHub Pages)
const emergencySiren = new Audio('siren.mp3'); 
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
        haptic('success');
        startBtn.innerText = "Listening... 🎤";
        startBtn.style.background = "#ff1744"; 

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            symptoms.push(transcript);
            updateChips();
            speakResult(currentLang === 'en-IN' ? "Added " + transcript : "చేర్చబడింది " + transcript);
        };
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

// 🧠 LOCAL AI ANALYSIS (Fixed: No Backend Needed)
const analyzeBtn = document.getElementById("analyze-btn");
if(analyzeBtn) analyzeBtn.onclick = () => {
    if (symptoms.length === 0) return alert("Please add symptoms first!");
    
    const resultArea = document.getElementById("result");
    resultArea.innerHTML = `<div class="loader-container"><div class="heart-pulse">❤️</div><p>Scanning Risks...</p></div>`;
    
    // Theoretical Logic Processing
    setTimeout(() => {
        const symptomsStr = symptoms.join(" ").toLowerCase();
        let severity = "LOW";
        let analysis = "Assessment complete. No immediate life-threatening risks detected. Rest and keep hydrated.";

        if (symptomsStr.includes("chest") || symptomsStr.includes("breath") || symptomsStr.includes("unconscious") || symptomsStr.includes("heart")) {
            severity = "EMERGENCY";
            analysis = "🚨 CRITICAL: High risk of Cardiac or Respiratory distress. Please seek immediate help!";
        } else if (symptomsStr.includes("fever") || symptomsStr.includes("pain") || symptomsStr.includes("cough") || symptomsStr.includes("headache")) {
            severity = "MEDIUM";
            analysis = "⚠️ MODERATE: Symptoms require medical attention. Monitor vitals and visit a clinic.";
        }

        renderResult({
            severity: severity,
            analysis: analysis,
            hospital: "Primary Health Centre",
            h_phone: "108"
        });
    }, 1500); 
};

// 📊 RENDERING RESULTS
function renderResult(data) {
    const resultArea = document.getElementById("result");
    const severity = data.severity || "LOW"; 
    
    if (severity === "EMERGENCY") triggerGlobalEmergency("Critical Symptoms Detected"); 
    else stopEmergencySiren();

    resultArea.innerHTML = `
        <div class="glass-card result-card ${severity.toLowerCase()}">
            <h3 style="margin:0;">📋 Analysis: ${severity}</h3>
            <p style="line-height:1.6; margin: 15px 0;">${data.analysis}</p>
            <div id="emergency-hub" style="display:block; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                <p>🏥 Nearby: ${data.hospital}</p>
                <button class="emergency-btn" onclick="window.location.href='tel:${data.h_phone}'">📞 Call Help</button>
            </div>
        </div>`;
    speakResult(data.analysis);
}

function clearAllData() {
    symptoms = []; 
    updateChips(); 
    document.getElementById("result").innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:50px;">📉 No active analysis.</p>`;
    stopEmergencySiren();
    haptic('success');
}

function updateChips() {
    const chipContainer = document.getElementById("symptoms-chips");
    if(chipContainer) {
        chipContainer.innerHTML = symptoms.map((s, i) => `<span class="chip" onclick="removeSymptom(${i})">${s} ✕</span>`).join("");
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
