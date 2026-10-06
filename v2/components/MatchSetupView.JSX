import React, { useEffect, useState } from 'react';

export default function MatchSetupView({ matchId, userRole }) {
  const [setups, setSetups] = useState([]);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/setup`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setSetups(data));
  }, [matchId]);

  return (
    <div className="setup-container">
      <h2>ترکیب و تاکتیک تیم‌ها</h2>
      {setups.map(setup => (
        <div key={setup.id} className="team-card" style={{ border: '1px solid #ddd', margin: '10px', padding: '15px' }}>
          <h3>تیم: {setup.teamId}</h3>
          
          {/* تصویر ترکیب - قابل مشاهده برای همه */}
          <div className="lineup-section">
            <h4>تصویر ترکیب بارگذاری‌شده</h4>
            <img src={setup.lineupImage} alt="ترکیب تیم" style={{ maxWidth: '100%' }} />
          </div>

          {/* تاکتیک محرمانه - فقط برای ادمین نمایش داده می‌شود */}
          {userRole === 'ADMIN' && setup.tactics && (
            <div className="tactics-section" style={{ background: '#fff3cd', padding: '10px', marginTop: '10px' }}>
              <h4>بخش اختصاصی ادمین (تاکتیک)</h4>
              <p><strong>سیستم:</strong> {setup.tactics.formation}</p>
              <p><strong>استراتژی:</strong> {setup.tactics.mentality}</p>
              <p><strong>دستورات:</strong> {setup.tactics.instructions}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}