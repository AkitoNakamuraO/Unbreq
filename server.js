'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');

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

//ユーザーIDで検索し、そのデータを返す関数
function getUserDB(userId) {
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
            resolve(rows);
        });

        // 接続終了
        connection.end();
    });
}

//ユーザーIDと地域のコードをuserデータベースに挿入する関数
function insertData(userData, userId, cityCode) {
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
        console.log(userData);
        if (userData.length <= 0) {
            //SQL文
            let sql = 'insert into user(user_id, city_code) values(?, ?);';

            //データを挿入
            connection.query(sql, [userId, cityCode], function(err, result) {
                console.log("挿入 ");
            });
        } else {
            //SQL文
            let sql = 'update user set city_code = ? where user_id = ?;';

            //データを更新
            connection.query(sql, [cityCode, userId], function(err, result) {
                console.log("更新");
            });
        }
        resolve(0); //Request timeout対策
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

    //天気予報を返す処理
    if (message == '天気教えて' || message == '06~12時の時間帯' || message == '12~18時の時間帯' || message == '18~24時の時間帯' || message == '今日の降水確率一覧') {
        //semは場合分けに使う
        let sem = 0;
        let judge;

        //「天気教えて」で反応する。
        if (message == '天気教えて') {
            //知りたい時間帯の選択肢を表示する。
            let timeMessage = require('./GettingTheWeather/time.json');
            await client.replyMessage(event.replyToken, timeMessage);
            sem = 1;
        } else if (sem == 1) { //上の天気教えてを通ってからでないとここには入れない
            sem = 0;
            //getWather(event,codeId,time)で傘が必要か判断する
            //codeIdは各地域のコード(time.jsonを参照)
            //timeは選択した時間帯のテキスト
            //getWeatherの返り値(judge)で場合分け
            judge = await getWeather(event, "070030", message);
            console.log(judge);
            //1は0~30%,2は30~50%,3は50~100%
            if (judge == 1) {
                responseMessage = {
                    type: 'text',
                    text: '今日傘いらないよ！'
                };
            } else if (judge == 2) {
                responseMessage = {
                    type: 'text',
                    text: '今日折り畳み傘持ってくといいかも！'
                };
            } else if (judge == 3) {
                responseMessage = {
                    type: 'text',
                    text: '今日傘いるよ！'
                };
            }
        } else { //天気教えて以外はここに入る
            responseMessage = {
                type: 'text',
                text: '天気教えてって言ってね！'
            };
        }

    } else if (message == '登録') { // ユーザー情報を登録する
        const area1 = ['北海道', '東北', "関東", "中部", "関西", "中国", "四国", "九州・沖縄"]; //１番大きな地域のくくりを格納する
        responseMessage = createMessage(area1); //area1中身ボタンメッセージで返信内容に入れる
    } else if (message != '登録') { //入力されたテキストが地地域の名前の時処理する
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
                //すで登録しているユーザーかどうかを判定するためにデータベースの中身を調べる
                const userData = await getUserDB(event.source.userId);
                //選択した地域のシティコードをユーザーIDとセットでuserデータベースに保存する
                await insertData(userData, event.source.userId, await getCityCode(message));
                //登録した地域をユーザーに返す
                responseMessage = {
                    "type": "text",
                    "text": "地域を" + message + "に登録しました。"
                };
            }
        }
    }

    return client.replyMessage(event.replyToken, responseMessage);
}


//天気取得し、傘が必要かを返す関数
async function getWeather(event, codeId, time) {
    let pushText;
    let pushText2, pushText3, pushText4;
    let count = 0;

    //天気予報APIから取得した情報をobjという変数に格納
    const obj = await returnObject(codeId);
    //選択肢の場合分け
    if (time == '06~12時の時間帯') {
        pushText = obj.forecasts[1].chanceOfRain['06-12'];
    } else if (time == '12~18時の時間帯') {
        pushText = obj.forecasts[1].chanceOfRain['12-18'];
    } else if (time == '18~24時の時間帯') {
        pushText = obj.forecasts[1].chanceOfRain['18-24'];
    } else if (time == '今日の降水確率一覧') { //ここは降水確率の一覧表示
        count = 1;
        pushText2 = obj.forecasts[1].chanceOfRain['06-12'];
        pushText3 = obj.forecasts[1].chanceOfRain['12-18'];
        pushText4 = obj.forecasts[1].chanceOfRain['18-24'];
        client.replyMessage(event.replyToken, {
            type: 'text',
            text: '降水確率一覧' +
                '\n6-12時\n--> ' + pushText2 +
                '\n12-18時\n--> ' + pushText3 +
                '\n18-24時\n--> ' + pushText4 +
                '\n(--%となる場合は天気を読み取りできません)'
        });
    }
    if (count == 1) {
        return 0;
    } else {
        //pushTextデータがstring型の◯◯％（50%とか）だったから、これの数値を取り出してint型にする。
        let reg = new RegExp(/^[0-9]+$/); //数値を取り出すためのもの
        let st2Num = reg.test(pushText); //ここでst2Numに数値を格納
        //下のように降水確率で場合分け
        if (st2Num < 30) return 1;
        else if (st2Num >= 30 && st2Num < 50) return 2;
        else if (st2Num >= 50) return 3;
    }
}

/*引数として地域コードを、
返り値はJSON型オブジェクトを返す
関数内のrequest等は https://www.sejuku.net/blog/80176 を参照した。
*/
function returnObject(codeId) {
    return new Promise(resolve => {
        setTimeout(() => {
            //axiosを使って天気APIにアクセス
            //天気予報APIを使う 070030は会津若松のID番号             
            var request = require('request');
            var options = {
                url: 'https://weather.tsukumijima.net/api/forecast/city/' + codeId,
                method: 'GET',
                json: true
            }
            request(options, function(error, response, body) {
                //bodyにJSONデータがある。（天気の情報が入っている）
                //resolve(??);で、??をreturnする。
                resolve(body);
            })
        }, 500);

    });
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});