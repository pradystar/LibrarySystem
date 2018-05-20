var express = require('express');
var mysql = require('mysql');

var app = express();

app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use('/style',  express.static(__dirname + '/style'));
app.use('/public', express.static(__dirname + '/public'));
app.use('/images', express.static(__dirname + '/images'))

app.set('view engine', 'pug');

var router = express.Router();

//load autocomplete data
//var _ac_json = {};
// var _key = 'RowDataPacket';
// _ac_json[_key] = [];

var _ac_isbn_query = 'SELECT Isbn from BOOK limit 5';
// var _ac_title_query = 'SELECT Title from BOOK limit 5';
// var _ac_aut_query = 'SELECT Name from AUTHORS limit 5';

var con = mysql.createConnection({
    user: 'root',
    password: 'root',
    database: 'templib'
});

// con.query(_ac_isbn_query,function(err,result){
//     //console.log('First connection to DB');
//     //console.log(result[0]['Isbn']);
//     _ac_json = result;
//     //_ac_json = JSON.stringify(result);
//     //console.log(_ac_json[0]['Isbn']);
// });

con.end(function(err){
    if(err) throw err;
    else console.log('DB connection closed...');
});

router.use(function (req,res,next) {
  //console.log("/" + req.method);
  next();
});

router.get("/",function(req,res){
    var con = mysql.createConnection({
        user: 'root',
        password: 'root',
        database: 'templib'
    });

    //console.log('Connected to DB');

    var search = req.query.search_string;
    var query_string = '';
    if (typeof search == 'undefined'){
        console.log('Page entry');
        res.render('index',{title: 'Northen Lights', message: 'Welcome'});
    }else{
        if ( !isNaN(search)){
            console.log('isbn search...');
            query_string = 'SELECT b.Isbn ISBN, b.Title TITLE, group_concat(concat(\' \',a.Name)) as AUTHORS, b.Copies COPIES, b.Cover COVER, b.Publisher PUB, b.Pages PG ' +
                'FROM BOOK b, BOOK_AUTHORS ba, AUTHORS a '+
                'WHERE b.Isbn=ba.Isbn AND ba.Author_id=a.Author_id AND b.ISBN like ? ' +
                'group by b.Isbn'
            //console.log(query_string);
            con.query(query_string,['%' + search + '%'],function(err, result){
                if(err) throw err;
                else res.render('index',{title: 'Northen Lights', message: 'Welcome', json: result});
            });
            con.end(function(err){
                if(err) throw err;
                else console.log('DB connection closed...');
            });
        } else{
            console.log('book title or author search...');
            // var search_arr = search.split(" ");
            // var search_mul = '%';
            // var i, len;
            // for (i = 0, len = search_arr.length; i < len; ++i){
            //     search_mul = search_mul.concat(search_arr[i]).concat('%');           
            // }
            search = search.trim().split(' ').join('%');
            search = search.toLowerCase();
            // search_mul = search_mul.toLowerCase();
            // console.log(search_mul);
            query_string = 'SELECT b.Isbn ISBN, b.Title TITLE, group_concat(concat(\' \',a.Name)) as AUTHORS, b.Copies COPIES, b.Cover COVER, b.Publisher PUB, b.Pages PG ' +
                'FROM BOOK b, BOOK_AUTHORS ba, AUTHORS a '+
                'WHERE b.Isbn=ba.Isbn AND ba.Author_id=a.Author_id AND ' +
                '(LOWER(concat_ws(\' \',b.Title,a.Name)) like ? OR LOWER(concat_ws(\' \',a.Name,b.Title)) like ?) ' +
                'group by b.Isbn'
            console.log(query_string);
            con.query(query_string, ['%'+search+'%', '%'+search+'%'],function(err, result){
                if(err) throw err;
                else{
                    res.render('index',{title: 'Northen Lights', message: 'Welcome', json: result})
                }
            });

            con.end(function(err){
                if(err) throw err;
                else console.log('DB connection closed...');
            });
        }
    }
});

router.get("/check",function(req,res){
    var con = mysql.createConnection({
        multipleStatements: true,
        user: 'root',
        password: 'root',
        database: 'templib'
    });

    var isbn = req.query.isbn;
    console.log(isbn);
    var _f = req.query._f;
    console.log(_f);
    var _card_num = req.query._card_num;
    console.log(_card_num);
    var bk_details={};
    
    var query = 'SELECT b.Isbn ISBN, b.Title TITLE, group_concat(concat(\' \',a.Name)) as AUTHORS, b.Copies COPIES,b.Cover COVER, b.Publisher PUB, b.Pages PG ' +
                'FROM BOOK b, BOOK_AUTHORS ba, AUTHORS a '+
                'WHERE b.Isbn=ba.Isbn AND ba.Author_id=a.Author_id AND b.ISBN=? ' +
                'group by b.Isbn';

    con.query(query,[isbn], function(err, result){
        if(err) throw err;
        else{
            console.log('hey');
            if(typeof _f === 'undefined')
                res.render('check',{title: 'Northen Lights', message: 'Welcome', json: result});
            else
                bk_details = result;
        }
    });

    con.end( function(err){
        if(err) throw err;
        else{
            console.log('DB connection closed...');
        }
    });
    console.log('in............');
    
    if(typeof _f !== 'undefined'){
        var err_msg;
        var con = mysql.createConnection({
            multipleStatements: true,
            user: 'root',
            password: 'root',
            database: 'templib'
        });
        con.query('SELECT COUNT(card_id) Num from BOOK_LOANS WHERE card_id=? AND date_in IS NULL',[_card_num],function(err,cr){  
            if(err) throw err;
            else if(cr[0]['Num']==3) {
                err_msg = 'You have borrowed 3 books, limit reached!!';
                res.render('check',{title: 'Northen Lights', message: 'Welcome', json: bk_details, num_err: err_msg});   
                con.end( function(err){
                    if(err) throw err;
                    else console.log('DB connection closed...');
                });
            }else{
                con.query('INSERT INTO book_loans (isbn, card_id, date_out, due_date) VALUES (?,?,DATE(NOW()), DATE(DATE_ADD(NOW(),INTERVAL 14 DAY)))',[isbn,_card_num], function(err,result){
                    if(err){
                        ///check this again
                        console.log(err.code);
                        if(err.code==='ER_NO_REFERENCED_ROW_2'){
                            console.log('FK constraint voilated');
                            err_msg='Enter correct card ID';
                            res.render('check',{title: 'Northen Lights', message: 'Welcome', json: bk_details, num_err: err_msg});
                        }
                        //err_msg='Enter correct card ID';
                        else throw err;
                    }else{
                        con.query('UPDATE BOOK SET copies=copies-1 WHERE Isbn=?',[isbn], function(err,rs1){
                        if(err) throw err;
                        res.render('index',{title: 'Northen Lights', message: 'Welcome', check: 'Checked out successfully'});
                        con.end( function(err){
                            if(err) throw err;
                            else{
                                console.log('DB connection closed...');
                            }
                        });
                        });
                    }
                });
            }
        });      
    }
});

router.get("/check_in",function(req,res){
    var con = mysql.createConnection({
        multipleStatements: true,
        user: 'root',
        password: 'root',
        database: 'templib'
    });
    var cid_sq = 'SELECT concat(br.fname,\', \',br.lname) NAME, br.card_id CID, bl.isbn ISBN FROM BOOK_LOANS bl, BORROWER br WHERE bl.card_id=br.card_id AND bl.date_in IS NULL AND br.card_id=?';
    var isbn_sq = 'SELECT concat(br.fname,\', \',br.lname) NAME, br.card_id CID, bl.isbn ISBN FROM BOOK_LOANS bl, BORROWER br WHERE bl.card_id=br.card_id AND bl.date_in IS NULL AND bl.isbn=?';
    var nm_sq = 'SELECT concat(br.fname,\', \',br.lname) NAME, br.card_id CID, bl.isbn ISBN FROM BOOK_LOANS bl, BORROWER br WHERE bl.card_id=br.card_id AND bl.date_in IS NULL AND lower(concat(br.fname,\' \',br.lname)) like ? order by br.card_id';
    var pop_dd = 'UPDATE BOOK_LOANS SET date_in=DATE(NOW()) where isbn=? AND date_in IS NULL';
    var up_cop = 'UPDATE BOOK SET copies=copies+1 where isbn=?';
    var s_type = req.query.s_type;
    var rad = req.query.rad;
    console.log(s_type);
    var search_string = req.query.search_string;
    if(typeof s_type === 'undefined'){
        if(typeof rad === 'undefined')
            res.render('check_in',{title: 'Northen Lights'});
        else{
            con.query(pop_dd,[rad],function(err,result){
                if (err) throw err;
                else
                    con.query(up_cop,[rad],function(err,result1){
                        if(err) throw err;
                        res.render('check_in',{title: 'Northen Lights', msg: 'Check in successful'});
                        con.end( function(err){
                            if(err) throw err;
                            else{
                            console.log('DB connection closed...');
                            }
                        });
                    });
            });
        }
    }else if(s_type ==='_cid'){
        con.query(cid_sq,[search_string.trim()],function(err,result){
            if(err) throw err;
            console.log('here');
            res.render('check_in',{title: 'Northen Lights', sr: result});
            con.end( function(err){
                if(err) throw err;
                else{
                    console.log('DB connection closed...');
                }
            });
        });
    }else if(s_type==='_isbn'){
        con.query(isbn_sq,[search_string.trim()],function(err,result){
            if(err)
            console.log(result);
            res.render('check_in',{title: 'Northen Lights', sr: result});
            con.end( function(err){
                if(err) throw err;
                else{
                    console.log('DB connection closed...');
                }
            });
        });
    }else if(s_type==='_nm'){
        con.query(nm_sq,['%'+search_string.trim().toLowerCase()+'%'],function(err,result){
            if(err) throw err;
            console.log(result);
            res.render('check_in',{title: 'Northen Lights', sr: result});
            con.end( function(err){
                if(err) throw err;
                else{
                    console.log('DB connection closed...');
                }
            });
        });
    }
    
});

router.get("/usr", function(req,res){
    var con = mysql.createConnection({
        user: 'root',
        password: 'root',
        database: 'templib'
    });

    var ssn = req.query.ssn;
    var fname = req.query.fname;
    var lname = req.query.lname;
    var add = req.query.add;
    var city = req.query.city;
    var state = req.query.state;
    var phone = req.query.phone;
    var iq = "insert into borrower select lpad(max(card_id)+1,6,\'0\'),?,?,?,?,?,?,? from borrower";

    if(typeof ssn !== 'undefined'){
        con.query(iq,[ssn,fname,lname,add,city,state,phone],function(err,result){
            if (err){
                if(err.code==='ER_DUP_ENTRY') res.render('usr',{title: 'Northen Lights',cn: 'SSN alredy exists...', dssn: ssn, dfname: fname, dlname: lname, dadd: add, dcity: city, dstate: state, dphone: phone });
                else throw err;
            }else{
            con.query('SELECT MAX(card_id) CID FROM borrower',function(err,result){
                    res.render('usr',{title: 'Northen Lights',cn: 'User added successfully, cardID is ', cn1: result[0]['CID']});
                    con.end( function(err){
                    if(err) throw err;
                    else{
                        console.log('DB connection closed...');
                    }
                    });
                });
            }
        });
    }else res.render('usr',{title: 'Northen Lights'});
});

router.get("/fines",function(req,res){
    var con = mysql.createConnection({
        multipleStatements: true,
        user: 'root',
        password: 'root',
        database: 'templib'
    });

     var load = 'SELECT aa.card_id CID, CONVERT(IFNULL(aa.TF,0.00),CHAR) TF, CONVERT(IFNULL(aa.PAYABLE,0.00),CHAR) PAYABLE, CONVERT(IFNULL(c.TOTAL_PAID,0.00),CHAR) T_PAID FROM ' +
            '(SELECT b.bk card_id, b.TOTAL_FINE TF, IFNULL(a.PAYABLE,0.00) PAYABLE FROM ' +
            '(SELECT l.card_id ak, SUM(f.fine_amt) PAYABLE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 AND l.date_in IS NOT NULL GROUP BY l.card_id)a ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id bk, SUM(f.fine_amt) TOTAL_FINE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 GROUP BY l.card_id)b ' +
            'ON a.ak=b.bk) aa ' +
            'LEFT JOIN ' +
            '(SELECT l.card_id ck, SUM(f.fine_amt) TOTAL_PAID FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=1 GROUP BY l.card_id)c ' +
            'ON aa.card_id=c.ck ' +
            'UNION ' + 
             'SELECT c.ck CID, CONVERT(IFNULL(aa.TF,0.00),CHAR) TF, CONVERT(IFNULL(aa.PAYABLE,0.00),CHAR) PAYABLE, CONVERT(IFNULL(c.TOTAL_PAID,0.00),CHAR) T_PAID FROM ' +
            '(SELECT b.bk card_id, b.TOTAL_FINE TF, IFNULL(a.PAYABLE,0.00) PAYABLE FROM ' +
            '(SELECT l.card_id ak, SUM(f.fine_amt) PAYABLE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 AND l.date_in IS NOT NULL GROUP BY l.card_id)a ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id bk, SUM(f.fine_amt) TOTAL_FINE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 GROUP BY l.card_id)b ' +
            'ON a.ak=b.bk) aa ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id ck, SUM(f.fine_amt) TOTAL_PAID FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=1 GROUP BY l.card_id)c ' +
            'ON aa.card_id=c.ck ' +
            'ORDER BY 1';

    var pay_q = 'UPDATE FINES SET paid=1 ' +
                'WHERE loan_id IN (' +
                'SELECT loan_id FROM BOOK_LOANS WHERE card_id= ? AND date_in IS NOT NULL)';
    var _fpay = req.query.rad_pay;
    var msg;
    
    con.query(load,function(err,result){
        if(err) throw err;
        if(typeof _fpay !== 'undefined'){
            con.query(pay_q,[_fpay],function(err,result){
                if(err) throw err;
                con.query(load,function(err,result){
                    if(err) throw err;
                    res.render('fines',{title: 'Northen Lights', json: result, ms: 'Fines paid for cardID ',ms1: _fpay});
                    con.end( function(err){
                        if(err) throw err;
                        else console.log('DB connection closed...');
                    });
                });
            });
        }
        else{
            res.render('fines',{title: 'Northen Lights', json: result});
            con.end( function(err){
                if(err) throw err;
                else{
                    console.log('DB connection closed...');
                }
            });
        }
    });
});

router.get("/refresh_fines",function(req,res){
    var con = mysql.createConnection({
        multipleStatements: true,
        user: 'root',
        password: 'root',
        database: 'templib'
    });

    var update ='UPDATE FINES f join BOOK_LOANS l ON l.loan_id=f.loan_id ' +
            'SET f.fine_amt = DATEDIFF(IFNULL(l.date_in,DATE(NOW())),l.due_date)*0.25 '+
            'WHERE f.paid=0 ';
    var insert ='INSERT INTO FINES SELECT loan_id,DATEDIFF(IFNULL(date_in,DATE(NOW())),due_date)*0.25,0 ' +
            'FROM BOOK_LOANS ' +
            'WHERE DATEDIFF(IFNULL(date_in,DATE(NOW())),due_date)>0 AND loan_id not in(SELECT loan_id FROM FINES)';
    var load = 'SELECT aa.card_id CID, CONVERT(IFNULL(aa.TF,0.00),CHAR) TF, CONVERT(IFNULL(aa.PAYABLE,0.00),CHAR) PAYABLE, CONVERT(IFNULL(c.TOTAL_PAID,0.00),CHAR) T_PAID FROM ' +
            '(SELECT b.bk card_id, b.TOTAL_FINE TF, IFNULL(a.PAYABLE,0.00) PAYABLE FROM ' +
            '(SELECT l.card_id ak, SUM(f.fine_amt) PAYABLE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 AND l.date_in IS NOT NULL GROUP BY l.card_id)a ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id bk, SUM(f.fine_amt) TOTAL_FINE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 GROUP BY l.card_id)b ' +
            'ON a.ak=b.bk) aa ' +
            'LEFT JOIN ' +
            '(SELECT l.card_id ck, SUM(f.fine_amt) TOTAL_PAID FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=1 GROUP BY l.card_id)c ' +
            'ON aa.card_id=c.ck ' +
            'UNION ' + 
             'SELECT c.ck CID, CONVERT(IFNULL(aa.TF,0.00),CHAR) TF, CONVERT(IFNULL(aa.PAYABLE,0.00),CHAR) PAYABLE, CONVERT(IFNULL(c.TOTAL_PAID,0.00),CHAR) T_PAID FROM ' +
            '(SELECT b.bk card_id, b.TOTAL_FINE TF, IFNULL(a.PAYABLE,0.00) PAYABLE FROM ' +
            '(SELECT l.card_id ak, SUM(f.fine_amt) PAYABLE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 AND l.date_in IS NOT NULL GROUP BY l.card_id)a ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id bk, SUM(f.fine_amt) TOTAL_FINE FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=0 GROUP BY l.card_id)b ' +
            'ON a.ak=b.bk) aa ' +
            'RIGHT JOIN ' +
            '(SELECT l.card_id ck, SUM(f.fine_amt) TOTAL_PAID FROM BOOK_LOANS l, FINES f WHERE l.loan_id=f.loan_id AND f.paid=1 GROUP BY l.card_id)c ' +
            'ON aa.card_id=c.ck ' +
            'ORDER BY 1';

    con.query(insert,function(err,ires){
        if(err) throw err;
        else{
            con.query(update,function(err,ures){
                if(err) throw err;
                else{
                    con.query(load,function(err,result){
                        if(err) throw err;
                        res.render('fines',{title: 'Northen Lights', json: result, ms: 'Fines tables refreshed...'});
                        con.end( function(err){
                            if(err) throw err;
                            else console.log('DB connection closed...');
                        });
                    });
                }
            });
        }
    });
});

router.post("/",function(req,res){
    console.log(req.query.bkname);
});

app.use("/",router);

app.use("*",function(req,res){
  //res.sendFile(path + "404.html");
});

app.listen(3000,function(){
    console.log('live at 3000');
});
