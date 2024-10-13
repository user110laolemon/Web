const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

// 配置MySQL数据库连接
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'myweb_data'
};

const sites = [
    {
        name: 'Youth',
        //中国青年网新闻搜索“进食障碍”
        //url: 'http://search.youth.cn/cse/search?s=15107678543080134641&entry=1&ie=gb2312&q=%BD%F8%CA%B3%D5%CF%B0%AD',
        //url: 'http://search.youth.cn/cse/search?q=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&p=6&s=15107678543080134641&entry=1',
        //中国青年网新闻搜索“厌食症”
        //url: 'http://search.youth.cn/cse/search?q=%E5%8E%8C%E9%A3%9F%E7%97%87&p=0&s=15107678543080134641&nsid=&entry=1',
        url: 'http://search.youth.cn/cse/search?q=%E5%8E%8C%E9%A3%9F%E7%97%87&p=21&s=15107678543080134641&nsid=&entry=1',
        encoding: 'utf-8',
        parse: function (html) {
            const $ = cheerio.load(html);
            const articles = [];

            $('.result').each((i, elem) => {
                const $title = $(elem).find('.c-title a');
                const title = $title.text().trim();
                const author = 'unknown';
                const url = $title.attr('href');
                const summary = $(elem).find('.c-abstract').text().trim();
                const date = $(elem).find('.c-showurl').text().match(/\d{4}-\d{1,2}-\d{1,2}/)[0]; // 提取日期
                const source = 'Youth';

                articles.push({
                    title,
                    url,
                    author,
                    date,
                    summary,
                    source
                });
            });

            return articles;
        }
    },
    {
        name: 'Sina',
        //新浪新闻搜索“进食障碍”
        //url: 'https://search.sina.com.cn/?q=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&c=news&from=channel&ie=utf-8',
        //新浪新闻搜索“厌食症”
        //url: 'https://search.sina.com.cn/?q=%E5%8E%8C%E9%A3%9F%E7%97%87&c=news&from=channel&ie=utf-8',
        url: 'https://search.sina.com.cn',
        encoding: 'utf-8',
        parse: function (html) {
            const $ = cheerio.load(html);
            const articles = [];
            $('.box-result').each((i, elem) => {
                const title = $(elem).find('h2 a').text().trim();
                const url = $(elem).find('h2 a').attr('href');
                const author = $(elem).find('.fgray_time').contents().first().text().trim();
                const dateString = $(elem).find('.fgray_time').contents().last().text().trim();
                const date = new Date(dateString);
                const summary = $(elem).find('.content').text().trim();
                const source = 'Sina';

                articles.push({
                    title,
                    url,
                    author,
                    date,
                    summary,
                    source
                });
            });
            return articles;
        }
    },
    {
        name: 'CCTV',
        //央视新闻搜索“进食障碍”
        //url: 'https://search.cctv.com/search.php?qtext=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&type=web',
        //url: 'https://search.cctv.com/search.php?qtext=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&sort=relevance&type=web&vtime=&datepid=1&channel=&page=2',
        //url: 'https://search.cctv.com/search.php?qtext=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&sort=relevance&type=web&vtime=&datepid=1&channel=&page=3',
        //url: 'https://search.cctv.com/search.php?qtext=%E8%BF%9B%E9%A3%9F%E9%9A%9C%E7%A2%8D&sort=relevance&type=web&vtime=&datepid=1&channel=&page=4',
        //央视新闻搜索“厌食症”
        //url: 'https://search.cctv.com/search.php?qtext=%E5%8E%8C%E9%A3%9F%E7%97%87&type=web',
        url: 'https://search.cctv.com/search.php?qtext=%E5%8E%8C%E9%A3%9F%E7%97%87&sort=relevance&type=web&vtime=&datepid=1&channel=&page=12',
        encoding: 'utf-8',
        parse: function (html) {
            const $ = cheerio.load(html);
            const articles = [];

            $('.image').each((i, elem) => {
                const $title = $(elem).find('.tit a');
                const title = $title.text().trim();
                const author = 'unknown';
                const $span = $(elem).find('.tit span');
                const url = $span.attr('lanmu1');
                const summary = $(elem).find('.bre').text().trim();
                const date = $(elem).find('.src-tim .tim').text().trim();
                const source = 'CCTV';

                articles.push({
                    title,
                    url,
                    author,
                    date,
                    summary,
                    source
                });
            });
            return articles;
        }
    }
];

async function saveToDatabase(article) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'INSERT INTO news (title, url, author, date, summary, source) VALUES (?, ?, ?, ?, ?, ?)',
            [article.title, article.url, article.author, article.date, article.summary, article.source]
        );
        await connection.end();
        return rows.insertId;
    } catch (error) {
        console.error("保存进数据库时发生错误：", error);
    }
}

async function crawl() {
    for (let site of sites) {
        try {
            console.log(`Crawling ${site.name}...`);
            const { data } = await axios.get(site.url);
            const articles = site.parse(data);
            console.log(`Parsed ${articles.length} articles from ${site.name}`);
            for (let article of articles) {
                const id = await saveToDatabase(article);
                if (id) {
                    article.id = id;
                }
            }
            console.log(`Finished crawling ${site.name}`);
        } catch (error) {
            console.error(`Error crawling ${site.name}:`, error);
        }
    }
}

crawl();
console.log('结束爬虫');

