const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'myweb_data'
};

// 全文搜索
app.get('/search', async (req, res) => {
    const { q } = req.query;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            `SELECT * FROM news WHERE title LIKE ? OR author LIKE ? OR summary LIKE ?`,
            [`%${q}%`, `%${q}%`, `%${q}%`]
        );
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('数据库查询错误:', error);
        res.status(500).send('服务器错误');
    }
});

// 问卷提交
app.post('/submit-questionnaire', async (req, res) => {
    const {
        work, gender, phone, email, education, age, amount1, date, amount2, amount3,
        opinion, insight, rating, suggestion
    } = req.body;

    // 处理可能的 undefined 值，将其设置为 null 或空字符串
    const phoneNumber = phone || null;
    const emailAddress = email || null;
    const awareDate = date || null;
    const suggestionText = suggestion || null;
    const insightText = insight || null;
    const ratingValue = rating || null;

    // 将 opinion 数组转换为 JSON 字符串
    const opinionJson = JSON.stringify(opinion);

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            `INSERT INTO question (work, gender, phone, email, education, age, data, awareness1,awareness2,awareness3, opinions, rating, suggestions, insights)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [work, gender, phoneNumber, emailAddress, education, age, awareDate, amount1,amount2,amount3, opinionJson, ratingValue, suggestionText, insightText]
        );
        await connection.end();
        res.redirect('/ok.html'); // 跳转到 ok.html
    } catch (error) {
        console.error('数据库存储出错:', error);
        res.status(500).json({ error: '服务器错误，无法存储问卷数据' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
