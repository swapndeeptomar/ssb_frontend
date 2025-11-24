import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Report({ onRestart, sessionId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if(sessionId) {
        axios.get(`http://127.0.0.1:8000/api/report/?session_id=${sessionId}`)
          .then(res => setData(res.data))
          .catch(err => console.error(err));
    }
  }, [sessionId]);

  const getDynamicTip = (feedback, score, testType, answer) => {
      if (!answer || answer === "Time Limit Exceeded" || (feedback && feedback.includes("No answer"))|| answer==="Skipped") {
          return "Tip: Do not skip questions. Attempting is better than silence.";
      }
      if (score >= 7.5) return "Outstanding! Keep this mindset.";
      if (feedback && feedback.includes("focus more on:")) {
          const missingQualities = feedback.split("focus more on:")[1].split(".")[0];
          return `Tip: Your answer lacked ${missingQualities}.`;
      }
      if (feedback && feedback.includes("too short")) {
          return "Tip: Speak a bit more. Explain your action clearly.";
      }
      if (testType === "WAT") return "Tip: Make observations, not definitions. Be positive.";
      if (testType === "SRT") return "Tip: Action should be: Immediate + Logical + Constructive.";
      if (testType === "PPDT") return "Tip: Define the Hero, the Problem, and a Positive Outcome.";
      if (testType === "OIR") return "Tip: Practice logical reasoning speed tests.";

      return "Tip: Be more specific, confident and loud.";
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text("SSB Candidate Analytics Report", 105, 20, { align: "center" });
    
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 30, 182, 35, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Candidate Name", 45, 40, { align: "center" });
    doc.text("Overall Score", 105, 40, { align: "center" });
    doc.text("Final Verdict", 165, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(data.candidate_name, 45, 50, { align: "center" });
    doc.text(`${data.overall_score}/10`, 105, 50, { align: "center" });
    
    if (data.verdict === "Recommended") doc.setTextColor(39, 174, 96);
    else doc.setTextColor(231, 76, 60);
    doc.text(data.verdict, 165, 50, { align: "center" });

    const tableRows = data.details.map(item => {
        let tip = getDynamicTip(item.feedback, item.score, item.type, item.answer);
        tip = tip.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        
        const cleanFeedback = item.feedback ? item.feedback.replace(/[\r\n]+/g, " ") : "";
        const fullFeedback = `${cleanFeedback}\n\n>> ${tip}`;
        
        return [item.type, item.answer, fullFeedback, item.score];
    });

    autoTable(doc, {
        startY: 75,
        head: [['Test', 'Your Response', 'AI Analysis & Feedback', 'Score']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 10, halign: 'center' },
        bodyStyles: { fontSize: 9, cellPadding: 4, valign: 'top', overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 17, fontStyle: 'bold' },       
            1: { cellWidth: 45, fontStyle: 'italic' },     
            2: { cellWidth: 105, overflow: 'linebreak' },   
            3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' } 
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                const scoreVal = parseFloat(data.cell.raw);
                if (scoreVal > 6) data.cell.styles.textColor = [39, 174, 96];
                else if (scoreVal < 4) data.cell.styles.textColor = [231, 76, 60];
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    if (finalY > 250) { doc.addPage(); finalY = 20; }

    if (data.olq_analysis) {
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text("15 Officer Like Qualities (OLQ) Assessment", 14, finalY);
        finalY += 8;

        const olqRows = Object.entries(data.olq_analysis).map(([olq, score]) => {
            return [olq, `${score > 0 ? Math.min(score, 10).toFixed(1) : "0"} / 10`];
        });

        autoTable(doc, {
            startY: finalY,
            head: [['Quality', 'Score (Out of 10)']],
            body: olqRows,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255, fontSize: 10 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 120 },
                1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14 }
        });

        finalY = doc.lastAutoTable.finalY + 15;
        if (finalY > 260) { doc.addPage(); finalY = 20; }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(39, 174, 96); 
        doc.text(`Strong Areas: ${data.strong_areas?.join(", ")}`, 14, finalY);
        finalY += 7;
        doc.setTextColor(231, 76, 60); 
        doc.text(`Areas to Improve: ${data.weak_areas?.join(", ")}`, 14, finalY);
    }

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('Generated by SSB AI System', 14, doc.internal.pageSize.height - 10);
        doc.text('Page ' + i + ' of ' + pageCount, 196, doc.internal.pageSize.height - 10, { align: "right" });
    }

    doc.save(`SSB_Report_${data.candidate_name}.pdf`);
  };

  if (!data) return <div style={{padding: '50px', textAlign: 'center', color: '#555'}}>Generating Analytics Report...</div>;

  return (
    <div style={styles.container}>
      <h1 style={{textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', color: '#2c3e50'}}>
        📊 Candidate Analytics Report
      </h1>

      <div style={styles.summaryBox}>
        <div style={{textAlign: 'center'}}>
            <h3 style={{color: '#7f8c8d', marginBottom: '5px'}}>Candidate Name</h3>
            <h2 style={{margin: 0}}>{data.candidate_name}</h2>
        </div>
        <div style={{textAlign: 'center'}}>
            <h3 style={{color: '#7f8c8d', marginBottom: '5px'}}>Overall Score</h3>
            <div style={{...styles.scoreCircle, backgroundColor: data.overall_score > 5 ? '#27ae60' : '#e74c3c'}}>
                {data.overall_score}/10
            </div>
        </div>
        <div style={{textAlign: 'center'}}>
            <h3 style={{color: '#7f8c8d', marginBottom: '5px'}}>Final Verdict</h3>
            <h2 style={{color: data.verdict_color, border: `2px solid ${data.verdict_color}`, padding: '5px 15px', borderRadius: '5px', display: 'inline-block'}}>
                {data.verdict}
            </h2>
        </div>
      </div>

      {data.olq_analysis && (
        <div style={{marginTop: '30px', padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px'}}>
            <h3 style={{color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px'}}>🧠 15 OLQ Assessment</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                {Object.entries(data.olq_analysis).map(([olq, score]) => (
                    <div key={olq} style={{marginBottom: '10px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px'}}>
                            <strong>{olq}</strong>
                            <span>{score > 0 ? Math.min(score, 10).toFixed(1) : "0"} / 10</span>
                        </div>
                        <div style={{width: '100%', backgroundColor: '#ecf0f1', borderRadius: '5px', height: '8px'}}>
                            <div style={{
                                width: `${Math.min(score * 10, 100)}%`, 
                                backgroundColor: score > 7 ? '#27ae60' : (score > 4 ? '#f39c12' : '#e74c3c'),
                                height: '100%', borderRadius: '5px'
                            }}></div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', borderLeft: '5px solid #3498db'}}>
                <strong>💪 Strong Areas:</strong> {data.strong_areas?.join(", ")} <br/>
                <strong>⚠️ Areas to Improve:</strong> {data.weak_areas?.join(", ")}
            </div>
        </div>
      )}

      {data.details && (
         <div style={{marginTop: '30px', padding: '25px', backgroundColor: '#2c3e50', color: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
            <h3 style={{borderBottom: '1px solid #7f8c8d', paddingBottom: '10px', marginBottom: '20px'}}>🎙️ Voice & Tone Analytics</h3>
            <div style={{display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px'}}>
                <div style={{textAlign: 'center'}}>
                    <div style={{width: '90px', height: '90px', borderRadius: '50%', border: '6px solid #27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}}>
                        {Math.round(data.details.reduce((acc, item) => acc + (item.speech?.confidence || 70), 0) / data.details.length)}%
                    </div>
                    <p style={{fontSize: '14px'}}>Confidence</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <div style={{width: '90px', height: '90px', borderRadius: '50%', border: '6px solid #e67e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}}>
                        {Math.round(data.details.reduce((acc, item) => acc + (item.speech?.boldness || 60), 0) / data.details.length)}%
                    </div>
                    <p style={{fontSize: '14px'}}>Boldness</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <div style={{width: '90px', height: '90px', borderRadius: '50%', border: '6px solid #9b59b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', padding: '5px'}}>
                        {data.details[data.details.length - 1]?.speech?.tone || "Neutral"}
                    </div>
                    <p style={{fontSize: '14px'}}>Dominant Tone</p>
                </div>
            </div>
         </div>
      )}

      <h3 style={{marginTop: '30px', color: '#34495e'}}>📝 Test-wise Performance Analysis</h3>
      
      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
          <thead>
            <tr style={{backgroundColor: '#ecf0f1'}}>
              <th style={{...styles.th, width: '10%'}}>Test</th>
              <th style={{...styles.th, width: '25%'}}>Your Answer</th>
              <th style={{...styles.th, width: '55%'}}>AI Analysis & Feedback</th>
              <th style={{...styles.th, width: '10%', textAlign: 'center'}}>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.details.map((item, index) => (
              <tr key={index} style={{borderBottom: '1px solid #eee'}}>
                <td style={{...styles.td, fontWeight: 'bold', color: '#2c3e50'}}>{item.type}</td>
                
                <td style={{...styles.td, fontStyle: 'italic', color: '#555', fontSize: '14px'}}>
                    "{item.answer}"
                </td>
                
                <td style={styles.td}>
                    <div style={{marginBottom: '8px', fontWeight: '500', color: '#333'}}>{item.feedback}</div>
                    <div style={{backgroundColor: '#e8f4fc', padding: '8px', borderRadius: '5px', fontSize: '13px', color: '#2980b9', borderLeft: '3px solid #3498db'}}>
                        {/* FIX: Passing item.answer here */}
                        {"💡 " + getDynamicTip(item.feedback, item.score, item.type, item.answer)}
                    </div>
                </td>
                
                <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: item.score > 6 ? '#27ae60' : (item.score > 4 ? '#f39c12' : '#e74c3c')}}>
                    {item.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display: 'flex', gap: '20px', marginTop: '40px'}}>
          <button onClick={downloadPDF} style={{...styles.btn, backgroundColor: '#3498db'}}>
            📥 Download PDF Report
          </button>
          <button onClick={onRestart} style={{...styles.btn, backgroundColor: '#2c3e50'}}>
            🔄 Start New Assessment
          </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: '15px' },
  summaryBox: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', marginTop: '20px', border: '1px solid #e1e4e8' },
  scoreCircle: { width: '80px', height: '80px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  
  // --- FIXED TABLE STYLES ---
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', tableLayout: 'fixed' },
  th: { padding: '15px', textAlign: 'left', borderBottom: '2px solid #bdc3c7', color: '#7f8c8d', fontSize: '14px', textTransform: 'uppercase' },
  td: { 
      padding: '15px', 
      verticalAlign: 'top', 
      wordBreak: 'break-word',      // Critical Fix
      overflowWrap: 'break-word',   // Critical Fix
      whiteSpace: 'pre-wrap'        // Preserves formatting and wraps
  },
  
  btn: { flex: 1, padding: '15px 30px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', transition: '0.3s', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }
};