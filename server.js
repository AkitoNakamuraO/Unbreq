'use strict';

const line = require('@line/bot-sdk');
const express = require('express');

// create LINE SDK config from env variables
const config = {
    channelAccessToken: 'assCEfo7r9TDQuacaDSpvHmewsyzWjUVNg64DQPEJOINk4nKhBB6/CO6+5xSopzei1IIDEgY4ysqs/aiEEXtTF1vy3vYGpEEXs6zyVp29NBUZPfPtULpANomScRbbJlPGm5Fe+t/Jkars1IAAHE/FAdB04t89/1O/w1cDnyilFU=',
    channelSecret: 'f051804d7ed16030e710a51cdfd88cb6'
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});



//SQLに接続し、データを返す関数
function connectionSql(sql, message) {
    return new Promise(resolve => {
        // requireの設定
        const mysql = require('mysql');
        // MySQLとのコネクションの作成
        const connection = mysql.createConnection({
            host: 'us-cdbr-east-02.cleardb.com',
            user: 'ba34e08d66d9ca',
            password: 'f7a13d7b',
            database: 'heroku_ce160c129bb4170'
        });
        // 接続
        connection.connect();
        //データを取得
        connection.query(sql, message, function(err, rows, fields) {
            resolve(rows);
        });
        // 接続終了
        connection.end();
    });
}

//ユーザーIDと地域のコードをuserデータベースに挿入する関数
function insertData(userId, cityCode) {
    return new Promise(resolve => {
        // requireの設定
        const mysql = require('mysql');
        // MySQLとのコネクションの作成
        const connection = mysql.createConnection({
            host: 'us-cdbr-east-02.cleardb.com',
            user: 'ba34e08d66d9ca',
            password: 'f7a13d7b',
            database: 'heroku_ce160c129bb4170'
        });
        // 接続
        connection.connect();

        connection.query('select * from user where user_id = ?', userId, function(err, rows, result) {
            //SQL文
            let sql = 'update user set city_code = ? where user_id = ?;';

            //データを挿入
            connection.query(sql, [cityCode, userId], function(err, result) {
                console.log(result);
            });
        });


        // 接続終了
        connection.end();
    });
}

//地域のコードを取得する関数
function getCityCode(name) {
    return new Promise(resolve => {
        // requireの設定
        const mysql = require('mysql');
        // MySQLとのコネクションの作成
        const connection = mysql.createConnection({
            host: 'us-cdbr-east-02.cleardb.com',
            user: 'ba34e08d66d9ca',
            password: 'f7a13d7b',
            database: 'heroku_ce160c129bb4170'
        });
        // 接続
        connection.connect();

        //SQL文
        let sql = 'select * from city where name = ?;';

        //データを挿入
        connection.query(sql, name, function(err, rows, fields) {
            resolve(rows[0].code);
        });

        // 接続終了
        connection.end();
    });
}

//テンプレートメッセージを作る関数
function createMessage(area) {
    let templateMessage = require('./UserInformationRegistration/template.json'); //ラインのテンプレートメッセージのテンプレートのjsonファイルを取得
    let responseMessage = []; //返信内容
    templateMessage.template.actions = []; //templateMessageのアクションボタンを初期化
    let count = 0; //ボタンテンプレートメッセージのアクションオブジェクトの制限が4個なのでカウントする。

    //アクションボタンを格納する
    area.forEach(area => {
        templateMessage.template.actions.push({
            "type": "message",
            "label": area,
            "text": area
        });

        count++;

        //4つの地域を格納したら、それをテンプレートメッセージとしてレスポンスメッセージに格納する
        if (count % 4 == 0) {
            const temp = JSON.parse(JSON.stringify(templateMessage)); //一時的にtemplateMessageオブジェクト深いコピーする
            responseMessage.push(temp);
            templateMessage.template.actions = []; //templateMessageのアクションボタンを初期化
        }
    });

    return responseMessage;
}

//地域の重複を無くして配列に入れる関数
function createCityList(data, dataName) {
    let area = [];

    if (dataName == 'area2') {
        data.forEach(data => {
            area.push(data.area2)
        });
    } else if (dataName == 'name') {
        data.forEach(data => {
            area.push(data.name)
        });
    }

    area = area.filter(function(x, i, self) {
        return self.indexOf(x) === i;
    });

    if ((area.length % 4) != 0) {
        const brank = 4 - area.length % 4;
        for (let i = 0; i < brank; i++) {
            area.push(' ');
        }
    }

    return area;
}

//ユーザーのシティコードを返す関数
function getUserCode(userId) {
    return new Promise(resolve => {
        // requireの設定
        const mysql = require('mysql');
        // MySQLとのコネクションの作成
        const connection = mysql.createConnection({
            host: 'us-cdbr-east-02.cleardb.com',
            user: 'ba34e08d66d9ca',
            password: 'f7a13d7b',
            database: 'heroku_ce160c129bb4170'
        });
        // 接続
        connection.connect();

        //SQL文
        let sql = 'select * from user where user_id = ?;';

        //データを取得
        connection.query(sql, userId, function(err, rows, fields) {
            resolve(rows[0].city_code);
        });

        // 接続終了
        connection.end();
    });
}





// event handler
async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    const message = event.message.text; //送られてきたメッセージをmessageとして扱う
    let responseMessage = []; // 返信内容
    let area2 = []; //２番目に大な地域のくくりを格納する
    let area3 = []; //シティコードを持つ地域を格納する

    // ユーザー情報を登録する
    if (message == '登録') {
        const area1 = ['北海道', '東北', "関東", "中部", "関西", "中国", "四国", "九州・沖縄"]; //１番大きな地域のくくりを格納する
        responseMessage = createMessage(area1); //area1中身ボタンメッセージで返信内容に入れる
    } else if (message != '登録' && message != '今日傘いる？') { //入力されたテキストが地地域の名前の時処理する
        //SQL文
        let sql = 'select * from city where area1 = ?;'; //cityテーブルからmessageと同じ場所をdataに格納
        let data = await connectionSql(sql, message); //データを取得

        area2 = createCityList(data, 'area2'); //取得した地域を重複を無くして配列に格納
        responseMessage = createMessage(area2); //area2中身ボタンメッセージで返信内容に入れる

        if (area2.length == 0) {
            //SQL文
            const sql = 'select * from city where area2 = ?;'; //cityテーブルからmessageと同じ場所をdataに格納
            let data = await connectionSql(sql, message); //データを取得

            area3 = createCityList(data, 'name'); //取得した地域を重複を無くして配列に格納
            responseMessage = createMessage(area3); //area3中身ボタンメッセージで返信内容に入れる

            if (area3.length == 0) {
                //選択した地域のシティコードをユーザーIDとセットでuserデータベースに保存する
                await insertData(event.source.userId, await getCityCode(message));
                //登録した地域をユーザーに返す
                responseMessage = {
                    "type": "text",
                    "text": "地域を" + message + "に登録しました。"
                };
            }
        }
    }

    // 今日傘がいるかどうかを通知する
    if (event.message.text == '今日傘いる？') {
        responseMessage = {
            type: 'text',
            text: 'いるよ〜'
        };
        // console.log(await getUserCode(event.source.userId));
    }

    return client.replyMessage(event.replyToken, responseMessage);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});