var express = require('express'),
	request = require('request'),
	gm = require('gm'),
	imageMagick = gm.subClass({
		imageMagick: true
	}),
	http = require('http'),
	fs = require('fs');

var app = express();

app.get('/404', function (req, res) {
	throw new Error('Page not found');
});

app.get('/500', function (req, res) {
	throw new Error('Server error');
});

const PORT = process.env.PORT || 5000
app.listen(PORT);

app.get('/', function (req, res) {
	if (!req.param("url") || !req.param("callback")) 
	{
		res.send("No URL or no callback was specified. These are required", 400);
		return;
	}

	var url = unescape(req.param("url")),
		callback = req.param("callback");
	let reqData = { uri: url, encoding: null };
	request( reqData, function (error, response, body) {
		if (error || !response || response.statusCode != 200)
		{
			res.send("Third-party server error", response.statusCode);
			return;
		}

		var mimetype = response.headers["content-type"];
		if (
			!mimetype ||
			(
				mimetype != "image/jpeg" && mimetype != "image/jpg" && mimetype != "image/png" && 
				mimetype != "image/gif" && mimetype != "image/tiff"
			)
		) {
			res.send("This file type is not supported", 400);
			return;
		}

		// Create the prefix for the data URL
		var type_prefix = "data:" + mimetype + ";base64,",
			image_64 = body.toString('base64'),
			buffer = new Buffer(image_64, 'base64'),
			width = 0, height = 0,
			filename = "/tmp/" + url.substring(url.lastIndexOf('/') + 1).slice(0, 100);

		fs.writeFile(filename, buffer, function (err) { }); // Save the file

		// Get the image dimensions using GraphicsMagick
		imageMagick(filename).size(function (err, size) {
			try
			{
				// XXX Look into this
				fs.unlink(filename); // Delete the tmp image
			} catch (e)
			{
				console.log(e);
			}

			if (err)
			{
				res.send("Error getting image dimensions", 400);
				return;
			} 
			let width = size.width,
				height = size.height;
			let return_variable = {
				"width": width,
				"height": height,
				"data": type_prefix + image_64
			};
			return_variable = JSON.stringify(return_variable);
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=UTF-8'
			});
			res.end(return_variable);
		});
	});
});