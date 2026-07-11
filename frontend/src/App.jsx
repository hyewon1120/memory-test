import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // ---------------------------------------------------------
  // 1. 상태 관리 (State)
  // ---------------------------------------------------------
  const [step, setStep] = useState('start');
  
  // 참가자 정보
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  
  // n-back 전용 상태
  const [nBackLevel, setNBackLevel] = useState(2); 
  const [trialIndex, setTrialIndex] = useState(0); 
  const [currentTarget, setCurrentTarget] = useState('A');

  // Digit Span 전용 상태
  const [dsLevel, setDsLevel] = useState(3);         
  const [dsSequence, setDsSequence] = useState([]);  
  const [dsIndex, setDsIndex] = useState(0);         
  const [dsPhase, setDsPhase] = useState('showing'); 
  const [dsInputValue, setDsInputValue] = useState(''); 
  const [dsShowBlank, setDsShowBlank] = useState(false); 
  
  const [dsTrialCount, setDsTrialCount] = useState(0); 
  const [dsWrongCount, setDsWrongCount] = useState(0); 
  const [dsTimeLeft, setDsTimeLeft] = useState(20);

  // ---------------------------------------------------------
  // 2. 화면 이동 함수들 (n-back)
  // ---------------------------------------------------------
  const goToInfo = () => setStep('info');
  const goToInstructions = () => {
    if (name.trim() === '' || age.trim() === '') {
      alert('이름과 만나이를 모두 입력해주세요!');
      return;
    }
    setStep('instructions');
  };
  const goToExample = () => setStep('example');
  const goToLevel = () => setStep('level');
  
  const startNBack = (selectedLevel) => {
    setNBackLevel(selectedLevel);
    setTrialIndex(0); 
    setStep('playing');
  };

  const endNBack = () => setStep('nback-end');

  const handleNBackAnswer = async (actionType) => {
    const logData = {
      userId: name, action: actionType, timestamp: new Date().toISOString(),
      details: { target: currentTarget, age: age, nBackLevel: nBackLevel, trialIndex: trialIndex }
    };
    try {
      await axios.post('http://localhost:8080/api/log', logData);
      setTrialIndex(prev => prev + 1);
    } catch (error) {
      console.error(error);
    }
  };

  const nextAlphabetManual = () => setTrialIndex(prev => prev + 1);

  // ---------------------------------------------------------
  // 3. 로직 함수들 (Digit Span) - 중복/반복 예외 처리 적용
  // ---------------------------------------------------------
  const startDigitSpanInstructions = () => setStep('ds-instructions');
  const goToDsExample = () => setStep('ds-example');

  // 규칙 기반 랜덤 숫자 배열 생성기
  const generateDsSequence = (length) => {
    while (true) {
      const seq = [];
      const counts = {}; // 각 숫자가 전체 배열에서 몇 번 나왔는지 기록

      for (let i = 0; i < length; i++) {
        // 1~9 사이의 숫자 중에서 유효한 숫자 후보 필터링
        const candidates = [];
        for (let num = 1; num <= 9; num++) {
          // Rule 1: 바로 직전 숫자와 같은 숫자 제외 (연속 반복 피하기)
          if (i > 0 && seq[i - 1] === num) continue;

          // Rule 2: 3자리일 때는 중복 자체를 차단
          if (length === 3 && seq.includes(num)) continue;

          // Rule 3: 4~6자리일 때는 배열 전체에 같은 숫자가 최대 2개까지만 나오도록 제한
          if (length >= 4 && length <= 6 && (counts[num] || 0) >= 2) continue;

          // Rule 4: 7~8자리일 때는 같은 숫자가 4개 이상(즉, 3개까지만 가능) 나오지 않도록 제한
          if (length >= 7 && (counts[num] || 0) >= 3) continue;

          candidates.push(num);
        }

        // 만약 조건에 맞는 후보가 없다면 처음부터 다시 배열 구성 (실패 방지 루프)
        if (candidates.length === 0) break;

        // 후보군 중 하나를 무작위로 선택
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        seq.push(chosen);
        counts[chosen] = (counts[chosen] || 0) + 1;
      }

      // 지정한 길이에 맞게 온전한 배열이 완성되었다면 리턴
      if (seq.length === length) {
        return seq;
      }
    }
  };

  const prepareNextDsTrial = (level) => {
    setDsSequence(generateDsSequence(level));
    setDsIndex(0);
    setDsShowBlank(false);
    setDsPhase('showing');
    setDsInputValue('');
    setDsTimeLeft(20); 
  };

  const startDigitSpan = () => {
    setDsLevel(3); 
    setDsTrialCount(0);
    setDsWrongCount(0);
    prepareNextDsTrial(3);
    setStep('ds-playing');
  };

  // [타이머 1] 숫자를 1초씩 차례대로 보여주는 기능
  useEffect(() => {
    let timer;
    if (step === 'ds-playing' && dsPhase === 'showing') {
      if (dsIndex < dsSequence.length) {
        if (dsShowBlank) {
          timer = setTimeout(() => {
            setDsShowBlank(false);
            setDsIndex(prev => prev + 1);
          }, 200);
        } else {
          timer = setTimeout(() => {
            setDsShowBlank(true);
          }, 1000); 
        }
      } else {
        setDsPhase('input');
      }
    }
    return () => clearTimeout(timer);
  }, [step, dsPhase, dsIndex, dsSequence.length, dsShowBlank]);

  // [타이머 2] 입력 단계(input)에서 20초 카운트다운
  useEffect(() => {
    let timer;
    if (step === 'ds-playing' && dsPhase === 'input') {
      if (dsTimeLeft > 0) {
        timer = setTimeout(() => {
          setDsTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        alert('시간이 초과되었습니다! (오답 처리)');
        handleDsSubmit(true); 
      }
    }
    return () => clearTimeout(timer);
  }, [step, dsPhase, dsTimeLeft]);

  const handleDsSubmit = async (isTimeout = false) => {
    const inputVal = isTimeout ? "" : dsInputValue.trim();
    
    if (!isTimeout && inputVal === '') {
      alert('숫자를 입력해주세요!');
      return;
    }

    const correctAnswer = dsSequence.slice().reverse().join('');
    const isCorrect = !isTimeout && (inputVal === correctAnswer);

    const logData = {
      userId: name, action: 'DIGIT_SPAN_SUBMIT', timestamp: new Date().toISOString(),
      details: { age: age, level: dsLevel, sequence: dsSequence, userInput: inputVal, isCorrect: isCorrect, reason: isTimeout ? 'TIMEOUT' : 'USER_SUBMIT' }
    };
    try {
      await axios.post('http://localhost:8080/api/log', logData);
    } catch (error) {
      console.error(error);
    }

    const newTrialCount = dsTrialCount + 1;
    const newWrongCount = dsWrongCount + (isCorrect ? 0 : 1);
    
    setDsTrialCount(newTrialCount);
    setDsWrongCount(newWrongCount);

    let moveNextLevel = false;
    let gameOver = false;

    if (newWrongCount >= 2) {
      gameOver = true;
    } else if (newTrialCount === 3 && newWrongCount === 0) {
      moveNextLevel = true;
    } else if (newTrialCount === 3 && newWrongCount === 1) {
      moveNextLevel = false; 
    } else if (newTrialCount === 4) {
      if (isCorrect) moveNextLevel = true;
      else gameOver = true;
    }

    if (gameOver) {
      setStep('final-end');
    } else if (moveNextLevel) {
      if (dsLevel < 8) {
        const nextLevel = dsLevel + 1;
        setDsLevel(nextLevel);
        setDsTrialCount(0);
        setDsWrongCount(0);
        prepareNextDsTrial(nextLevel);
      } else {
        setStep('final-end');
      }
    } else {
      prepareNextDsTrial(dsLevel);
    }
  };

  // ---------------------------------------------------------
  // 4. 화면(UI) 렌더링
  // ---------------------------------------------------------
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {/* 1. 공통 시작 화면 */}
      {step === 'start' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '40px', lineHeight: '1.2' }}>Working Memory<br />Test</h1>
          <button onClick={goToInfo} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#aa3bff', color: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>시작하기</button>
        </div>
      )}

      {/* 2. 공통 정보 입력 화면 */}
      {step === 'info' && (
        <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '30px' }}>Info</h2>
          <div style={{ marginBottom: '20px', textAlign: 'left', width: '300px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이름을 입력하세요.</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" style={{ width: '100%', padding: '10px', fontSize: '18px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '40px', textAlign: 'left', width: '300px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>만나이를 입력하세요.</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 25" style={{ width: '100%', padding: '10px', fontSize: '18px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <button onClick={goToInstructions} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {/* 3. n-back 설명 화면 */}
      {step === 'instructions' && (
        <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px', color: '#333' }}>n-back</h2>
          <div style={{ backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '10px', border: '1px solid #e9ecef', marginBottom: '40px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.8', fontSize: '18px', color: '#444' }}>
            <p style={{ margin: '10px 0' }}>이 실험은 현재 화면에 나타난 알파벳이 <strong>n번째 전에 나타난 알파벳</strong>과 같은지 판단하는 기억력 테스트입니다.</p>
            <p style={{ margin: '10px 0' }}>화면 중앙에 알파벳이 한 글자씩 나타납니다.</p>
            <p style={{ margin: '10px 0' }}>현재 알파벳이 n번째 전에 나타난 알파벳과 같으면 <strong>O</strong>를 누르고, 다르면 <strong>X</strong>를 누릅니다.</p>
            <p style={{ margin: '10px 0', color: '#d9534f', fontWeight: 'bold' }}>가능한 한 빠르고 정확하게 응답해 주세요.</p>
          </div>
          <button onClick={goToExample} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {/* 4. n-back 예시 화면 */}
      {step === 'example' && (
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#333' }}>EX) 2-back</h2>
          <div style={{ backgroundColor: '#f4f3ec', padding: '30px', borderRadius: '10px', border: '1px solid #e5e4e7', marginBottom: '40px', maxWidth: '650px', textAlign: 'left', lineHeight: '1.8', fontSize: '18px', color: '#333' }}>
            <p style={{ margin: '0 0 20px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: '#aa3bff' }}>현재 알파벳을 두 칸 전에 나타난 알파벳과 비교합니다.</p>
            <div style={{ textAlign: 'center', fontSize: '28px', margin: '20px 0', letterSpacing: '8px', fontWeight: 'bold' }}>A → B → A → C → C</div>
            <ul style={{ listStyleType: 'none', padding: '0 20px', margin: '30px 0' }}>
              <li style={{ marginBottom: '12px' }}>🟢 <strong>세 번째 A:</strong> 두 칸 전 알파벳도 A이므로 <strong>O</strong></li>
              <li style={{ marginBottom: '12px' }}>🔴 <strong>네 번째 C:</strong> 두 칸 전 알파벳은 B이므로 <strong>X</strong></li>
              <li style={{ marginBottom: '12px' }}>🔴 <strong>다섯 번째 C:</strong> 두 칸 전 알파벳은 A이므로 <strong>X</strong></li>
            </ul>
            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', fontSize: '15px', color: '#666', borderLeft: '4px solid #aa3bff' }}>
              <strong>※ 참고:</strong> 2-back에서는 처음 두 개의 알파벳은 비교할 대상이 없으므로 응답하지 않습니다.
            </div>
          </div>
          <button onClick={goToLevel} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#aa3bff', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {/* 5. n-back 레벨 선택 화면 */}
      {step === 'level' && (
        <div style={{ marginTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '10px' }}>LEVEL</h2>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>원하는 난이도를 선택하면 <strong>즉시 실험이 시작</strong>됩니다.</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[1, 2, 3].map((level) => (
              <button key={level} onClick={() => startNBack(level)} style={{ padding: '20px 40px', fontSize: '28px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#aa3bff', color: 'white', border: 'none', borderRadius: '12px' }}>{level}-back</button>
            ))}
          </div>
        </div>
      )}

      {/* 6. n-back 실험 진행 화면 */}
      {step === 'playing' && (
        <div style={{ marginTop: '50px' }}>
          <h2>{nBackLevel}-back 실험 진행 중...</h2>
          <div style={{ fontSize: '100px', margin: '40px 0', fontWeight: 'bold' }}>{currentTarget}</div>
          {trialIndex < nBackLevel ? (
            <div style={{ fontSize: '18px', color: '#aaa', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>(처음 {nBackLevel}개의 알파벳은 눈으로만 기억하고 넘어가세요)</div>
          ) : (
            <div style={{ height: '64px' }}>
              <button onClick={() => handleNBackAnswer("MATCH")} style={{ margin: '0 10px', padding: '15px 30px', fontSize: '20px', backgroundColor: '#a8d5e2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>O (맞음)</button>
              <button onClick={() => handleNBackAnswer("MISMATCH")} style={{ margin: '0 10px', padding: '15px 30px', fontSize: '20px', backgroundColor: '#ffb3ba', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>X (틀림)</button>
            </div>
          )}
          <br /><br />
          <button onClick={nextAlphabetManual} style={{ padding: '10px 20px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>다음 알파벳 보기 (수동 테스트용)</button>
          <br /><br />
          <button onClick={endNBack} style={{ padding: '8px 16px', color: '#666', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textDecoration: 'underline' }}>n-back 실험 완료하기</button>
        </div>
      )}

      {/* 7. n-back 종료 -> Digit Span 전환 안내 */}
      {step === 'nback-end' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '36px', color: '#aa3bff' }}>첫 번째 실험(n-back)이 종료되었습니다!</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '20px' }}>수고하셨습니다. 곧바로 두 번째 기억력 테스트를 진행합니다.</p>
          <button onClick={startDigitSpanInstructions} style={{ marginTop: '40px', padding: '15px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 실험 준비하기</button>
        </div>
      )}

      {/* 8. Digit Span 설명 화면 */}
      {step === 'ds-instructions' && (
        <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px', color: '#333' }}>Digit Span Backward</h2>
          <div style={{ backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '10px', border: '1px solid #e9ecef', marginBottom: '40px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.8', fontSize: '18px', color: '#444' }}>
            <p style={{ margin: '10px 0' }}>이 실험은 화면에 제시되는 숫자를 기억한 후, <strong>거꾸로 입력</strong>하는 기억력 테스트입니다.</p>
            <p style={{ margin: '10px 0' }}>화면 중앙에 숫자가 한 자리씩 나타납니다. 모든 숫자가 제시된 후 입력창이 나타나면, 숫자를 거꾸로 입력합니다.</p>
            <p style={{ margin: '10px 0', color: '#d9534f', fontWeight: 'bold' }}>가능한 한 빠르고 정확하게 응답해 주세요. (입력 시간은 20초로 제한됩니다.)</p>
          </div>
          <button onClick={goToDsExample} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {/* 9. Digit Span 예시 화면 */}
      {step === 'ds-example' && (
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#333' }}>Digit Span Backward</h2>
          <div style={{ backgroundColor: '#f4f3ec', padding: '30px', borderRadius: '10px', border: '1px solid #e5e4e7', marginBottom: '40px', maxWidth: '650px', textAlign: 'center', lineHeight: '1.8', fontSize: '18px', color: '#333' }}>
            <p style={{ margin: '0 0 20px', fontWeight: 'bold', fontSize: '20px', color: '#aa3bff' }}>EX) 4자리</p>
            <p style={{ margin: '10px 0' }}>화면에 다음과 같이 숫자가 제시됩니다.</p>
            <div style={{ fontSize: '28px', margin: '15px 0', letterSpacing: '8px', fontWeight: 'bold' }}>3 → 8 → 1 → 6</div>
            <p style={{ margin: '10px 0', marginTop: '30px' }}>입력창이 나타나면</p>
            <div style={{ fontSize: '24px', margin: '10px 0', letterSpacing: '4px', fontWeight: 'bold', color: '#3b82f6' }}>6 1 8 3</div>
            <p style={{ margin: '10px 0' }}>을 입력합니다.</p>
            
            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', fontSize: '15px', color: '#666', borderLeft: '4px solid #aa3bff', textAlign: 'left' }}>
              <strong>※ 참고:</strong> 숫자는 한 번만 제시되며, 모두 사라진 후에는 다시 확인할 수 없습니다.<br/>
              <strong>※ 숫자는 1초씩 보여주며, 정답 입력 시간은 20초로 제한됩니다.</strong>
            </div>
          </div>
          <button onClick={startDigitSpan} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#aa3bff', color: 'white', border: 'none', borderRadius: '8px' }}>시작하기</button>
        </div>
      )}

      {/* 10. Digit Span 실제 실험 화면 */}
      {step === 'ds-playing' && (
        <div style={{ marginTop: '50px' }}>
          <h2>{dsLevel}자리 (문제: {dsTrialCount + 1}/3)</h2>
          
          {/* 숫자를 하나씩 보여주는 구간 */}
          {dsPhase === 'showing' && (
            <div style={{ fontSize: '100px', margin: '60px 0', fontWeight: 'bold', height: '120px' }}>
              {!dsShowBlank && dsIndex < dsSequence.length ? dsSequence[dsIndex] : ''}
            </div>
          )}

          {/* 거꾸로 입력받는 구간 */}
          {dsPhase === 'input' && (
            <div style={{ margin: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#aa3bff', marginBottom: '10px' }}>
                숫자를 거꾸로 입력하세요.
              </p>
              
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: dsTimeLeft <= 5 ? '#d9534f' : '#666', marginBottom: '20px' }}>
                ⏱️ 남은 시간: {dsTimeLeft}초
              </p>

              <input 
                type="text" 
                value={dsInputValue}
                onChange={(e) => setDsInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter') handleDsSubmit(false);
                }}
                style={{ fontSize: '30px', padding: '10px', width: '250px', textAlign: 'center', letterSpacing: '10px', borderRadius: '8px', border: '2px solid #ccc' }}
                autoFocus
              />
              <button 
                onClick={() => handleDsSubmit(false)}
                style={{ marginTop: '30px', padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}
              >
                다음으로
              </button>
            </div>
          )}
        </div>
      )}

      {/* 11. 최종 종료 화면 */}
      {step === 'final-end' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '36px' }}>모든 실험이 종료되었습니다.</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '20px' }}>끝까지 참여해 주셔서 감사합니다, {name}님!</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '40px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #aaa' }}>처음으로 돌아가기</button>
        </div>
      )}

    </div>
  );
}

export default App;