import React from 'react';
import axios from 'axios';

function App() {
  const handleButtonClick = async (buttonName) => {
    // 몽고DB에 들어갈 데이터 구조입니다
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
      // 알려주신 Render 주소로 데이터를 쏩니다! (끝에 /api/log 필수)
      const response = await axios.post('https://memory-test-backend.onrender.com/api/log', logData);
      console.log("서버 응답:", response.data);
      alert(`'${buttonName}' 버튼 로그가 MongoDB에 잘 저장되었어요!`);
    } catch (error) {
      console.error("로그 전송 실패:", error);
      alert("전송에 실패했습니다. (콘솔 창을 확인해주세요)");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Working Memory Test</h1>
      <p>버튼을 눌러 사용자 로그가 클라우드 DB에 쌓이는지 테스트해보세요.</p>
      
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