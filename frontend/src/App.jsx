import React from 'react';
import axios from 'axios';

function App() {
  const handleButtonClick = async (buttonName) => {
    const logData = {
      userId: "test_user_01",
      action: "BUTTON_CLICK",
      timestamp: new Date().toISOString(),
      details: {
        buttonName: buttonName,
        testType: "n-back"
      }
    };

    try {
      const response = await axios.post('http://localhost:8080/api/log', logData);
      console.log("서버 응답:", response.data);
      alert(`'${buttonName}' 버튼 로그가 백엔드로 전송되었습니다!`);
    } catch (error) {
      console.error("로그 전송 실패:", error);
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Working Memory Test</h1>
      <p>버튼을 눌러 사용자 로그가 쌓이는지 테스트해보세요.</p>
      
      <button 
        onClick={() => handleButtonClick("O (Match)")}
        style={{ margin: '10px', padding: '10px 20px', fontSize: '18px' }}
      >
        O (맞음)
      </button>
      
      <button 
        onClick={() => handleButtonClick("X (Mismatch)")}
        style={{ margin: '10px', padding: '10px 20px', fontSize: '18px' }}
      >
        X (틀림)
      </button>
    </div>
  );
}

export default App;