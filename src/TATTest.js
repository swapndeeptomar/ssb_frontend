import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TATTest({ sessionId, onComplete }) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [story, setStory] = useState("");
  const [timeLeft, setTimeLeft] = useState(30); // 30 sec to view

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/tat/')
      .then(res => setImages(res.data))
      .catch(err => console.error(err));
  }, []);

  // Timer Logic (Simplified for View -> Write cycle)
  // Real SSB mein: 30 sec view -> 4 min write. 
  // Hum prototype ke liye: Image dikhayenge, phir likhne denge.

  const handleSubmit = async () => {
    if(!story) return alert("Write something!");
    
    // Save
    await axios.post('http://127.0.0.1:8000/api/submit/', {
        session_id: sessionId,
        test_type: "TAT",
        question_id: images[currentIndex].id,
        answer: story,
        background: "general"
    });

    setStory(""); // Clear
    if (currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1); // Next Image
    } else {
        onComplete(); // Done
    }
  };

  if (images.length === 0) return <div>Loading TAT...</div>;

  return (
    <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{color: '#2c3e50'}}>Thematic Apperception Test (TAT)</h2>
      <p>Picture {currentIndex + 1} / {images.length}</p>

      <div style={{ border: '5px solid #333', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
         <img 
            src={images[currentIndex].url} 
            alt="TAT" 
            style={{ width: '100%', height: '300px', objectFit: 'cover' }} 
         />
      </div>

      <textarea 
        rows="6" 
        placeholder="Write a story based on the picture..."
        style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
        value={story}
        onChange={(e) => setStory(e.target.value)}
      />

      <button onClick={handleSubmit} style={{ marginTop: '15px', padding: '12px 30px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', cursor: 'pointer' }}>
        Submit Story & Next ➡️
      </button>
    </div>
  );
}