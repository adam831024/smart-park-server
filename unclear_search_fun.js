

function unclear_search(search_car){

  var buf ={}; 
  var first = '';
  var second = '';
  var third = '';

  for(i=0;i<all_data.length;i++)
  {
    buf[i] = 0;
  };

  for(i=0;i<all_data.length;i++){
    for(k=0;k<search_car.length;k++){
      if(all_data[i].car_no.slice(k,k+1)==search_car.slice(k,k+1)){
          buf[i]++;
      }  
    }  
  }    

  for(j=0;j<3;j++){
    //找出最大的前三個值

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
  return all_data[parseInt(first)].car_no;
}