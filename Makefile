all:
	nountangle content/client.noweb.md >content/client.js
	gfm <content/client.noweb.md >content/client.html
