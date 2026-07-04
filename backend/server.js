const express = require('express');
const cors = require('cors');
const app = express();
// 변경: Render가 제공하는 포트를 사용하고, 없으면 8080을 씁니다.
const PORT = process.env.PORT || 8080;
// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 사용자 로그를 받는 API 엔드포인트
app.post('/api/log', (req, res) => {
    const { userId, action, timestamp, details } = req.body;
    
    // 향후 이 부분을 MongoDB 저장 로직으로 대체합니다.
    console.log(`[USER LOG] ID: ${userId} | Action: ${action} | Time: ${timestamp}`);
    console.log(`Details:`, details);

    res.status(200).json({ message: "로그가 성공적으로 기록되었습니다." });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});