const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
console.log("Mongo URI:", MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(() => console.log('🎉 MongoDB 연결 성공!'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// =========================================================
// 2. 데이터 구조(Schema) 3개로 분리 생성
// =========================================================

// ① 로그인(정보 입력) 로그 스키마
const LoginSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    user_name: { type: String, required: true },
    age: { type: String, required: true },
    timestamp: { type: String, required: true } // KST 문자열 저장
});

// ② n-back 로그 스키마
const NBackSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    nback_level: { type: Number, required: true },
    trial: { type: Number, required: true },
    user_answer: { type: String, required: true },
    correct_answer: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
    reaction_time: { type: Number, default: null }, // ms 단위, 시간 초과 시 null
    timestamp: { type: String, required: true }
});

// ③ Digit Span 로그 스키마
const DigitSpanSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    level: { type: Number, required: true },
    trial: { type: Number, required: true },
    sequence: { type: String, required: true },
    user_answer: { type: String, required: true },
    correct_answer: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
    reaction_time: { type: Number, default: null }, // ms 단위, 시간 초과 시 null
    timestamp: { type: String, required: true }
});

// 몽고DB 모델 생성
const LoginLog = mongoose.model('LoginLog', LoginSchema);
const NBackLog = mongoose.model('NBackLog', NBackSchema);
const DigitSpanLog = mongoose.model('DigitSpanLog', DigitSpanSchema);


// =========================================================
// 3. 데이터를 받아서 저장하는 API
// =========================================================
app.post('/api/log', async (req, res) => {
    // 프론트에서 보낸 logType으로 어떤 스키마에 저장할지 결정합니다.
    const { logType, ...data } = req.body;
    
    try {
        if (logType === 'LOGIN') {
            await new LoginLog(data).save();
            console.log(`[DB 저장] LOGIN | User: ${data.user_name}`);
        } 
        else if (logType === 'NBACK') {
            await new NBackLog(data).save();
            console.log(`[DB 저장] N-BACK | User: ${data.user_id} | Trial: ${data.trial} | Correct: ${data.is_correct}`);
        } 
        else if (logType === 'DIGITSPAN') {
            await new DigitSpanLog(data).save();
            console.log(`[DB 저장] DIGIT SPAN | User: ${data.user_id} | Level: ${data.level} | Correct: ${data.is_correct}`);
        }

        res.status(200).json({ message: "로그가 MongoDB에 성공적으로 저장되었습니다." });
    } catch (error) {
        console.error("❌ DB 저장 에러:", error);
        res.status(500).json({ error: "DB 저장 중 오류가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});