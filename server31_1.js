//===========模組載入=======================
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();
const path = require("path");
const fs = require("fs");
const mysql = require('mysql');
const mqtt = require('mqtt');
const net = require('net');
//===========模組載入=========================

//=============環境設定=======================

var con = mysql.createConnection({ host: 'localhost', user: 'adam', password: 'good1234', database: 'car4' });//要連結的資料庫設定

con.connect(function (error) {
  if (error) throw error;//伺服器連線失敗顯示
  console.log("已經連線成功了！"); //伺服器連線成功顯示
  });

app.get('/pay.html', function (req, res) {
  res.sendFile('pay.html', { root: __dirname });
})//主頁面顯示

app.get('/map.html', function (req, res) {
  res.sendFile('map.html', { root: __dirname });
});//車位導航

app.get('/mobile', function (req, res) {
  res.sendFile('index_mobile.html', { root: __dirname });
});

app.use(bodyParser.urlencoded({ extended: false }))

const client = mqtt.connect('tcp://220.132.124.155:1883');//MQTT broker IP
//=============環境設定=======================

//============全域變數==============================
//-----模糊搜尋時抓出的最有可能的車號
var first = 0;
var second = 0;
var third = 0;

//-----傳給MCU A, B區域空位
var line_A = 3;
var line_B = 3;

//----前端按下搜尋時的車號，用來做模糊搜尋比對
var search_car="";

//----現在時間
var current_date = new Date(Date.now() + 8 * 3600 * 1000);

//----用於進場的車號確認
var car_enter_no = ""; 

//----從資料庫撈出的所有在場內車子的資料
var all_data = "";

//============全域變數==============================

//=============模糊搜尋function============================

function unclear_search(search_car){

  var buf ={}; 
  var first = '';
  var second = '';
  var third = '';

  //製作一個空的list
  for(i=0;i<all_data.length;i++)
  {
    buf[i] = 0;
  };

  //比對字元，把分數加到list上
  for(i=0;i<all_data.length;i++){
    for(k=0;k<search_car.length;k++){
      if(all_data[i].car_no.slice(k,k+1)==search_car.slice(k,k+1)){
          buf[i]++;
      }  
    }  
  }    

  //進行三次，找出機率最高的前三個
  for(j=0;j<3;j++){

    // 找出list裡面的最大值，把值給n
    var n = buf[0]
    for(i=0;i<Object.keys(buf).length-1;i++){
      if(n<buf[i+1]){
        n = buf[i+1]
      }     
    }

    //把最大的值對應的key找出來
    for(i=0;i<Object.keys(buf).length;i++){
      //loop 第一次的結果
      if(buf[i]==n&&j==0){
        first = Object.keys(buf)[i]
        buf[i]=0;
        break;
      }
      //loop 第二次的結果
      if(buf[i]==n&&j==1){
        second = Object.keys(buf)[i]
        buf[i]=0;
        break;
      }
      //loop 第三次的結果
      if(buf[i]==n&&j==2){
        third = Object.keys(buf)[i]
        buf[i]=0;
        break;
      }
    }
  }
  //只回傳機率最高的車號
  return all_data[parseInt(first)].car_no;
}

//=============模糊搜尋function============================


//====================從資料庫搜尋車號，並計算出費用================================

app.post('/search',function(req,res){

  console.log('繳費機搜尋的車號: '+ req.body.parameter2);
  result1=""
  search_car = req.body.parameter2;
    var sql_select = `SELECT car_no, place, enter_time,state,paid FROM car_database WHERE state='ENTER'`; 

    con.query(sql_select, function (error, result) {
        if (error) throw error;
        console.log(result);

        //********************模糊搜尋****************************
          var buf ={}; 
          for(i=0;i<result.length;i++){
            buf[i] = 0;
          }
          // console.log(buf);
          for(i=0;i<result.length;i++){
            for(k=0;k<search_car.length;k++){
              // console.log(all_data[i].car_no.slice(k,k+1));//所有車號
              // console.log(car_enter_no.slice(k,k+1));//搜尋的車號
              if(result[i].car_no.slice(k,k+1)==search_car.slice(k,k+1)){
                  buf[i]++;
              }  
            }  
          }    
          console.log("buf = ",buf);//可以看出資料庫裏面誰的得分最高
          // console.log("buf有幾個key",Object.keys(buf).length);//算出buf長度

          
          for(j=0;j<3;j++){

            //找出最大的值給n
            var n = buf[0]
            for(i=0;i<Object.keys(buf).length-1;i++){
              if(n<buf[i+1]){
                n = buf[i+1]
              }     
            }

            //把最大的值對應的key找出來
            for(i=0;i<Object.keys(buf).length;i++){
              if(buf[i]==n&&j==0){
                first = Object.keys(buf)[i]
                buf[i]=0;
                break;
              }
              if(buf[i]==n&&j==1){
                second = Object.keys(buf)[i]
                buf[i]=0;
                break;
              }
              if(buf[i]==n&&j==2){
                third = Object.keys(buf)[i]
                buf[i]=0;
                break;
              }
            }
          }
              // console.log(all_data)
              console.log("first",result[parseInt(first)].car_no);
              console.log("second",result[parseInt(second)].car_no);
              console.log("third",result[parseInt(third)].car_no);  


        //********************************************************
       
        for(var i =0;i <result.length; i++){

          if(result[parseInt(first)].car_no == result[i].car_no)
          {
            // console.log(result[i].car_no +' '+ new Date(result[i].enter_time*1+8*3600*1000) +' '+ result[i].state+' '+ result[i].paid);

            time = parseInt((new Date(Date.now()) - result[i].enter_time)/1000/60/60);
            console.log('進場經過'+ time+ '小時');
            console.log('總計'+ time*20+ '元');

              result1 = {
                         'car_no':result[i].car_no, 
                         'place': result[i].place, 
                         'state':result[i].state, 
                         'price': time*20,
                         'paid':result[i].paid, 
                         'first':result[parseInt(first)].car_no, 
                         'enter_time':new Date(result[i].enter_time*1+8*3600*1000), 
                         'first_no': parseInt(first), 
                         'second':result[parseInt(second)].car_no, 
                         'second_entertime': new Date(result[parseInt(second)].enter_time*1+8*3600*1000), 
                         'second_no': parseInt(second), 
                         'third':result[parseInt(third)].car_no, 
                         'third_entertime': new Date(result[parseInt(third)].enter_time*1+8*3600*1000), 
                         'third_no': parseInt(third)
                        };

              result2=JSON.stringify(result1);
              res.writeHead(200, {'Content-Type': 'application/json'});
              console.log(result1);
              res.end(result2);
          }
        }
      });
});

//====================從資料庫搜尋車號，並計算出費用================================

//=================繳費更新資料庫============================

app.post('/pay',function(req,res){

  var sql_select = `SELECT car_no, price, paid FROM car_database WHERE state='ENTER'`;
  con.query(sql_select, function (error, result) {
      if (error) throw error;

      var upload_price=0;
      var refund = 0;
      var less = 0;
      for(i=0;i<result.length;i++){
        // console.log(result[i].car_no);
        if(req.body.parameter2==result[i].car_no){
          console.log(result[i].price);
          console.log(parseInt(req.body.parameter3));
          console.log(result[i].paid);
          if((parseInt(req.body.parameter3)+result[i].paid)>result[i].price){

            upload_price = result[i].price;
            refund = ((parseInt(req.body.parameter3)+result[i].paid)-result[i].price);
            console.log("upload_price = ",upload_price,"refund = ",refund);
          }
          else if((parseInt(req.body.parameter3)+result[i].paid)==result[i].price){

            upload_price = result[i].price;
            console.log("upload_price = ",upload_price);
          }
          else if((parseInt(req.body.parameter3)+result[i].paid)<result[i].price){

            upload_price = parseInt(req.body.parameter3)+result[i].paid;
            less = result[i].price-parseInt(req.body.parameter3)-result[i].paid;
            console.log("upload_price =",upload_price,"less =",less);
          }
        }
      }
      // console.log('global upload_price=',upload_price);
      var sql_pay = `UPDATE car_database SET paid = '${upload_price}' WHERE car_no='${req.body.parameter2}' AND state ="ENTER"`;

      con.query(sql_pay, function (error, result) {
          if (error) throw error;

          console.log('繳費成功');
        });
      var refund_less = {"refund":refund, "less":less};
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(refund_less));
    });
});
//=================繳費更新資料庫============================


//====================從資料庫撈出所有資料================================


app.post('/alldata',function(req,res){
    
    alldata=JSON.stringify(all_data);//將全域變數包裝成JSON格式
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(alldata);//資料庫中的所有資料傳到前端
});

setInterval(alldata, 1000);//每一秒執行一次function

function alldata(){
  var sql_select1 = `SELECT * FROM car_database WHERE state = 'ENTER'`; 

  con.query(sql_select1, function (error, result) {
    if (error) throw error;
    all_data = result; //從資料庫撈出的所有資料，給全域變數all_data
  })  
}
//====================從資料庫撈出所有資料================================


//=======================彥豪MCU==============================

  var server = net.createServer(function(socket) {

    setInterval(mcu_fun, 1000);
    function mcu_fun()
    {
     var j=0;
     for(i=0;i<all_data.length;i++)
     {
       if(all_data[i].state == "ENTER"){j--;};
     }

     space = 500+j;//目前總空位

     socket.write(`A${line_A.toString()} B${line_B.toString()} C${space.toString()}`);//MCU要抓字串
    }
    socket.pipe(socket);
  });
//=======================彥豪MCU==============================

//============應繳費用資料庫更新，於執行時更新一次======================
// setTimeout(fee_update);//開server時會刷新，可以改成每半小時更新一次會比較實務
setInterval(fee_update,5000);//每5秒 資料庫上的價格會更新一次
function fee_update(){

  var sql_select2 = 'SELECT * FROM car_database WHERE state = "ENTER"'; 

  con.query(sql_select2, function (error, result) {
    if (error) throw error;

    for(i=0;i<result.length;i++)
    {
      fee1 = parseInt((new Date(Date.now()) - result[i].enter_time)/1000/60/60)*20;

      var sql_fee = `UPDATE car_database SET price = '${fee1}' WHERE car_no='${result[i].car_no}' AND state = "ENTER"`;

      con.query(sql_fee, function (error, result) 
      {
        if (error) throw error;
      })
    }
  })
}  

//===================應繳費用資料庫更新，於執行時更新一次=========

//=================MQTT===================================

client.on('connect', function () {
  console.log("MQTT is connect");
});

client.subscribe('red');//進場紅外線
client.subscribe('redl');//離場紅外線
client.subscribe('PLATE/in');//進場車號
client.subscribe('PLATE/out');//離場車號
client.subscribe('PLATE/img/in'); //進場車的照片
client.subscribe('PLATE/ch');//區域車位A01有無停車辨識

// client.subscribe('cam_A01'); //cam_A01
client.subscribe('red_A01'); 
client.subscribe('cam_A03'); 
client.subscribe('red_A03'); 
client.subscribe('cam_B02'); 
client.subscribe('red_B02'); 



client.on('message', function (topic, message) {
  console.log("topic",topic);
  console.log("clinet receive message:", message.toString());

//車輛進場紅外線感應到車子，通知伺服器後，伺服器跟鏡頭要資料
  if (message == 1 &&topic=='red') {
    client.publish('SERVER/on', '1');
  }
//伺服器接收進場車量的車號，伺服器將車號寫入資料庫
  if (message!=1&&topic == 'PLATE/in') {
    console.log("車號", message.toString(), "進場");
    car_enter_no = message.toString();
    var current_date = new Date(Date.now() + 8 * 3600 * 1000);

    //1.將資料上傳到資料庫的程式碼(還沒執行上傳動作)
    var sql = `INSERT INTO car_database (car_no, enter_time, state) VALUES ('${car_enter_no}','${current_date.toISOString()}','ENTER');`;

    //2.執行上傳
    con.query(sql, function (error, result) {
        if (error) throw error;//2_1 上傳失敗顯示error

        console.log('成功新增了 1 筆進場車號。');//2_2上傳成功在console顯示字串
      }); 

    //伺服器都執行完畢後，把車號和開門指令，傳給柵欄
    client.publish('fence', `${message}/0`);
  }

  //當進場紅外線感應不到車輛時，請求柵欄關閉
  if(message==0&&topic=="red"){
    setTimeout(fence_close,3000);//delay 3秒再關柵欄
    function fence_close(){
      client.publish('fence', 'abc/1');//關柵欄
    }
  }  

//離場紅外線感應到有車子要離場，伺服器傳訊息跟鏡頭要資料
  if (message == 1 && topic == 'redl') {
    client.publish('SERVER/off', '1');
  }

  //離場車號回傳給伺服器，伺服器檢查繳費狀態，再判斷是否給予出場
  if (message!=1&&topic == 'PLATE/out') {
    var car = unclear_search(message.toString());
    for (i = 0; i < all_data.length; i++) {
      if (all_data[i].state == 'ENTER' && all_data[i].car_no == car && all_data[i].price == all_data[i].paid) {

        var current_date = new Date(Date.now() + 8 * 3600 * 1000);

        var sql = `UPDATE car_database SET exit_time = '${current_date.toISOString()}', state = 'EXIT' WHERE car_no='${car}'`;
        con.query(sql, function (error, result) {
          if (error) throw error;

          console.log('成功更新了 1 筆離場車號。');
        });
        break;
      }
      if(all_data[i].state == 'ENTER' && all_data[i].car_no == car && all_data[i].paid==null){
        console.log("請繳費再離場");
        break;
      }
    }

    client.publish('fencel', 'a/1');//open fence
  }

  //離場紅外線通知伺服器感應不到車輛，伺服器請求柵欄關閉
  if(message==0&&topic=="redl"){
    setTimeout(fencel_close,3000);//delay 3秒再關柵欄
    function fencel_close(){
      client.publish('fencel', 'a/0');//close
    }
  }

//============車輛進場web cam傳照片來=====================
  if (message!=1&&topic == 'PLATE/img/in') {

    //fs.writeFile(path, name, 'base64', function(){})
    fs.writeFile(`C:/xampp/htdocs/img/${car_enter_no}.jpg`, message,'base64', function(err) {
          //console.log(err);
          console.log('image saved to file: ' +`C:/xampp/htdocs/img/${car_enter_no}.jpg`);          
        });

    setTimeout(upload_img1,2000);//設一個delay因為圖片複製沒那麼快，馬上進行上傳資料庫電腦會塞車
    function upload_img1(){

      var sql = `UPDATE car_database SET image = LOAD_FILE('C:/xampp/htdocs/img/${car_enter_no}.jpg') WHERE car_no = '${car_enter_no}'`;//一定要設絕對路徑，因為是database要取的資料
      con.query(sql, function (error, result) {
        if (error) throw error;

        console.log('成功更新了 1 張圖片。');
      });
    }
  }

//============車輛進場web cam傳照片來=====================

//===============停車格===================================
//A01停車格
  if(message!=0&&topic=="red_A01"){

    client.publish("PLATE/ch","1");
    line_A--;
    console.log('紅外線感應到車子 A01。');
  }
  if(message!=1&&topic=="PLATE/ch"){
    console.log('汽車停好車格了。伺服器收到車號 A01');
    var car =  unclear_search(message.toString());

    var sql = `UPDATE car_database SET place = 'A01' WHERE car_no = '${car}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('A01車格資料庫更新成功');
    });
  }
  if(message==0&&topic=="red_A01"){

    line_A++;

    var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車離開車格了。A01');
    });
  }
//A03停車格
  if(message!=0&&topic=="red_A03"){

    client.publish("PLATE/ch2","1");
    line_A--;
    console.log('紅外線感應到車子 A03。');
  }
  if(message!=1&&topic=="PLATE/ch2"){
    console.log('汽車停好車格了。伺服器收到車號 A03');
    var car =  unclear_search(message.toString());

    var sql = `UPDATE car_database SET place = 'A03' WHERE car_no = '${car}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('A03車格資料庫更新成功');
    });
  }
  if(message==0&&topic=="red_A03"){

    line_A++;

    var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車離開車格了。A03');
    });
  }
  //B02停車格
  if(message!=0&&topic=="red_B02"){

    client.publish("PLATE/ch3","1");
    line_B--;
    console.log('紅外線感應到車子 B02。');
  }
  if(message!=1&&topic=="PLATE/ch3"){
    console.log('汽車停好車格了。伺服器收到車號 B02');
    var car =  unclear_search(message.toString());

    var sql = `UPDATE car_database SET place = 'B02' WHERE car_no = '${car}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('B02車格資料庫更新成功');
    });
  }
  if(message==0&&topic=="red_B02"){

    line_B++;

    var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車離開車格了。B02');
    });
  }
//===============停車格===================================
});

//==================MQTT==================================

//====================server================================
app.listen(8000, function () {
    console.log('Server is listening on port 8000!');
});
server.listen(8001);//for MCU socket
