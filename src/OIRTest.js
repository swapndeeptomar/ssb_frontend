import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function OIRTest({ onComplete, sessionId }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/oir/')
      .then(res => { setQuestions(res.data); setLoading(false); })
      .catch(err => console.error(err));
  }, []);

  const handleSelect = (qId, opt) => {
    setAnswers({ ...answers, [qId]: opt });
  };

  const handleSubmit = async () => {
    await axios.post('http://127.0.0.1:8000/api/oir/submit/', {
      answers: answers,
      session_id: sessionId
    });
    onComplete(); // Next stage par jao
  };

  if (loading) return <div>Loading OIR Test...</div>;

  return (
    <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
      <h2>👮‍♂️ Officer Intelligence Rating (OIR) Test</h2>
      <p>Solve these logical reasoning questions quickly.</p>
      
      {questions.map((q, index) => (
        <div key={q.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p><strong>Q{index + 1}: {q.q}</strong></p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(q.options).map(([key, val]) => (
              <button 
                key={key}
                onClick={() => handleSelect(q.id, key)}
                style={{
                  padding: '8px 15px', borderRadius: '5px', border: '1px solid #333',
                  backgroundColor: answers[q.id] === key ? '#2c3e50' : 'white',
                  color: answers[q.id] === key ? 'white' : 'black',
                  cursor: 'pointer'
                }}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <button onClick={handleSubmit} style={{ padding: '15px', width: '100%', backgroundColor: 'green', color: 'white', fontSize: '18px', border: 'none', cursor: 'pointer' }}>
        Submit OIR Test
      </button>
    </div>
  );
}