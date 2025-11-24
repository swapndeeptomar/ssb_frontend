import React, { useState } from 'react';

export default function UserForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'M',
    experience_type: 'fresher',
    stream: '',
    grad_year: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.name || !formData.age || !formData.stream) {
        alert("Please fill all fields");
        return;
    }
    onSubmit(formData);
  };

  return (
    <div style={styles.container}>
      <h2 style={{color: '#2c3e50', marginBottom: '20px'}}>Candidate Profile</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        
        <input style={styles.input} name="name" placeholder="Full Name" onChange={handleChange} />
        
        <div style={styles.row}>
            <input style={styles.input} name="age" type="number" placeholder="Age" onChange={handleChange} />
            <select style={styles.input} name="gender" onChange={handleChange}>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
            </select>
        </div>

        <select style={styles.input} name="experience_type" onChange={handleChange}>
            <option value="fresher">Fresher (No Experience)</option>
            <option value="internship">Have done Internships</option>
            <option value="working">Working Professional</option>
        </select>

        <input style={styles.input} name="stream" placeholder="Graduation Stream (e.g. B.Tech CS)" onChange={handleChange} />
        <input style={styles.input} name="grad_year" type="number" placeholder="Graduation Year (e.g. 2024)" onChange={handleChange} />

        <button type="submit" style={styles.button}>Start Interview 🚀</button>
      </form>
    </div>
  );
}

const styles = {
  container: { marginLeft:'80px',alignItems:'center',textAlign: 'center', width: '100%', maxWidth: '400px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' },
  row: { display: 'flex', gap: '10px' },
  button: { padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }
};