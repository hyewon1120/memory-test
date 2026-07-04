const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// 1. MongoDB 연결 (미리 설정하신 .env 파일의 MONGO_URI를 사용합니다)
// URI 맨 끝에 /memory_test 라고 적혀있으면 그 이름으로 DB가 자동 생성됩니다.
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('🎉 MongoDB 연결 성공!'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// 2. 데이터 구조(Schema) 만들기
// 학생이 누른 버튼 로그를 어떤 형태로 저장할지 정의합니다.
const LogSchema = new mongoose.Schema({
    userId: { type: String, required: true },     // 유저 식별자
    action: { type: String, required: true },     // 어떤 행동을 했는지 (예: BUTTON_CLICK)
    timestamp: { type: Date, default: Date.now }, // 클릭한 시간
    details: mongoose.Schema.Types.Mixed          // 기타 상세 정보 (n-back 종류, 맞춤/틀림 등)
});

// 'UserLog'라는 이름으로 모델을 만듭니다. 
// 몽고DB에는 자동으로 소문자 복수형인 'userlogs'라는 컬렉션(테이블)이 생성됩니다.
const Log = mongoose.model('UserLog', LogSchema);

// 3. 데이터를 받아서 저장하는 API
app.post('/api/log', async (req, res) => {
    const { userId, action, timestamp, details } = req.body;
    
    try {
        // 기존의 console.log 대신, 새로운 데이터 문서를 생성합니다.
        const newLog = new Log({
            userId,
            action,
            timestamp,
            details
        });

        // 몽고DB에 실제 저장! (이때 DB와 컬렉션이 없으면 자동 생성됨)
        await newLog.save();
        
        console.log(`[DB 저장 완료] ID: ${userId} | Action: ${action}`);
        res.status(200).json({ message: "로그가 MongoDB에 성공적으로 저장되었습니다." });
    } catch (error) {
        console.error("❌ DB 저장 에러:", error);
        res.status(500).json({ error: "DB 저장 중 오류가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});