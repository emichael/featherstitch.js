.PHONY: clean serve
.FORCE:

node_modules/:
	npm install

serve: node_modules/
	npm run-script server

clean:
	rm -rfv dist/ featherstitchjs.tar.gz node_modules/
