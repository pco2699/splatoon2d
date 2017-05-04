/**
 * Created by pco2699 on 2017/04/18.
 */
//初期化
var canvas_mouse_event = false; //スイッチ [ true=線を引く, false=線は引かない ]  ＊＊＊
var oldX = 0;                //１つ前の座標を代入するための変数
var oldY = 0;                //１つ前の座標を代入するための変数
var bold_line = 20;            //ラインの太さをここで指定

var color = "#e39000";           //ラインの色をここで指定
var vs_color = "#007be3";        //対戦相手の色はここで指定

var can = $("#draw_area")[0]; //CanvasElement
var context = can.getContext("2d"); //描画するための準備！

var milkcocoa = new MilkCocoa('eggj1ng3afh.mlkcca.com');

// milkcocoa関連のデータストリーム関数を宣言
// 'drawings'は主に絵を描く用のパラメータをやりとり
var milkcca_drawings_stream = milkcocoa.dataStore('drawings');
// 'user'は部屋の入出管理周辺をやりとり
var milkcca_user_stream = milkcocoa.dataStore('user');
// 'game'はゲームのスタート・終了のタイミングを管理
var milkcca_game_stream = milkcocoa.dataStore('game');

// 自分が何番目のプレイヤーかを示す値
var player_num;

// 今何人
var room_num;

var timeId;

// プレイヤーの部屋管理を行う処理
(function () {
    milkcca_user_stream.get("user_num", function (err, data) {
        if (err) {
            // 初回(not foundがerrに入る)はデータがないので1で初期化
            if (err === "not found") {
                milkcca_user_stream.set("user_num", {
                    "userNum": "1"
                });
                player_num = 1;
            } else {
                console.log(err);
            }
        }
        else {
            // 接続数を取得し+1する
            player_num = parseInt(data.value.userNum, 10) + 1;

            milkcca_user_stream.set("user_num", {
                "userNum": player_num
            });
        }
        $("#player_num").html(player_num);
    });
}());

milkcca_user_stream.on("set", function (set_data) {
    room_num = parseInt(set_data.value.userNum, 10);
});

// ウィンドウを閉じたらuserNumに格納されている変数を一つ減らす
$(window).on("beforeunload", function () {
    player_num--;
    milkcca_user_stream.set("user_num", {
        "userNum": player_num
    });
});

// STARTボタンを押したらカウントダウンを始める...！
$("#start").on("click", function () {
    milkcca_game_stream.send({message: 'start!', player_num: player_num});
    setTimeout(startTimer, 1000);
});

// 他のプレイヤーがSTARTを押したら始めるよ
milkcca_game_stream.on("send", function (e) {
    if(e.value.message === 'start!' && e.value.player_num !== player_num){
        startTimer();
    }
});

// 他のプレーヤーからdrawings情報を受け取ったときの挙動
milkcca_drawings_stream.on("send", function (e) {
    if(e.value.player_num !== player_num) {
        var oldX = e.value.oldX;
        var oldY = e.value.oldY;
        var px = e.value.px;
        var py = e.value.py;

        context.strokeStyle = vs_color;
        context.lineWidth = bold_line;
        context.beginPath();
        context.lineJoin = "round";
        context.lineCap = "round";
        context.moveTo(oldX, oldY);
        context.lineTo(px, py);
        context.stroke();
        context.closePath();
    }
});


/*
------- 絵を描く処理 -------
 */

$(can).on("mousedown", function (e) {
    oldX = e.offsetX;       //MOUSEDOWNしたX横座標取得
    oldY = e.offsetY; //MOUSEDOWN Y高さ座標取得
    canvas_mouse_event = true;
});

$(can).on("mouseleave", function () {
    canvas_mouse_event = false;
});

$(can).on("mousemove", function (e) {
    if (canvas_mouse_event === true) {
        console.log(e);
        var px = e.offsetX;
        var py = e.offsetY;

        context.strokeStyle = color;
        context.lineWidth = bold_line;
        context.beginPath();
        context.lineJoin = "round";
        context.lineCap = "round";
        context.moveTo(oldX, oldY);
        context.lineTo(px, py);
        context.stroke();
        context.closePath();

        milkcca_drawings_stream.send({px: px, py: py, oldX: oldX, oldY: oldY, player_num: player_num});
        oldX = px;
        oldY = py;

    }
});

$(can).on("mouseup", function () {
    canvas_mouse_event = false;
});

/*
 ------- 絵を描く処理 ここまで -------
 */

// タイマーをスタートする処理
function startTimer(){
    $("#start").addClass("disabled");
    $("#draw_area").removeClass("disabled");
    timeId = setInterval(timer, 1000);
}

// Areaを計算する関数
function calcAreaPercent(color_code) {
    var input_data = context.getImageData(0, 0, can.width, can.height);
    var data_obj = [];
    var bit_ary = [];

    var color_obj = convertColorCode(color_code);

    console.log(input_data);

    for (var i = 0; i < input_data.data.length; i++) {
        bit_ary.push(input_data.data[i]);
        if (i % 4 === 3) {
            data_obj.push(bit_ary);
            bit_ary = [];
        }
    }
    console.log(data_obj);

    var count = 0;
    for (i in data_obj) {
        if (data_obj[i][3] === 255 && data_obj[i][0] === color_obj.red && data_obj[i][1] === color_obj.green && data_obj[i][2] === color_obj.blue) {
            count++;
        }
    }
    return Math.round(count / data_obj.length * 100);
}

// 色コードをRGB値に変換
function convertColorCode(color_code) {
    var red = parseInt(color_code.substring(1, 3), 16);
    var green = parseInt(color_code.substring(3, 5), 16);
    var blue = parseInt(color_code.substring(5, 7), 16);

    return {red: red, green: green, blue: blue};
}

//カウントダウンタイマーの処理
function timer() {
    var time = $("#clock_area").html().split(":");
    var time_obj = {min: parseInt(time[0], 10), sec: parseInt(time[1], 10)};
    var result, vs_result;
    var result_word;

    with (time_obj) {
        // タイマーが終了したら結果表示
        if (sec === 0 && min === 0){
            clearInterval(timeId);
            result = calcAreaPercent(color);
            vs_result = calcAreaPercent(vs_color);

            if(result > vs_result){
                result_word = "You Win!";
            }
            else if(result < vs_result){
                result_word = "You Lose...";
            }
            else{
                result_word = "Even...";
            }
            alert("Game End. " + result_word + " Your result is " + result + "%. Your opponent is " + vs_result + "%");
        }
        else if (sec === 0){
            sec = 59;
            min--;
        }
        else{
            sec--;
        }
        $("#clock_area").html(("0" + min).slice(-2) + ":" + ("0" + sec).slice(-2));
    }
}