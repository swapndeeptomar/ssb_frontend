import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import axios from 'axios';
import Avatar from './Avatar';
import Report from './Report';
import Webcam from 'react-webcam';
import UserForm from './UserForm';
import OIRTest from './OIRTest';
import PPDTTest from './PPDTTest';
import TATTest from './TATTest'; 
import SDTTest from './SDTTest';

function App() {
  const [stage, setStage] = useState("START"); 
  const [instructionMsg, setInstructionMsg] = useState("");
  const [userBg, setUserBg] = useState("engineering"); 
  const [userName, setUserName] = useState("Candidate");
  const [sessionId, setSessionId] = useState(null);
  const [qCount, setQCount] = useState(1); 
  const [isProcessing, setIsProcessing] = useState(false); // <-- CRASH PREVENTION

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [questions, setQuestions] = useState({ 
    pi: "", piId: null, wat: "", watId: null, srt: "", srtId: null,
    watTime: 15, srtTime: 30 
  });
  
  const [timeLeft, setTimeLeft] = useState(null); 
  const [userAnswer, setUserAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const recognitionRef = useRef(null);

  const speak = (text, onEndCallback = null) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.75; 
      utterance.lang = 'en-US';
      utterance.onstart = () => setIsAvatarSpeaking(true);
      utterance.onend = () => { setIsAvatarSpeaking(false); if (onEndCallback) onEndCallback(); };
      window.speechSynthesis.speak(utterance);
    } else { if (onEndCallback) onEndCallback(); }
  };

  const transitionToStage = (nextStage, speechText, displayText) => {
      setStage("INSTRUCTION");
      setInstructionMsg(displayText || "Listen to the Officer...");
      speak(speechText, () => setStage(nextStage));
  };

  const loadNewSet = async (activeCategory, currentSessionId, forcePiCategory = null) => {
    const categoryToUse = activeCategory || userBg;
    const sid = currentSessionId || sessionId;
    try {
      const piCat = forcePiCategory || categoryToUse;
      const ts = Date.now(); // Prevent Caching
      
      const piRes = await axios.get(`http://127.0.0.1:8000/api/interview/?category=${piCat}&session_id=${sid}&t=${ts}`);
      const watRes = await axios.get(`http://127.0.0.1:8000/api/wat/?session_id=${sid}&t=${ts}`);
      const srtRes = await axios.get(`http://127.0.0.1:8000/api/srt/?session_id=${sid}&t=${ts}`);

      setQuestions({
        pi: piRes.data.question_text, piId: piRes.data.id,
        wat: "Word Association Test. Word: " + watRes.data.word, 
        watDisplay: watRes.data.word, watId: watRes.data.id, watTime: 15,
        srt: "Situation Reaction Test. " + srtRes.data.situation_text, 
        srtId: srtRes.data.id, srtTime: 30  
      });
    } catch (error) { console.error("Network Error", error); }
  };

  useEffect(() => {
    if (timeLeft === 0) { handleNext(true); return; }
    if (timeLeft === null) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const startInterview = (formData) => {
      const newSession = Date.now().toString();
      setSessionId(newSession);
      setUserBg(formData.experience_type);
      setUserName(formData.name);
      
      axios.post('http://127.0.0.1:8000/api/register/', { ...formData, session_id: newSession })
        .then(() => {
           loadNewSet(formData.experience_type, newSession);
           transitionToStage("OIR", `Hello ${formData.name}. Welcome To AI based SSB Simulator. We will be Starting with OIR Test.`, "OIR Test Starting, Solve the Questions Quickly...");
        })
        .catch(err => alert("Backend Error. Ensure Django is running."));
  };

  useEffect(() => {
    if (["WAT", "SRT", "PI"].includes(stage)) {
        if (stage === "WAT") { speak(questions.wat); setTimeLeft(questions.watTime); }
        else if (stage === "SRT") { speak(questions.srt); setTimeLeft(questions.srtTime); }
        else if (stage === "PI") { speak(questions.pi); setTimeLeft(null); }
        setUserAnswer("");
    }
  }, [stage, questions, qCount]); 

  // --- SEQUENCE HANDLERS ---
  const handleOIRComplete = () => transitionToStage("PPDT", "We are now Done with OIR . Next test Will be PPDT . Create a Story involving a hero , his actions and a positive Outcome.", "Next: Picture Perception and Description Test");
  const handlePPDTComplete = () => transitionToStage("TAT", "Next we are going to start with TAT.", "Next: Thematic Apperception Test");
  const handleTATComplete = () => {
      setQCount(1); loadNewSet();
      transitionToStage("WAT", "Starting Word Association Test.Speak the first Sentence that comes to your mind .", "Next: Word Association Test");
  };
  const handleSDTComplete = () => {
      setQCount(1); 
      // PI Start karne se pehle 'intro' category load karo
      loadNewSet(userBg, sessionId, "intro"); 
      transitionToStage("PI", " Excellent we will now be Starting Personal Interview.", "Next: Personal Interview");
  };

  // --- ROBUST HANDLE NEXT (Fixes Lag & Repetition) ---
const handleNext = async (autoSubmit = false) => {
    if (isProcessing) return; 
    setIsProcessing(true);
    setTimeLeft(null); 

    let currentQId = null;
    if (stage === "WAT") currentQId = questions.watId;
    else if (stage === "SRT") currentQId = questions.srtId;
    else if (stage === "PI") currentQId = questions.piId;

    // 1. SAVE ANSWER
    if (userAnswer || autoSubmit) {
      try {
        await axios.post('http://127.0.0.1:8000/api/submit/', {
          session_id: sessionId, test_type: stage, question_id: currentQId,
          answer: userAnswer || "Time Limit Exceeded", background: userBg, candidate_name: userName
        });
      } catch (error) { console.error("Save failed:", error); }
    }

    // --- SAFETY DELAY (500ms) ---
    // Database update hone ka time do
    await new Promise(r => setTimeout(r, 500)); 

    // 2. NEXT STEP LOGIC
    let nextStage = stage;
    let nextQCount = qCount;
    let transitionNeeded = false;
    let loadNew = false;

    if (stage === "WAT") {
        if (qCount < 3) { nextQCount++; loadNew = true; }
        else { nextStage = "SRT"; nextQCount = 1; loadNew = true; transitionNeeded = true; }
    }
    else if (stage === "SRT") {
        if (qCount < 3) { nextQCount++; loadNew = true; }
        else { nextStage = "SDT"; transitionNeeded = true; }
    }
    else if (stage === "PI") {
        if (qCount < 4) { 
            nextQCount++; loadNew = true; 
            // Agar Q1 (Intro) abhi khatam hua hai, toh Q2 load karo
            if (qCount === 1) {
                 // Explicitly call with null category to trigger logic
                 await loadNewSet(userBg, sessionId, null);
                 loadNew = false; // Upar load kar liya
            }
        }
        else { setIsGeneratingReport(true); // Loading On
            
            setTimeout(() => {
                setStage("REPORT");
                setIsGeneratingReport(false); // Loading Off
                setIsProcessing(false);       // Unlock
            }, 5000); // 5 Seconds Delay
            
            return; }
    }

    // 3. EXECUTE
    if (transitionNeeded) {
        if(nextStage === "SDT") transitionToStage("SDT", "Next is Self Description Test.", "Next: SDT");
        else if(nextStage === "SRT") transitionToStage("SRT", "Next is Situation Reaction Test.", "Next: SRT");
        else setStage(nextStage);
        
        if (loadNew) loadNewSet();
        setQCount(nextQCount);
    } else {
        if(loadNew) await loadNewSet();
        setQCount(nextQCount);
        setStage(nextStage);
    }
    
    setUserAnswer(""); 
    setIsProcessing(false);
  };

  // --- FIXED MIC LOGIC (Toggle & Continuous) ---
  const toggleListening = () => {
    // Case 1: Agar Mic ON hai -> toh BAND karo
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // Asli stop
      }
      setIsListening(false);
      return;
    }

    // Case 2: Agar Mic OFF hai -> toh CHALU karo
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition; // Ref mein store kiya

      recognition.lang = 'en-US';
      recognition.continuous = true;     // <--- CRITICAL FIX (Lamba sunega)
      recognition.interimResults = true; // <--- Real-time typing dikhegi

      recognition.onstart = () => setIsListening(true);
      
      recognition.onend = () => {
          // Auto-stop na ho, isliye hum state check karenge
          // Agar humne jaan-bujh ke band nahi kiya, toh ye restart ho sakta hai
          // Par abhi ke liye simple rakhte hain
          setIsListening(false);
      };

      recognition.onerror = (event) => {
          console.error("Mic Error:", event.error);
          setIsListening(false);
      };

      recognition.onresult = (event) => {
        // Jo bhi bola ja raha hai use jodte jao
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            // Interim (abhi bol rahe ho)
            finalTranscript += event.results[i][0].transcript;
          }
        }
        // Agar user ne pehle kuch bola tha, toh naya text usme replace kare ya append?
        // Behtar hai ki continuous flow mein hum seedha set karein
        // Note: Yeh simple implementation hai, jo real-time update dega
        const currentText = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        setUserAnswer(currentText);
      };

      recognition.start();
    } else {
      alert("Browser not supported. Please use Google Chrome.");
    }
  };

    // --- UI ANIMATIONS (Injecting CSS) ---
  const globalStyles = `
    @keyframes gradientBG {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
      100% { transform: translateY(0px); }
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7); }
      70% { box-shadow: 0 0 0 15px rgba(52, 152, 219, 0); }
      100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
    }
    .animated-bg {
      background: linear-gradient(-45deg, #e0eafc, #cfdef3, #e2ebf0, #fdfbfb);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .floating-shape {
      position: absolute;
      border-radius: 50%;
      opacity: 0.4;
      filter: blur(60px);
      z-index: 0;
      animation: float 6s ease-in-out infinite;
    }
  `;


  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      
      {/* PROCESSING OVERLAY */}
      {/* {isProcessing && (
        <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(255,255,255,0.7)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center'}}>
            <h2>⏳ Processing...</h2>
        </div>
      )} */}

      {/* REPORT GENERATION SCREEN (Overlay) */}
      {isGeneratingReport && (
        <div style={{
            position:'absolute', top:0, left:0, width:'100%', height:'100%', 
            background:'rgba(44, 62, 80, 0.95)', zIndex:200, 
            display:'flex', flexDirection: 'column', justifyContent:'center', alignItems:'center',
            color: 'white', backdropFilter: 'blur(5px)'
        }}>
            <div className="spinner"></div>
            <h2 style={{marginTop: '20px'}}>📊 Analysing Personality Traits...</h2>
            <p style={{color: '#bdc3c7'}}>Calculating OLQs, Voice Tone & Scores</p>
        </div>
      )}

      {/* LEFT SIDE */}
      <div style={{ width: '500px', backgroundColor: '#2c3e50', display: 'flex', flexDirection: 'column', padding: '15px', gap: '15px', flexShrink: 0 }}>
        <div style={{ flex: 1, backgroundColor: '#dcdde1', borderRadius: '15px', overflow: 'hidden', position: 'relative', border: '4px solid #34495e' }}>
          <div style={styles.labelBadge}>SSB Officer</div>
          <Avatar isSpeaking={isAvatarSpeaking}/>
        </div>
        <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '15px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3498db' }}>
          <div style={styles.labelBadge}>Candidate (You)</div>
          {isCameraOn ? <Webcam audio={false} mirrored={true} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{color:'white'}}>Camera Off</div>}
          <button onClick={() => setIsCameraOn(!isCameraOn)} style={styles.camButton}>{isCameraOn ? "🚫 Video Off" : "📷 Video On"}</button>
        </div>
      </div>

      {/* RIGHT SIDE (PREMIUM UI UPDATE) */}
      <div className="animated-bg" style={{ 
          flex: 1, 
          padding: '40px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: ["REPORT","OIR", "PPDT", "TAT", "SDT"].includes(stage) ? 'flex-start' : 'center',
          alignItems: (stage === "START" || stage === "INSTRUCTION") ? 'center' : 'stretch',
          overflowY: 'auto', 
          height: '100vh',
          position: 'relative',
          backgroundColor: '#ffffffff'

      }}>
        
        {/* BACKGROUND SHAPES (Visual Decoration)
        <div className="floating-shape" style={{width: '300px', height: '300px', background: '#3498db', top: '-50px', right: '-50px', animationDelay: '0s'}}></div>
        <div className="floating-shape" style={{width: '200px', height: '200px', background: '#e74c3c', bottom: '50px', left: '50px', animationDelay: '2s'}}></div> */}

        {/* 1. START SCREEN */}
        {stage === "START" && (
           <div className="glass-card" style={styles.modernCard}>
             <div style={{marginBottom: '20px'}}>
                <span style={{fontSize: '50px'}}>🇮🇳</span>
             </div>
             <h1 style={{color: '#2c3e50', marginBottom: '10px', fontSize: '2.8rem', letterSpacing: '-1px', fontWeight: '800'}}>SSB AI SYSTEM</h1>
             <p style={{color: '#7f8c8d', marginBottom: '40px', fontSize: '1.2rem', fontWeight: '500'}}>Advanced Psychometric & Interview Assessment</p>
             
             <div style={{textAlign: 'left', padding: '0 20px'}}>
                <UserForm onSubmit={startInterview} />
             </div>
           </div>
        )}

        {/* 2. INSTRUCTION SCREEN */}
        {stage === "INSTRUCTION" && (
            <div className="glass-card" style={styles.modernCard}>
                <div style={{textAlign: 'center', animation: 'fadeIn 0.5s ease-in'}}>
                    <div style={{
                        width: '80px', height: '80px', margin: '0 auto 20px', 
                        borderRadius: '50%', background: '#e74c3c', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px',
                        animation: 'pulse 2s infinite'
                    }}>
                        !
                    </div>
                    <h1 style={{color: '#2c3e50', fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 15px 0'}}>Attention</h1>
                    <h2 style={{color: '#555', fontWeight: '400', lineHeight: '1.5', fontSize: '1.5rem'}}>{instructionMsg}</h2>
                    
                    <div style={{marginTop: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'}}>
                        <div className="loader-dots"></div> 
                        <span style={{color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px'}}>Processing Instructions...</span>
                    </div>
                </div>
            </div>
        )}

        {/* 3. TESTS (Container with Z-Index to sit above background) */}
        <div style={{position: 'relative', zIndex: 10, width: '100%'}}>
            {stage === "OIR" && <OIRTest sessionId={sessionId} onComplete={handleOIRComplete} />}
            {stage === "PPDT" && <PPDTTest sessionId={sessionId} onComplete={handlePPDTComplete} />}
            {stage === "TAT" && <TATTest sessionId={sessionId} onComplete={handleTATComplete} />} 
            {stage === "SDT" && <SDTTest sessionId={sessionId} onComplete={handleSDTComplete} />}
            {stage === "REPORT" && <Report sessionId={sessionId} onRestart={() => setStage("START")} />}
        </div>

        {/* 4. INTERVIEW INTERFACE */}
        {["WAT", "SRT", "PI"].includes(stage) && (
          <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center'}}>
                <div style={styles.stageBadge}>
                    {stage === "PI" ? "PERSONAL INTERVIEW" : stage === "WAT" ? "WORD ASSOCIATION" : "SITUATION REACTION"}
                </div>
                <div style={{display: 'flex', gap: '15px'}}>
                    <div style={styles.infoBadge}>Q {qCount} / {stage === "PI" ? 4 : 3}</div>
                    {timeLeft !== null && (
                        <div style={{
                            ...styles.infoBadge, 
                            background: timeLeft < 5 ? '#e74c3c' : '#94b2d0ff', 
                            color: 'white', 
                            boxShadow: timeLeft < 5 ? '0 0 10px #e74c3c' : 'none'
                        }}>
                            ⏱️ {timeLeft}s
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card" style={styles.questionBox}>
              <h1 style={{ color: '#2c3e50', fontSize: stage === 'WAT' ? '60px' : '32px', lineHeight: '1.4', textAlign: 'center', fontWeight: '700', margin: 0 }}>
                {stage === "PI" ? questions.pi : 
                 stage === "WAT" ? questions.watDisplay : 
                 questions.srt.replace("Situation Reaction Test. ", "")}
              </h1>
            </div>

            <div style={styles.answerBox}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <span style={{ color: '#95a5a6', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Response</span>
                  {isListening && <span style={{color: '#e74c3c', fontSize: '12px', fontWeight: 'bold', animation: 'pulse 1.5s infinite'}}>● RECORDING</span>}
              </div>
              <p style={{ fontSize: '22px', color: '#333', fontWeight: '500', minHeight: '40px', lineHeight: '1.5' }}>
                  {userAnswer || <span style={{color: '#ccc'}}>Speak your answer...</span>}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
              <button onClick={toggleListening} style={{ ...styles.actionButton, backgroundColor: isListening ? '#e74c3c' : '#3498db', boxShadow: '0 10px 20px rgba(52, 152, 219, 0.3)' }}>
                {isListening ? "🛑 Stop" : "🎤 Start Speaking"}
              </button>
              <button onClick={() => handleNext(false)} disabled={isProcessing} style={{ ...styles.actionButton, backgroundColor: isProcessing ? '#95a5a6' : '#27ae60', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.3)',cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                {isProcessing ? "Saving..." : "Submit ➡️"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const styles = {
  modernCard: {
    padding: '60px',
    borderRadius: '30px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '650px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 10,
  },
  questionBox: { 
    minHeight: '220px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    borderRadius: '20px', 
    padding: '40px', 
    marginBottom: '25px',
    borderLeft: '10px solid #2c3e50',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  answerBox: { 
    backgroundColor: 'white', 
    padding: '30px', 
    borderRadius: '20px', 
    border: '1px solid #e1e4e8', 
    minHeight: '140px', 
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)',
    position: 'relative',
    zIndex: 10
  },
  actionButton: { 
    flex: 1, 
    padding: '20px', 
    fontSize: '18px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '15px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    letterSpacing: '1px',
    transform: 'translateY(0)',
    transition: 'all 0.2s ease'
  },
  labelBadge: { position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 15px', borderRadius: '50px', fontSize: '12px', zIndex: 10, fontWeight: '600', letterSpacing: '0.5px', backdropFilter: 'blur(4px)' },
  camButton: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 25px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px', zIndex: 10, transition: '0.2s', backdropFilter: 'blur(4px)' },
  
  // New Badges
  stageBadge: { background: '#2c3e50', color: 'white', padding: '10px 25px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', letterSpacing: '1px', boxShadow: '0 5px 15px rgba(44, 62, 80, 0.2)' },
  infoBadge: { background: 'white', color: '#2c3e50', padding: '10px 20px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: '1px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }
};

export default App;