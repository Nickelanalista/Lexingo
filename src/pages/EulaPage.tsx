import React from 'react';

const EulaPage: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100%', background: '#f8f9fa' }}>
      <iframe
        title="EULA - Lexingo AI"
        src="/eula/index.html"
        style={{ border: '0', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default EulaPage;

