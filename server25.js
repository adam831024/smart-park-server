//===========模組載入=======================
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();
const path = require("path");
const fs = require("fs");
const mysql = require('mysql');
const mqtt = require('mqtt');
//===========模組載入=========================

//=============環境設定=======================

var con = mysql.createConnection({ host: 'localhost', user: 'adam', password: 'good1234', database: 'car4' });//要連結的資料庫設定

con.connect(function (error) {
  if (error) throw error;//伺服器連線失敗顯示
  console.log("已經連線成功了！"); //伺服器連線成功顯示
  });

app.get('/', function (req, res) {
  res.sendFile('index20.html', { root: __dirname });
});//主頁面顯示

app.use(bodyParser.urlencoded({ extended: false }))

const client = mqtt.connect('tcp://220.132.124.155:1883');//MQTT broker IP
//=============環境設定=======================

//============全域變數==============================
var first = 0;
var second = 0;
var third = 0;

var line_A = 3;
var line_B = 3;

var search_car="";

var current_date = new Date(Date.now() + 8 * 3600 * 1000);

var car_enter_no = ""; //全域變數，用於進場的車號確認

var all_data = "";//全域變數，從資料庫撈出的所有在場內車子的資料

//============全域變數==============================


//====================從資料庫搜尋車號，並計算出費用================================

app.post('/search',function(req,res){

  console.log('搜尋車號 '+ req.body.parameter2);
  result1=""
  search_car = req.body.parameter2;
    var sql_select = `SELECT car_no, place, enter_time,state,paid FROM car_database WHERE state='ENTER'`; 

    con.query(sql_select, function (error, result) {
        if (error) throw error;
        console.log(result);

        //******************************************************
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

              result1 = {'car_no':result[i].car_no, "place": result[i].place, 'enter_time':new Date(result[i].enter_time*1+8*3600*1000), 'state':result[i].state, 'paid':result[i].paid, 'price': time*20,"first":result[parseInt(first)].car_no, "second":result[parseInt(second)].car_no, "third":result[parseInt(third)].car_no  };

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
        if(req.body.parameter2==result[i].car_no||all_data[parseInt(first)].car_no==result[i].car_no){
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
      var sql_pay = `UPDATE car_database SET paid = '${upload_price}' WHERE car_no='${all_data[parseInt(first)].car_no}' AND state ="ENTER"`;

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
  //入口處車輛顯示
  app.get('/mcu',function(req,res){
    console.log("MCU send data");
    var j=0;
    for(i=0;i<all_data.length;i++)
    {
      if(all_data[i].state == "ENTER"){j--;};
    }
    space = 500+j;
    space_str = space.toString();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`left space@${space_str}`);
  });
  //場內A區域車格顯示
  app.get('/area_A',function(req,res){

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`left space@${line_A.toString()}`);
  });  
  //場內B區域車格顯示
  app.get('/area_B',function(req,res){

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`left space@${line_B.toString()}`);
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
        // console.log("費用更新完成");
}  

//===================應繳費用資料庫更新，於執行時更新一次=========

//=================MQTT===================================
//主題定義 進場紅外線=>red, 出場紅外線=>redl, 進場車號=>car_no, 出場車號=>car_nol, 進場柵欄=>fence, 出場柵欄=>fencel, 進場拍照=>cam, 停車格紅外線=>red_A01, red_A03, red_B02, 停車格相機=>cam_A01, cam_A03, cam_B02

client.on('connect', function () {
  console.log("MQTT is connect");
});

client.subscribe('red');
client.subscribe('redl');
client.subscribe('car_no');
client.subscribe('car_nol');
client.subscribe('cam'); 

client.subscribe('cam_A01'); 
client.subscribe('red_A01'); 
client.subscribe('cam_A03'); 
client.subscribe('red_A03'); 
client.subscribe('cam_B02'); 
client.subscribe('red_B02'); 



client.on('message', function (topic, message) {
  console.log("topic",topic);
  console.log("clinet receive message:", message.toString());
  if (message == 1 &&topic=='red') {
    client.publish('cam', '1');
    client.publish('car_no', '1');
  }
//===============車輛進場，新增一筆資料===================
  if (message!=1&&topic == 'car_no') {
    console.log("車號", message.toString(), "進場");
    car_enter_no = message.toString();
    var current_date = new Date(Date.now() + 8 * 3600 * 1000);

      var sql = `INSERT INTO car_database (car_no, enter_time, state) VALUES ('${car_enter_no}','${current_date.toISOString()}','ENTER');`;//1.將資料上傳到資料庫的程式碼(還沒執行上傳動作)

      con.query(sql, function (error, result) {//2.上傳執行
        if (error) throw error;//2_1 上傳失敗顯示error

        console.log('成功新增了 1 筆進場車號。');//2_2上傳成功在console顯示字串
      }); 

      client.publish('fence', '伺服器收到資料了，柵欄要開啟囉');
    }
  if(message==0&&topic=="red"){
    setTimeout(fence_close,3000);//delay 3秒再關柵欄
    function fence_close(){
      client.publish('fence', '車子已經進場了，柵欄要關閉囉');
    }
  }  
//===============車輛進場，新增一筆資料===================

//============車輛離場，新增一筆資料======================
  if (message == 1 && topic == 'redl') {
    client.publish('car_nol', '1');
  }
  if (message!=1&&topic == 'car_nol') {
    for (i = 0; i < all_data.length; i++) {
      if (all_data[i].state == 'ENTER' && all_data[i].car_no == message.toString() && all_data[i].price == all_data[i].paid) {

        var current_date = new Date(Date.now() + 8 * 3600 * 1000);

        var sql = `UPDATE car_database SET exit_time = '${current_date.toISOString()}', state = 'EXIT' WHERE car_no='${message.toString()}'`;
        con.query(sql, function (error, result) {
          if (error) throw error;

          console.log('成功更新了 1 筆離場車號。');
        });
        break;
      }
      if(all_data[i].state == 'ENTER' && all_data[i].car_no == message.toString() && all_data[i].paid==null){
        console.log("請繳費在離場");
        break;
      }
    }

    client.publish('fencel', '伺服器收到資料了，柵欄要開啟囉');
  }
  if(message==0&&topic=="redl"){
    setTimeout(fencel_close,3000);//delay 3秒再關柵欄
    function fencel_close(){
      client.publish('fencel', '車子已經離場了，柵欄要關閉囉');
    }
  }
//============車輛離場，新增一筆資料======================

//============車輛進場web cam傳照片來=====================
  if (message!=1&&topic == 'cam') {
    //fs.writeFile(path, name, 'base64', function(){})
    fs.writeFile(`C:/xampp/htdocs/img/${car_enter_no}.jpg`, message, function(err) {
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
  if(message==1&&topic=="red_A01"){
    client.publish("cam_A01","1");
    line_A--;
  }
  if(message!=1&&topic=="cam_A01"){

    var sql = `UPDATE car_database SET place = '${topic.slice(4,7)}' WHERE car_no = '${message.toString()}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車停好車格了。');
    });
  }
  if(message==0&&topic=="red_A01"){

    line_A++;

    var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車離開車格了。');
    });
  }
//A03停車格
  if(message==1&&topic=="red_A03"){
    client.publish("cam_A03","1");
    line_A--;

  }
  if(message!=1&&topic=="cam_A03"){

    var sql = `UPDATE car_database SET place = '${topic.slice(4,7)}' WHERE car_no = '${message.toString()}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車停好車格了。');
    });
  }
  if(message==0&&topic=="red_A03"){

    line_A++;

    var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

    con.query(sql, function (error, result) {
      if (error) throw error;

      console.log('汽車離開車格了。');
    });
  }
  //B02停車格
    if(message==1&&topic=="red_B02"){
      client.publish("cam_B02","1");
      line_B--;
    }
    if(message!=1&&topic=="cam_B02"){

      var sql = `UPDATE car_database SET place = '${topic.slice(4,7)}' WHERE car_no = '${message.toString()}'`;

      con.query(sql, function (error, result) {
        if (error) throw error;

        console.log('汽車停好車格了。');
      });
    }
    if(message==0&&topic=="red_B02"){

      line_B++;

      var sql = `UPDATE car_database SET place = '${null}' WHERE place = '${topic.slice(4,7)}'`;

      con.query(sql, function (error, result) {
        if (error) throw error;

        console.log('汽車離開車格了。');
      });
    }
//===============停車格===================================
});

//==================MQTT==================================

//====================server================================
app.listen(8000, function () {
    console.log('Server is listening on port 8000!');
});
