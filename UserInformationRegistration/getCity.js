'use strict';

//地域を取得する関数
exports.getCity = async function(message) {

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

    console.log(area2);

}