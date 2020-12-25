'use strict';

//ユーザー情報を登録する関数
exports.userInformationRegistration = async function(message) {

    // ユーザー情報を登録する
    let templateMessage = require('./template.json'); //ラインのテンプレートメッセージのテンプレートのjsonファイルを取得
    templateMessage.template.actions = []; //templateMessageの初期化
    let responseMessage = []; // 返信内容

    if (message == '登録') {
        const area1 = ['北海道', '東北', "関東", "中部", "関西", "中国", "四国", "九州・沖縄"];

        let count = 0; //ボタンテンプレートメッセージのアクションオブジェクトの制限が4個なのでカウントする。

        area1.forEach(area => {
            templateMessage.template.actions.push({
                "type": "message",
                "label": area,
                "text": area
            });

            count++;

            if (count % 4 == 0) {
                const temp = JSON.parse(JSON.stringify(templateMessage)); //一時的にtemplateMessageオブジェクト深いコピーする。
                responseMessage.push(temp);
                templateMessage.template.actions = []; //templateMessageの初期化
            }
        });
    } else {
        //SQLに接続し、データを返す関数
        function connectionSql(sql, message) {
            return new Promise(resolve => {
                // requireの設定
                const mysql = require('mysql');
                // MySQLとのコネクションの作成
                const connection = mysql.createConnection({
                    host: 'localhost',
                    user: 'Orangineer',
                    password: 'orange',
                    database: 'Unbreq'
                });
                // 接続
                connection.connect();
                connection.query(sql, message, function(err, rows, fields) {
                    resolve(rows);
                });
                // 接続終了
                connection.end();
            });
        }

        //SQL文
        const sql = 'select * from city where area1 = ?;';
        let data = await connectionSql(sql, message);

        let area2 = [];

        data.forEach(data => {
            area2.push(data.area2)
        });

        area2 = area2.filter(function(x, i, self) {
            return self.indexOf(x) === i;
        });

        let count = 0; //ボタンテンプレートメッセージのアクションオブジェクトの制限が4個なのでカウントする。

        area2.forEach(area => {
            templateMessage.template.actions.push({
                "type": "message",
                "label": area,
                "text": area
            });

            count++;

            if (count % 4 == 0) {
                const temp = JSON.parse(JSON.stringify(templateMessage)); //一時的にtemplateMessageオブジェクト深いコピーする。
                responseMessage.push(temp);
                templateMessage.template.actions = []; //templateMessageの初期化
            }
        });

    }

    return responseMessage;
}