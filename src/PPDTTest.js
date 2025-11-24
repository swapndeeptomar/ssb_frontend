import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PPDTTest({ onComplete, sessionId }) {
  const [imgData, setImgData] = useState(null);
  const [story, setStory] = useState("");

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/ppdt/')
      .then(res => setImgData(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async () => {
    if (!story) return alert("Please write a story!");
    
    await axios.post('http://127.0.0.1:8000/api/submit/', {
        test_type: "PPDT",
        question_id: imgData.id,
        answer: story,
        session_id: sessionId,
        background: "general" // Default
    });
    onComplete();
  };

  if (!imgData) return <div>Loading Picture...</div>;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🖼️ Picture Perception & Discussion Test (PPDT)</h2>
      <p>Observe the picture for 30 seconds and write a story.</p>
      
      <img src={imgData.url} alt="PPDT" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '2px solid #333', borderRadius: '10px' }} />
      
      <textarea 
        rows="6" 
        placeholder="Write your story here... (Who are the characters? What is happening? What is the outcome?)"
        style={{ width: '100%', marginTop: '20px', padding: '10px', fontSize: '16px' }}
        value={story}
        onChange={(e) => setStory(e.target.value)}
      />

      <button onClick={handleSubmit} style={{ marginTop: '20px', padding: '15px 30px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', cursor: 'pointer' }}>
        Submit Story
      </button>
    </div>
  );
}