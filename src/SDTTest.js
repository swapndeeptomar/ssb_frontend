import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SDTTest({ sessionId, onComplete }) {
  const [prompts, setPrompts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeMicIndex, setActiveMicIndex] = useState(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/sdt/')
      .then(res => setPrompts(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleVoiceInput = (index) => {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-US';
        setActiveMicIndex(index);
        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            setAnswers(prev => ({ ...prev, [index]: (prev[index] || "") + " " + text }));
            setActiveMicIndex(null);
        };
        recognition.start();
    } else { alert("Use Chrome for Voice"); }
  };

  const handleSubmit = async () => {
    // Loop through all answers and save them
    for (let i = 0; i < prompts.length; i++) {
        const ans = answers[i] || "Skipped";
        await axios.post('http://127.0.0.1:8000/api/submit/', {
            session_id: sessionId,
            test_type: "SDT",
            question_id: prompts[i].id,
            answer: ans,
            background: "general"
        });
    }
    onComplete();
  };

  if (prompts.length === 0) return <div>Loading SDT...</div>;

  return (
    <div style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
      <h2 style={{textAlign: 'center', color: '#2c3e50'}}>Self Description Test (SDT)</h2>
      <p style={{textAlign: 'center', color: '#7f8c8d'}}>Write or Speak about yourself in 5 paragraphs.</p>
      
      {prompts.map((p, index) => (
        <div key={p.id} style={{ marginBottom: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '10px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{p.q}</label>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <textarea 
                    rows="3"
                    style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                    value={answers[index] || ""}
                    onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                />
                <button 
                    onClick={() => handleVoiceInput(index)}
                    style={{ backgroundColor: activeMicIndex === index ? 'red' : '#3498db', color: 'white', border: 'none', borderRadius: '5px', width: '50px', cursor: 'pointer' }}
                    title="Speak Answer"
                >
                    🎤
                </button>
            </div>
        </div>
      ))}

      <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', fontSize: '18px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Submit SDT & Proceed to Interview
      </button>
    </div>
  );
}