var express = require('express');
var url = require('url');
var check = require('validator').check;

//var app = express.createServer(express.logger());
var app = express.createServer();
//var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('view options', { layout: false });

// Simple global data store. Short URLs are simply the array index of the full URL
// for simplicity of coding. Depending on the usage it could be better to use the 
// full set of alpha numeric strings. Also could use a pseudo random generator to 
// produce effectively randomized alpha numeric short URLs that would be harder 
// for bots to mine.
var urlData = [];

// Try to validate the longurl. I don't think what constitutes a valid URL is a simple 
// question. I'll take the easy road and use node-validator, though in practice I'd 
// want to more thoroughly test it. A better approach might be to require a request 
// response from the site, though this would mean that any site that is down at the 
// time of use could not be added. I think the coding logic becomes more involved as 
// well as urlData would have to be managed via a callback function and it is not 
// clear to me how to enforce a java style synchronization.
function validateURL(longurl) { 
    // Yes, this is pretty bad form. Likely much better as middleware.
    try {
	check(longurl).isUrl();	
	return true;
    } catch (err) {
	return false;
    }
}

// Make sure any query parameters are stored in sorted order to ensure uniqueness.
function normalizeURL(longurl) {
    var urldata = url.parse(longurl);
    var normurl = urldata['protocol'] + '//'  +urldata['host'] 
    if(null!=urldata['pathname']) { 
	normurl += urldata['pathname'];
    }
    if(null!=urldata['query']) { 
	normurl += urldata['query'].split('&').sort().join('&');
    }
    return normurl;
}

// Fetch or add the shorturl.
function shortURL(longurl) {
    var normurl = normalizeURL(longurl);
    var urlIndex = urlData.indexOf(normurl);
    if(urlIndex<0) {
	return urlData.push(normurl) - 1;
    } else {
	return urlIndex;
    }
}

// Main landing page. All other routes expect to redirect from a shorturl.
app.get('/', function(req, res) {
    var longurl = url.parse(req.url, true).query['longurl'];
    var shorturl = '';
    var msg = '';
    if(null!=longurl && ''!=longurl) {
	// If no leading protocol we'll add http://
	if(null==url.parse(longurl)['protocol']) {
	    longurl = 'http://' + longurl;
	}
	if(validateURL(longurl)) {
	    shorturl = shortURL(longurl) + '';
	} else {
	    msg = 'Invalid long URL: ' + longurl;
	}
    }
    res.render('input', {msg: msg, longurl: longurl, host: 'http://'+req.headers.host, shorturl: shorturl});
});

// All non '/' routes try to look up the longurl and redirect. Unfound values will 
// render the main landing with an error message.
app.get('/?*', function(req, res) {
    var shorturl = req.url.slice(1);
    var longurl = urlData[shorturl];
    if(longurl!=null) {
	res.redirect(longurl);
    } else {
	res.render('input', {msg: 'Unknown short URL: ' + 'http://'+req.headers.host + '/' + shorturl, longurl: '', shorturl: ''});
    }
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log('Listening on ' + port);
});
