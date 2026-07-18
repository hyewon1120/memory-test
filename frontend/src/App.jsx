import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // ---------------------------------------------------------
  // 1. 공통 및 유저 정보 상태
  // ---------------------------------------------------------
  const [step, setStep] = useState('start');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [userId, setUserId] = useState(''); // 고유 유저 아이디

  // ---------------------------------------------------------
  // 2. n-back 전용 상태
  // ---------------------------------------------------------
  const [nBackLevel, setNBackLevel] = useState(2); 
  const [trialIndex, setTrialIndex] = useState(0); 
  const [nBackSequence, setNBackSequence] = useState([]); 
  const [nBackTimeLeft, setNBackTimeLeft] = useState(10); 
  const [nBackIsProcessing, setNBackIsProcessing] = useState(false); 
  const [nBackStartTime, setNBackStartTime] = useState(0); // RT 측정을 위한 시작 시간

  // ---------------------------------------------------------
  // 3. Digit Span 전용 상태
  // ---------------------------------------------------------
  const [dsLevel, setDsLevel] = useState(3);         
  const [dsSequence, setDsSequence] = useState([]);  
  const [dsIndex, setDsIndex] = useState(0);         
  const [dsPhase, setDsPhase] = useState('showing'); 
  const [dsInputValue, setDsInputValue] = useState(''); 
  const [dsShowBlank, setDsShowBlank] = useState(false); 
  const [dsTrialCount, setDsTrialCount] = useState(0); 
  const [dsWrongCount, setDsWrongCount] = useState(0); 
  const [dsTimeLeft, setDsTimeLeft] = useState(20);
  const [dsIsProcessing, setDsIsProcessing] = useState(false); 
  const [dsStartTime, setDsStartTime] = useState(0); // RT 측정을 위한 시작 시간

  // =========================================================
  // 유틸리티: KST(한국 표준시) 시간 생성기
  // =========================================================
  const getKST = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));
    
    const pad = (n) => n.toString().padStart(2, '0');
    return `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())} ${pad(kst.getHours())}:${pad(kst.getMinutes())}:${pad(kst.getSeconds())}`;
  };

  // =========================================================
  // 화면 이동 로직
  // =========================================================
  const goToInfo = () => setStep('info');
  
  const goToInstructions = async () => {
    if (name.trim() === '' || age.trim() === '') {
      alert('이름과 만나이를 모두 입력해주세요!');
      return;
    }
    
    // [로그 1] 고유 유저 ID 생성 및 로그인 정보 DB 전송
    const newUserId = 'USER_' + Date.now() + Math.floor(Math.random() * 1000);
    setUserId(newUserId);

    const loginLog = {
      logType: 'LOGIN',
      user_id: newUserId,
      user_name: name,
      age: age,
      timestamp: getKST()
    };
    
    axios.post('http://localhost:8080/api/log', loginLog).catch(e => console.error(e));
    setStep('instructions');
  };

  const goToExample = () => setStep('example');
  const goToLevel = () => setStep('level');

  // =========================================================
  // n-back 로직
  // =========================================================
  const generateInitialSequence = (n) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const shuffled = letters.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  const generateNBackLetter = (currentSeq, level) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (currentSeq.length < level) return letters[Math.floor(Math.random() * letters.length)];

    const isMatch = Math.random() < 0.33; 
    const targetLetter = currentSeq[currentSeq.length - level];
    if (isMatch) return targetLetter; 
    
    const otherLetters = letters.filter(l => l !== targetLetter);
    return otherLetters[Math.floor(Math.random() * otherLetters.length)];
  };

  const startNBack = (selectedLevel) => {
    setNBackLevel(selectedLevel);
    setTrialIndex(0); 
    setNBackSequence(generateInitialSequence(selectedLevel)); 
    setNBackTimeLeft(10);
    setNBackIsProcessing(false);
    setStep('playing');
  };

  const getMaxNBackQuestions = (level) => {
    if (level === 1) return 24;
    if (level === 2) return 24;
    if (level === 3) return 28;
    return 24; 
  };

  // 알파벳이 화면에 떴을 때 RT 측정을 위해 시간 기록
  useEffect(() => {
    if (step === 'playing' && trialIndex >= nBackLevel) {
      setNBackStartTime(Date.now());
    }
  }, [trialIndex, step, nBackLevel]);

  const handleNBackAnswer = (actionType) => {
    if (nBackIsProcessing) return;
    setNBackIsProcessing(true);

    const currentLetter = nBackSequence[trialIndex];
    const targetLetter = nBackSequence[trialIndex - nBackLevel];
    const isActuallyMatch = (currentLetter === targetLetter);

    let isCorrect = false;
    if (actionType === 'MATCH' && isActuallyMatch) isCorrect = true;
    if (actionType === 'MISMATCH' && !isActuallyMatch) isCorrect = true;
    if (actionType === 'TIMEOUT') isCorrect = false;

    const currentQuestionNum = trialIndex - nBackLevel + 1;
    const reactionTime = actionType === 'TIMEOUT' ? null : (Date.now() - nBackStartTime);

    // [로그 2] n-back 응답 데이터 DB 전송
    const logData = {
      logType: 'NBACK',
      user_id: userId,
      nback_level: nBackLevel, // DB Schema 명세에 맞춤
      trial: currentQuestionNum,
      user_answer: actionType === 'MATCH' ? 'O' : actionType === 'MISMATCH' ? 'X' : 'TIMEOUT',
      correct_answer: isActuallyMatch ? 'O' : 'X',
      is_correct: isCorrect,
      reaction_time: reactionTime,
      timestamp: getKST()
    };
    
    axios.post('http://localhost:8080/api/log', logData).catch(err => console.error(err));
    
    const maxQuestions = getMaxNBackQuestions(nBackLevel);

    if (currentQuestionNum >= maxQuestions) {
      setStep('nback-end');
      setNBackIsProcessing(false);
    } else {
      setNBackSequence(prev => [...prev, generateNBackLetter(prev, nBackLevel)]);
      setTrialIndex(prev => prev + 1);
      setNBackTimeLeft(10); 
      setTimeout(() => setNBackIsProcessing(false), 200);
    }
  };

  useEffect(() => {
    let timer;
    if (step === 'playing') {
      if (trialIndex < nBackLevel) {
        timer = setTimeout(() => {
          if (trialIndex === nBackLevel - 1) {
            setNBackSequence(prev => [...prev, generateNBackLetter(prev, nBackLevel)]);
            setTrialIndex(prev => prev + 1);
            setNBackTimeLeft(10); 
          } else {
            setTrialIndex(prev => prev + 1);
          }
        }, 2000);
      } else {
        if (nBackTimeLeft > 0) {
          timer = setTimeout(() => setNBackTimeLeft(prev => prev - 1), 1000);
        } else {
          handleNBackAnswer('TIMEOUT');
        }
      }
    }
    return () => clearTimeout(timer);
  }, [step, trialIndex, nBackLevel, nBackTimeLeft]);

  // =========================================================
  // Digit Span 로직
  // =========================================================
  const startDigitSpanInstructions = () => setStep('ds-instructions');
  const goToDsExample = () => setStep('ds-example');

  const generateDsSequence = (length) => {
    while (true) {
      const seq = [];
      const counts = {};
      for (let i = 0; i < length; i++) {
        const candidates = [];
        for (let num = 1; num <= 9; num++) {
          if (i > 0 && seq[i - 1] === num) continue;
          if (length === 3 && seq.includes(num)) continue;
          if (length >= 4 && length <= 6 && (counts[num] || 0) >= 2) continue;
          if (length >= 7 && (counts[num] || 0) >= 3) continue;
          candidates.push(num);
        }
        if (candidates.length === 0) break;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        seq.push(chosen);
        counts[chosen] = (counts[chosen] || 0) + 1;
      }
      if (seq.length === length) return seq;
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

  // 입력창이 떴을 때 RT 측정을 위해 시간 기록
  useEffect(() => {
    if (step === 'ds-playing' && dsPhase === 'input') {
      setDsStartTime(Date.now());
    }
  }, [step, dsPhase]);

  useEffect(() => {
    let timer;
    if (step === 'ds-playing' && dsPhase === 'input') {
      if (dsTimeLeft > 0) {
        timer = setTimeout(() => {
          setDsTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        handleDsSubmit(true); 
      }
    }
    return () => clearTimeout(timer);
  }, [step, dsPhase, dsTimeLeft]);

  const handleDsSubmit = (isTimeout = false) => {
    if (dsIsProcessing) return;
    setDsIsProcessing(true);

    const inputVal = isTimeout ? "" : dsInputValue.trim();
    
    if (!isTimeout && inputVal === '') {
      alert('숫자를 입력해주세요!');
      setDsIsProcessing(false);
      return;
    }

    const correctAnswerStr = dsSequence.slice().reverse().join(' ');
    const formattedInput = inputVal.split('').join(' '); // 띄어쓰기로 변환해서 저장
    const isCorrect = !isTimeout && (inputVal === dsSequence.slice().reverse().join(''));
    const reactionTime = isTimeout ? null : (Date.now() - dsStartTime);

    // [로그 3] Digit Span 응답 데이터 DB 전송
    const logData = {
      logType: 'DIGITSPAN',
      user_id: userId,
      level: dsLevel,
      trial: dsTrialCount + 1,
      sequence: dsSequence.join(' '),
      user_answer: isTimeout ? 'TIMEOUT' : formattedInput,
      correct_answer: correctAnswerStr,
      is_correct: isCorrect,
      reaction_time: reactionTime,
      timestamp: getKST()
    };
    
    axios.post('http://localhost:8080/api/log', logData).catch(err => console.error(err));

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
      setDsIsProcessing(false);
    } else if (moveNextLevel) {
      if (dsLevel < 8) {
        const nextLevel = dsLevel + 1;
        setDsLevel(nextLevel);
        setDsTrialCount(0);
        setDsWrongCount(0);
        prepareNextDsTrial(nextLevel);
        setTimeout(() => setDsIsProcessing(false), 200);
      } else {
        setStep('final-end');
        setDsIsProcessing(false);
      }
    } else {
      prepareNextDsTrial(dsLevel);
      setTimeout(() => setDsIsProcessing(false), 200);
    }
  };

  // =========================================================
  // 렌더링 화면부
  // =========================================================
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {step === 'start' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '40px', lineHeight: '1.2', color: 'var(--text-h)' }}>Working Memory<br />Test</h1>
          <button onClick={goToInfo} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>시작하기</button>
        </div>
      )}

      {step === 'info' && (
        <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '30px', color: 'var(--text-h)' }}>Info</h2>
          <div style={{ marginBottom: '20px', textAlign: 'left', width: '300px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text)' }}>이름을 입력하세요.</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" style={{ width: '100%', padding: '10px', fontSize: '18px', borderRadius: '5px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '40px', textAlign: 'left', width: '300px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text)' }}>만나이를 입력하세요.</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 25" style={{ width: '100%', padding: '10px', fontSize: '18px', borderRadius: '5px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }} />
          </div>
          <button onClick={goToInstructions} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {step === 'instructions' && (
        <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px', color: 'var(--text-h)' }}>n-back</h2>
          <div style={{ backgroundColor: 'var(--code-bg)', padding: '30px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '40px', maxWidth: '650px', textAlign: 'left', lineHeight: '1.8', fontSize: '18px', color: 'var(--text)' }}>
            <p style={{ margin: '10px 0', textAlign: 'center', marginBottom: '20px' }}>이 실험은 화면에 나타나는 알파벳이 <strong>n번째 전에 나타난 알파벳</strong>과 같은지 판단하는 기억력 테스트입니다.</p>
            
            <p style={{ margin: '10px 0', color: 'var(--accent)', fontWeight: 'bold' }}>[진행 방식]</p>
            <p style={{ margin: '10px 0' }}>1. 실험이 시작되면 <strong>처음 n개의 알파벳은 O/X 버튼 없이 2초 간격으로</strong> 나타났다 사라집니다. (이때의 처음 n개 알파벳은 각자 다 다르게 나타납니다.)</p>
            <p style={{ margin: '10px 0' }}>2. 그 이후부터는 화면에 알파벳이 나타날 때마다 이전 n번째 알파벳과 비교하여, 같으면 <strong>O</strong>, 다르면 <strong>X</strong>를 누릅니다.</p>
            <p style={{ margin: '10px 0' }}>3. 각 문제마다 응답할 수 있는 <strong>제한 시간은 10초</strong>입니다. 최대한 빠르고 정확하게 응답해 주세요.</p>
            <p style={{ margin: '10px 0', marginTop: '20px', fontSize: '16px' }}>※ 총 진행 문제: 1-back (24개), 2-back (24개), 3-back (28개)</p>
          </div>
          <button onClick={goToExample} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {step === 'example' && (
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '20px', color: 'var(--text-h)' }}>EX) 2-back</h2>
          <div style={{ backgroundColor: 'var(--social-bg)', padding: '30px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '40px', maxWidth: '650px', textAlign: 'left', lineHeight: '1.8', fontSize: '18px', color: 'var(--text-h)' }}>
            <p style={{ margin: '0 0 20px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: 'var(--accent)' }}>현재 알파벳을 두 칸 전에 나타난 알파벳과 비교합니다.</p>
            <div style={{ textAlign: 'center', fontSize: '28px', margin: '20px 0', letterSpacing: '8px', fontWeight: 'bold' }}>A → B → A → C → C</div>
            <ul style={{ listStyleType: 'none', padding: '0 20px', margin: '30px 0' }}>
              <li style={{ marginBottom: '12px' }}>🟢 <strong>세 번째 A:</strong> 두 칸 전 알파벳도 A이므로 <strong>O</strong></li>
              <li style={{ marginBottom: '12px' }}>🔴 <strong>네 번째 C:</strong> 두 칸 전 알파벳은 B이므로 <strong>X</strong></li>
              <li style={{ marginBottom: '12px' }}>🔴 <strong>다섯 번째 C:</strong> 두 칸 전 알파벳은 A이므로 <strong>X</strong></li>
            </ul>
            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: 'var(--bg)', borderRadius: '8px', fontSize: '15px', color: 'var(--text)', borderLeft: '4px solid var(--accent)' }}>
              <strong>※ 참고:</strong> 처음 2개의 알파벳은 응답 버튼 없이 <strong>2초 간격</strong>으로 자동으로 넘어가며, 3번째 알파벳부터 <strong>10초 안</strong>에 O/X를 누르시면 됩니다.
            </div>
          </div>
          <button onClick={goToLevel} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {step === 'level' && (
        <div style={{ marginTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '10px', color: 'var(--text-h)' }}>LEVEL</h2>
          <p style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '40px' }}>원하는 난이도를 선택하면 <strong>즉시 실험이 시작</strong>됩니다.</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[1, 2, 3].map((level) => (
              <button key={level} onClick={() => startNBack(level)} style={{ padding: '20px 40px', fontSize: '28px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px' }}>{level}-back</button>
            ))}
          </div>
        </div>
      )}

      {step === 'playing' && (
        <div style={{ marginTop: '50px' }}>
          <h2 style={{ color: 'var(--text-h)', marginBottom: '10px' }}>{nBackLevel}-back 실험 진행 중...</h2>
          
          {trialIndex >= nBackLevel && (
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
              문제: {trialIndex - nBackLevel + 1} / {getMaxNBackQuestions(nBackLevel)}
            </p>
          )}

          <div style={{ fontSize: '100px', margin: '40px 0', fontWeight: 'bold', color: 'var(--text-h)' }}>
            {nBackSequence[trialIndex]}
          </div>
          
          {trialIndex < nBackLevel ? (
            <div style={{ fontSize: '18px', color: 'var(--text)', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              (처음 {nBackLevel}개의 알파벳은 눈으로만 기억하세요 - 2초 뒤 자동 전환)
            </div>
          ) : (
            <div style={{ height: '100px' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: nBackTimeLeft <= 3 ? '#d9534f' : 'var(--text)', marginBottom: '15px' }}>
                ⏱️ 남은 시간: {nBackTimeLeft}초
              </p>
              <button disabled={nBackIsProcessing} onClick={() => handleNBackAnswer("MATCH")} style={{ margin: '0 10px', padding: '15px 30px', fontSize: '20px', backgroundColor: '#a8d5e2', color: '#08060d', border: 'none', borderRadius: '8px', cursor: nBackIsProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: nBackIsProcessing ? 0.6 : 1 }}>O (맞음)</button>
              <button disabled={nBackIsProcessing} onClick={() => handleNBackAnswer("MISMATCH")} style={{ margin: '0 10px', padding: '15px 30px', fontSize: '20px', backgroundColor: '#ffb3ba', color: '#08060d', border: 'none', borderRadius: '8px', cursor: nBackIsProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: nBackIsProcessing ? 0.6 : 1 }}>X (틀림)</button>
            </div>
          )}
        </div>
      )}

      {step === 'nback-end' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '36px', color: 'var(--accent)' }}>첫 번째 실험(n-back)이 종료되었습니다!</h1>
          <p style={{ fontSize: '18px', color: 'var(--text)', marginTop: '20px' }}>수고하셨습니다. 곧바로 두 번째 기억력 테스트를 진행합니다.</p>
          <button onClick={startDigitSpanInstructions} style={{ marginTop: '40px', padding: '15px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 실험 준비하기</button>
        </div>
      )}

      {step === 'ds-instructions' && (
        <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px', color: 'var(--text-h)' }}>Digit Span Backward</h2>
          <div style={{ backgroundColor: 'var(--code-bg)', padding: '30px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '40px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.8', fontSize: '18px', color: 'var(--text)' }}>
            <p style={{ margin: '10px 0' }}>이 실험은 화면에 제시되는 숫자를 기억한 후, <strong>거꾸로 입력</strong>하는 기억력 테스트입니다.</p>
            <p style={{ margin: '10px 0' }}>화면 중앙에 숫자가 한 자리씩 나타납니다. 모든 숫자가 제시된 후 입력창이 나타나면, 숫자를 거꾸로 입력합니다.</p>
            <p style={{ margin: '10px 0', color: '#d9534f', fontWeight: 'bold' }}>가능한 한 빠르고 정확하게 응답해 주세요. (입력 시간은 20초로 제한됩니다.)</p>
          </div>
          <button onClick={goToDsExample} style={{ padding: '12px 30px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>다음 화면으로</button>
        </div>
      )}

      {step === 'ds-example' && (
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '20px', color: 'var(--text-h)' }}>Digit Span Backward</h2>
          <div style={{ backgroundColor: 'var(--social-bg)', padding: '30px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '40px', maxWidth: '650px', textAlign: 'center', lineHeight: '1.8', fontSize: '18px', color: 'var(--text-h)' }}>
            <p style={{ margin: '0 0 20px', fontWeight: 'bold', fontSize: '20px', color: 'var(--accent)' }}>EX) 4자리</p>
            <p style={{ margin: '10px 0' }}>화면에 다음과 같이 숫자가 제시됩니다.</p>
            <div style={{ fontSize: '28px', margin: '15px 0', letterSpacing: '8px', fontWeight: 'bold' }}>3 → 8 → 1 → 6</div>
            <p style={{ margin: '10px 0', marginTop: '30px' }}>입력창이 나타나면</p>
            <div style={{ fontSize: '24px', margin: '10px 0', letterSpacing: '4px', fontWeight: 'bold', color: '#3b82f6' }}>6 1 8 3</div>
            <p style={{ margin: '10px 0' }}>을 입력합니다.</p>
            
            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: 'var(--bg)', borderRadius: '8px', fontSize: '15px', color: 'var(--text)', borderLeft: '4px solid var(--accent)', textAlign: 'left' }}>
              <strong>※ 참고:</strong> 숫자는 한 번만 제시되며, 모두 사라진 후에는 다시 확인할 수 없습니다.<br/>
              <strong>※ 숫자는 1초씩 보여주며, 정답 입력 시간은 20초로 제한됩니다.</strong>
            </div>
          </div>
          <button onClick={startDigitSpan} style={{ padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px' }}>시작하기</button>
        </div>
      )}

      {step === 'ds-playing' && (
        <div style={{ marginTop: '50px' }}>
          <h2 style={{ color: 'var(--text-h)' }}>{dsLevel}자리 (문제: {dsTrialCount + 1}/3)</h2>
          
          {dsPhase === 'showing' && (
            <div style={{ fontSize: '100px', margin: '60px 0', fontWeight: 'bold', height: '120px', color: 'var(--text-h)' }}>
              {!dsShowBlank && dsIndex < dsSequence.length ? dsSequence[dsIndex] : ''}
            </div>
          )}

          {dsPhase === 'input' && (
            <div style={{ margin: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px' }}>
                숫자를 거꾸로 입력하세요.
              </p>
              
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: dsTimeLeft <= 5 ? '#d9534f' : 'var(--text)', marginBottom: '20px' }}>
                ⏱️ 남은 시간: {dsTimeLeft}초
              </p>

              <input 
                type="text" 
                value={dsInputValue}
                onChange={(e) => setDsInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter') handleDsSubmit(false);
                }}
                disabled={dsIsProcessing}
                style={{ fontSize: '30px', padding: '10px', width: '250px', textAlign: 'center', letterSpacing: '10px', borderRadius: '8px', border: '2px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
                autoFocus
              />
              <button 
                onClick={() => handleDsSubmit(false)}
                disabled={dsIsProcessing}
                style={{ marginTop: '30px', padding: '15px 40px', fontSize: '24px', fontWeight: 'bold', cursor: dsIsProcessing ? 'not-allowed' : 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', opacity: dsIsProcessing ? 0.6 : 1 }}
              >
                다음으로
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'final-end' && (
        <div style={{ marginTop: '100px' }}>
          <h1 style={{ fontSize: '36px', color: 'var(--text-h)' }}>모든 실험이 종료되었습니다.</h1>
          <p style={{ fontSize: '18px', color: 'var(--text)', marginTop: '20px' }}>끝까지 참여해 주셔서 감사합니다, {name}님!</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '40px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', border: '1px solid var(--border)', backgroundColor: 'var(--code-bg)', color: 'var(--text)' }}>처음으로 돌아가기</button>
        </div>
      )}

    </div>
  );
}

export default App;