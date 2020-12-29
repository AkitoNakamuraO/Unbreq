'use strict';

//天気取得api
const axios = require('axios');
//LINEBotの情報を取得
const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;
const config = {
    channelSecret: 'f051804d7ed16030e710a51cdfd88cb6',
    channelAccessToken: 'assCEfo7r9TDQuacaDSpvHmewsyzWjUVNg64DQPEJOINk4nKhBB6/CO6+5xSopzei1IIDEgY4ysqs/aiEEXtTF1vy3vYGpEEXs6zyVp29NBUZPfPtULpANomScRbbJlPGm5Fe+t/Jkars1IAAHE/FAdB04t89/1O/w1cDnyilFU='
};
const app = express();
app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});
    //clientというインスタンスを生成
const client = new line.Client(config);

//semは場合分けに使う
let sem = 0;

//メインの関数、メッセージを受け取ったときの処理
async function handleEvent(event) {
  let judge;

  //エラー処理
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  
  //「天気教えて」で反応する。
    if(event.message.text == '天気教えて'){
      //知りたい時間帯の選択肢を表示する。
    let timeMessage = require('./time.json');
    await client.replyMessage(event.replyToken, timeMessage);
    sem = 1;
  } else if(sem == 1){  //上の天気教えてを通ってからでないとここには入れない
    sem = 0;
    //getWather(event,codeId,time)で傘が必要か判断する
    //codeIdは各地域のコード(time.jsonを参照)
    //timeは選択した時間帯のテキスト
    //getWeatherの返り値(judge)で場合分け
    judge = await getWeather(event,"070030", event.message.text);
    //1は0~30%,2は30~50%,3は50~100%
    if(judge == 1){
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '今日傘いらないよ！'
    });
  }
  else if(judge == 2){
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '今日折り畳み傘持ってくといいかも！'
    });
  }
  else if(judge == 3){
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '今日傘いるよ！'
    });
    }
  }else {//天気教えて以外はここに入る
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '天気教えてって言ってね！'
    });
  }
}

//天気取得し、傘が必要かを返す関数
async function getWeather(event, codeId, time){
    let pushText;
    let pushText2, pushText3, pushText4;
    let count = 0;
    
    //天気予報APIから取得した情報をobjという変数に格納
    const obj = await returnObject(codeId);
    //選択肢の場合分け
    if(time == '06~12時の時間帯'){
      pushText = obj.forecasts[1].chanceOfRain['06-12'];
    }else if(time == '12~18時の時間帯'){
      pushText = obj.forecasts[1].chanceOfRain['12-18'];     
    }else if(time == '18~24時の時間帯'){
      pushText = obj.forecasts[1].chanceOfRain['18-24']; 
    }else { //ここは降水確率の一覧表示
      count = 1;
      pushText2 = obj.forecasts[1].chanceOfRain['06-12'];
      pushText3 = obj.forecasts[1].chanceOfRain['12-18']; 
      pushText4 = obj.forecasts[1].chanceOfRain['18-24']; 
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: '降水確率一覧'
              +'\n6-12時\n--> '+pushText2
              +'\n12-18時\n--> '+pushText3
              +'\n18-24時\n--> '+pushText4
              +'\n(--%となる場合は天気を読み取りできません)'
      });
    }
    if(count == 1){
      return 0;
    }else {
      //pushTextデータがstring型の◯◯％（50%とか）だったから、これの数値を取り出してint型にする。
      let reg = new RegExp(/^[0-9]+$/);//数値を取り出すためのもの
      let st2Num = reg.test(pushText);//ここでst2Numに数値を格納
      //下のように降水確率で場合分け
      if(st2Num < 30) return 1;
      else if(st2Num >= 30 && st2Num < 50) return 2;
      else if(st2Num >= 50) return 3;
    }
  }

  /*引数として地域コードを、
  返り値はJSON型オブジェクトを返す
  関数内のrequest等は https://www.sejuku.net/blog/80176 を参照した。
  */
  function returnObject(codeId){ 
    return new Promise(resolve => {
      setTimeout(() => {
        //axiosを使って天気APIにアクセス
        //天気予報APIを使う 070030は会津若松のID番号             
        var request = require('request');
        var options = {
          url: 'https://weather.tsukumijima.net/api/forecast/city/'+codeId,
          method: 'GET',
          json: true
        }
        request(options, function (error, response, body) {
          //bodyにJSONデータがある。（天気の情報が入っている）
          //resolve(??);で、??をreturnする。
          resolve(body);
        })
      }, 500);
      
    });
  }
  
  //ローカルで使用
  app.listen(PORT);
  console.log(`Server running at ${PORT}`);
  
  // //Vercel（デプロイしたやつ）で使用
  // (process.env.NOW_REGION) ? module.exports = app: app.listen(PORT);
  // console.log(`Server running at ${PORT}`);

  //下のやつ天気予報API取得時に、色々エラー起きて失敗して分からずじまいのやつ
  //  let req;
  //  let data = [];
  //   const https = require('https');        //天気予報APIのデータ取得
  //   https.get(URL, function (res) {  //https.get()
  //      res.on('data', function(chunk) {
    //       data.push(chunk);
    //     }).on('end', function() {
      //        const events = Buffer.concat(data);
      //        req = JSON.parse(events); /*.parse()JSON形式で書かれた文字列をJavaScriptのJSONオブジェクトに変換する*/
      
      //         if(time == '06~12時の時間帯'){
        //           pushText = req.forecasts[1].chanceOfRain['06-12'];
        //        }else if(time == '12~18時の時間帯'){
          //          pushText = req.forecasts[1].chanceOfRain['12-18'];     
          //        }else if(time == '18~24時の時間帯'){
            //          pushText = req.forecasts[1].chanceOfRain['18-24']; 
            //       }else {
              //         count = 1;
              //         console.log("inter "+count);
              //         pushText2 = req.forecasts[1].chanceOfRain['06-12'];
              //         pushText3 = req.forecasts[1].chanceOfRain['12-18']; 
              //         pushText4 = req.forecasts[1].chanceOfRain['18-24']; 
              //         client.replyMessage(event.replyToken, {
                //           type: 'text',
                //           text: '06-12\n'+pushText2
                //           +'\n12-18\n'+pushText3
                //           +'\n18-24\n'+pushText4
                //         });
                //         return 0;
                //       }
                //     })
                //   });
